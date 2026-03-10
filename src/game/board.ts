export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = BOARD_HEIGHT + HIDDEN_ROWS;

export type Cell = number; // 0 = empty, 1-7 = piece type
export type Board = Cell[][];

export function createBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () => Array(BOARD_WIDTH).fill(0) as Cell[]);
}

/**
 * Deep-clone a board so mutations don't affect the original.
 */
function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

/**
 * Check whether a piece shape at (x, y) is a valid position on the board.
 * x is the left column of the shape matrix, y is the top row.
 * Returns false if any filled cell is out of bounds or overlaps an occupied cell.
 */
export function isValidPosition(
  board: Board,
  shape: number[][],
  x: number,
  y: number,
): boolean {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row]!.length; col++) {
      if (shape[row]![col] === 0) continue;

      const boardX = x + col;
      const boardY = y + row;

      // Out of bounds check
      if (boardX < 0 || boardX >= BOARD_WIDTH) return false;
      if (boardY < 0 || boardY >= TOTAL_ROWS) return false;

      // Overlap check
      if (board[boardY]![boardX] !== 0) return false;
    }
  }
  return true;
}

/**
 * Lock a piece onto the board, returning a new board (immutable).
 * pieceId is the color/type value (1-7) written into each cell.
 */
export function lockPiece(
  board: Board,
  shape: number[][],
  x: number,
  y: number,
  pieceId: number,
): Board {
  const newBoard = cloneBoard(board);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row]!.length; col++) {
      if (shape[row]![col] === 0) continue;
      const boardX = x + col;
      const boardY = y + row;
      if (boardY >= 0 && boardY < TOTAL_ROWS && boardX >= 0 && boardX < BOARD_WIDTH) {
        newBoard[boardY]![boardX] = pieceId;
      }
    }
  }
  return newBoard;
}

/**
 * Detect and clear full rows. Returns the new board and the number of lines cleared.
 * Full rows are removed and empty rows are added at the top (immutable).
 */
export function clearLines(board: Board): { board: Board; linesCleared: number } {
  const surviving = board.filter(
    (row) => !row.every((cell) => cell !== 0),
  );
  const linesCleared = TOTAL_ROWS - surviving.length;
  if (linesCleared === 0) {
    return { board: cloneBoard(board), linesCleared: 0 };
  }
  // Add empty rows at the top to restore full height
  const emptyRows: Board = Array.from(
    { length: linesCleared },
    () => Array(BOARD_WIDTH).fill(0) as Cell[],
  );
  return {
    board: [...emptyRows, ...surviving.map((row) => [...row])],
    linesCleared,
  };
}

export const GARBAGE_CELL = 8;

/**
 * Insert garbage rows at the bottom of the board. Existing rows shift up.
 * Each garbage row is filled with GARBAGE_CELL except for one gap column.
 * Returns a new board (immutable).
 */
export function insertGarbageRows(board: Board, count: number, gapColumn: number): Board {
  if (count <= 0) return cloneBoard(board);

  const garbageRow = (): Cell[] => {
    const row = Array(BOARD_WIDTH).fill(GARBAGE_CELL) as Cell[];
    row[gapColumn] = 0;
    return row;
  };

  const garbageRows = Array.from({ length: count }, garbageRow);
  // Remove top rows to maintain height, append garbage at bottom
  const shifted = board.slice(count).map(row => [...row]);
  return [...shifted, ...garbageRows];
}

/**
 * Check if the game is over: the given piece cannot be placed at the spawn position.
 */
export function isGameOver(
  board: Board,
  shape: number[][],
  spawnX: number,
  spawnY: number,
): boolean {
  return !isValidPosition(board, shape, spawnX, spawnY);
}
