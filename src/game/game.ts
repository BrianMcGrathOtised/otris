import {
  createBoard,
  isValidPosition,
  lockPiece,
  clearLines,
  isGameOver,
  BOARD_WIDTH,
  type Board,
} from './board';
import {
  getShape,
  createBag,
  TETROMINOES,
  type PieceType,
  type Shape,
  SRS_WALL_KICKS,
  SRS_WALL_KICKS_I,
} from './tetrominoes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LOCK_DELAY_MS = 500;
export const SOFT_DROP_INTERVAL = 50; // ms per row during soft drop
const HARD_DROP_SCORE_PER_ROW = 2;
const SOFT_DROP_SCORE_PER_ROW = 1;

// Scoring table (Original BPS scoring adapted)
const LINE_CLEAR_SCORES: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivePiece {
  type: PieceType;
  rotation: number; // 0-3
  x: number;
  y: number;
}

export interface GameState {
  board: Board;
  currentPiece: ActivePiece;
  nextPiece: PieceType;
  holdPiece: PieceType | null;
  holdUsed: boolean;
  bag: PieceType[];
  score: number;
  lines: number;
  level: number;
  gravityTimer: number; // ms accumulated since last gravity drop
  lockTimer: number; // ms accumulated in lock delay
  locking: boolean; // true when piece is on a surface
  softDropping: boolean;
  gameOver: boolean;
}

// ---------------------------------------------------------------------------
// Gravity speed curve
// ---------------------------------------------------------------------------

/**
 * Returns the gravity interval in ms for a given level.
 * Uses a curve that starts at 1000ms (level 1) and decreases,
 * with a minimum floor of 50ms.
 */
export function getGravityInterval(level: number): number {
  // Classic NES-inspired curve: interval = 1000 * (0.8 - (level-1) * 0.007) ^ (level-1)
  // Simplified: base * multiplier^(level-1)
  const interval = Math.floor(1000 * Math.pow(0.85, level - 1));
  return Math.max(interval, 50);
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

function spawnPosition(type: PieceType): { x: number; y: number } {
  const shape = getShape(type, 0);
  const width = shape[0]!.length;
  const x = Math.floor((BOARD_WIDTH - width) / 2);
  return { x, y: 0 };
}

function pullFromBag(bag: PieceType[]): { piece: PieceType; bag: PieceType[] } {
  const newBag = [...bag];
  if (newBag.length === 0) {
    newBag.push(...createBag());
  }
  const piece = newBag.shift()!;
  return { piece, bag: newBag };
}

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------

export function createGame(initialBag?: PieceType[]): GameState {
  let bag = initialBag ? [...initialBag] : createBag();

  const { piece: currentType, bag: bag2 } = pullFromBag(bag);
  const { piece: nextType, bag: bag3 } = pullFromBag(bag2);
  bag = bag3;

  const pos = spawnPosition(currentType);

  return {
    board: createBoard(),
    currentPiece: {
      type: currentType,
      rotation: 0,
      x: pos.x,
      y: pos.y,
    },
    nextPiece: nextType,
    holdPiece: null,
    holdUsed: false,
    bag,
    score: 0,
    lines: 0,
    level: 1,
    gravityTimer: 0,
    lockTimer: 0,
    locking: false,
    softDropping: false,
    gameOver: false,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getCurrentShape(state: GameState): Shape {
  return getShape(state.currentPiece.type, state.currentPiece.rotation);
}

function canMoveDown(state: GameState): boolean {
  const shape = getCurrentShape(state);
  return isValidPosition(state.board, shape, state.currentPiece.x, state.currentPiece.y + 1);
}

function spawnNextPiece(state: GameState): GameState {
  const nextType = state.nextPiece;
  const { piece: newNext, bag } = pullFromBag(state.bag);
  const pos = spawnPosition(nextType);
  const shape = getShape(nextType, 0);

  if (isGameOver(state.board, shape, pos.x, pos.y)) {
    return { ...state, gameOver: true };
  }

  return {
    ...state,
    currentPiece: {
      type: nextType,
      rotation: 0,
      x: pos.x,
      y: pos.y,
    },
    nextPiece: newNext,
    bag,
    holdUsed: false,
    gravityTimer: 0,
    lockTimer: 0,
    locking: false,
  };
}

function lockAndAdvance(state: GameState): GameState {
  const shape = getCurrentShape(state);
  const colorId = TETROMINOES[state.currentPiece.type].colorId;
  const boardAfterLock = lockPiece(
    state.board,
    shape,
    state.currentPiece.x,
    state.currentPiece.y,
    colorId,
  );

  const { board: boardAfterClear, linesCleared } = clearLines(boardAfterLock);

  const newLines = state.lines + linesCleared;
  const newLevel = Math.floor(newLines / 10) + 1;
  const lineScore = (LINE_CLEAR_SCORES[linesCleared] ?? 0) * state.level;

  const updatedState: GameState = {
    ...state,
    board: boardAfterClear,
    score: state.score + lineScore,
    lines: newLines,
    level: newLevel,
    lockTimer: 0,
    locking: false,
  };

  return spawnNextPiece(updatedState);
}

function computeLevel(lines: number): number {
  return Math.floor(lines / 10) + 1;
}

// ---------------------------------------------------------------------------
// Tick (externally driven game loop)
// ---------------------------------------------------------------------------

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.gameOver) return state;

  // Update level from lines
  let current: GameState = { ...state, level: computeLevel(state.lines) };

  // If currently in lock delay
  if (current.locking) {
    const newLockTimer = current.lockTimer + deltaMs;
    if (newLockTimer >= LOCK_DELAY_MS) {
      return lockAndAdvance(current);
    }
    return { ...current, lockTimer: newLockTimer };
  }

  // Gravity
  const interval = current.softDropping
    ? SOFT_DROP_INTERVAL
    : getGravityInterval(current.level);

  let gravityTimer = current.gravityTimer + deltaMs;
  let piece = { ...current.currentPiece };
  let softDropScore = 0;

  while (gravityTimer >= interval) {
    gravityTimer -= interval;
    const shape = getShape(piece.type, piece.rotation);
    if (isValidPosition(current.board, shape, piece.x, piece.y + 1)) {
      piece = { ...piece, y: piece.y + 1 };
      if (current.softDropping) {
        softDropScore += SOFT_DROP_SCORE_PER_ROW;
      }
    } else {
      // Cannot move down, enter lock state
      return {
        ...current,
        currentPiece: piece,
        gravityTimer: 0,
        lockTimer: 0,
        locking: true,
        score: current.score + softDropScore,
      };
    }
  }

  return {
    ...current,
    currentPiece: piece,
    gravityTimer,
    score: current.score + softDropScore,
  };
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export function moveLeft(state: GameState): GameState {
  if (state.gameOver) return state;
  const shape = getCurrentShape(state);
  const newX = state.currentPiece.x - 1;
  if (isValidPosition(state.board, shape, newX, state.currentPiece.y)) {
    const moved: GameState = {
      ...state,
      currentPiece: { ...state.currentPiece, x: newX },
      lockTimer: 0,
    };
    // If we were locking but can now move down, cancel lock
    if (moved.locking && canMoveDown(moved)) {
      return { ...moved, locking: false };
    }
    return moved;
  }
  return state;
}

export function moveRight(state: GameState): GameState {
  if (state.gameOver) return state;
  const shape = getCurrentShape(state);
  const newX = state.currentPiece.x + 1;
  if (isValidPosition(state.board, shape, newX, state.currentPiece.y)) {
    const moved: GameState = {
      ...state,
      currentPiece: { ...state.currentPiece, x: newX },
      lockTimer: 0,
    };
    if (moved.locking && canMoveDown(moved)) {
      return { ...moved, locking: false };
    }
    return moved;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Rotation (SRS wall kicks)
// ---------------------------------------------------------------------------

function tryRotation(state: GameState, newRotation: number): GameState {
  if (state.gameOver) return state;

  const piece = state.currentPiece;
  const fromRot = piece.rotation;
  const toRot = ((newRotation % 4) + 4) % 4;
  const newShape = getShape(piece.type, toRot);

  // Try base position first
  if (isValidPosition(state.board, newShape, piece.x, piece.y)) {
    const rotated: GameState = {
      ...state,
      currentPiece: { ...piece, rotation: toRot },
      lockTimer: 0,
    };
    if (rotated.locking && canMoveDown(rotated)) {
      return { ...rotated, locking: false };
    }
    return rotated;
  }

  // Try wall kicks
  const kickTable = piece.type === 'I' ? SRS_WALL_KICKS_I : SRS_WALL_KICKS;
  const key = `${fromRot}>${toRot}`;
  const kicks = kickTable[key];

  if (kicks) {
    for (const [dx, dy] of kicks) {
      const newX = piece.x + dx;
      const newY = piece.y + dy;
      if (isValidPosition(state.board, newShape, newX, newY)) {
        const kicked: GameState = {
          ...state,
          currentPiece: { ...piece, rotation: toRot, x: newX, y: newY },
          lockTimer: 0,
        };
        if (kicked.locking && canMoveDown(kicked)) {
          return { ...kicked, locking: false };
        }
        return kicked;
      }
    }
  }

  // No valid position found; rotation fails
  return state;
}

export function rotateCW(state: GameState): GameState {
  return tryRotation(state, state.currentPiece.rotation + 1);
}

export function rotateCCW(state: GameState): GameState {
  return tryRotation(state, state.currentPiece.rotation - 1);
}

// ---------------------------------------------------------------------------
// Soft drop
// ---------------------------------------------------------------------------

export function softDropStart(state: GameState): GameState {
  if (state.gameOver) return state;
  return { ...state, softDropping: true, gravityTimer: 0 };
}

export function softDropEnd(state: GameState): GameState {
  return { ...state, softDropping: false, gravityTimer: 0 };
}

// ---------------------------------------------------------------------------
// Hard drop
// ---------------------------------------------------------------------------

export function hardDrop(state: GameState): GameState {
  if (state.gameOver) return state;

  const shape = getCurrentShape(state);
  let dropY = state.currentPiece.y;

  while (isValidPosition(state.board, shape, state.currentPiece.x, dropY + 1)) {
    dropY++;
  }

  const distance = dropY - state.currentPiece.y;
  const dropScore = distance * HARD_DROP_SCORE_PER_ROW;

  const landed: GameState = {
    ...state,
    currentPiece: { ...state.currentPiece, y: dropY },
    score: state.score + dropScore,
  };

  return lockAndAdvance(landed);
}

// ---------------------------------------------------------------------------
// Hold piece
// ---------------------------------------------------------------------------

export function holdPiece(state: GameState): GameState {
  if (state.gameOver) return state;
  if (state.holdUsed) return state;

  const currentType = state.currentPiece.type;

  if (state.holdPiece === null) {
    // No held piece: store current, spawn next
    const newState: GameState = {
      ...state,
      holdPiece: currentType,
      holdUsed: true,
    };
    const spawned = spawnNextPiece(newState);
    // Preserve holdUsed=true (spawnNextPiece resets it for normal piece spawns)
    return { ...spawned, holdUsed: true };
  } else {
    // Swap with held piece
    const heldType = state.holdPiece;
    const pos = spawnPosition(heldType);
    return {
      ...state,
      currentPiece: {
        type: heldType,
        rotation: 0,
        x: pos.x,
        y: pos.y,
      },
      holdPiece: currentType,
      holdUsed: true,
      gravityTimer: 0,
      lockTimer: 0,
      locking: false,
    };
  }
}
