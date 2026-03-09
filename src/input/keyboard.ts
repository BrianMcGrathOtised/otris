/**
 * Keyboard input handler for Otris.
 *
 * Listens for keydown/keyup events and translates them into game actions.
 * Uses DAS (Delayed Auto Shift) for left/right movement.
 *
 * Key mappings (per GDD):
 *   Left/Right arrows  — move
 *   Down arrow          — soft drop
 *   Space               — hard drop
 *   Up arrow            — rotate CW
 *   Z                   — rotate CCW
 *   Shift / C           — hold piece
 *   R / Enter           — restart (game over only)
 */

import {
  createDAS,
  dasPress,
  dasRelease,
  dasUpdate,
  type DASState,
} from './das';
import {
  moveLeft,
  moveRight,
  rotateCW,
  rotateCCW,
  softDropStart,
  softDropEnd,
  hardDrop,
  holdPiece,
  createGame,
} from '../game/game';
import type { GameState } from '../game/game';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callbacks provided by the host (index.ts) to read/write game state. */
export interface KeyboardHost {
  getState: () => GameState;
  setState: (s: GameState) => void;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let host: KeyboardHost | null = null;
let dasLeft: DASState = createDAS();
let dasRight: DASState = createDAS();
let animFrameId: number | null = null;
let lastTimestamp = 0;

// ---------------------------------------------------------------------------
// DAS update loop
// ---------------------------------------------------------------------------

function dasLoop(timestamp: number): void {
  if (!host) return;

  const delta = lastTimestamp === 0 ? 0 : timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  const cappedDelta = Math.min(delta, 100);

  let state = host.getState();

  // Update left DAS
  const leftResult = dasUpdate(dasLeft, cappedDelta);
  dasLeft = leftResult.das;
  for (let i = 0; i < leftResult.fires; i++) {
    state = moveLeft(state);
  }

  // Update right DAS
  const rightResult = dasUpdate(dasRight, cappedDelta);
  dasRight = rightResult.das;
  for (let i = 0; i < rightResult.fires; i++) {
    state = moveRight(state);
  }

  host.setState(state);
  animFrameId = requestAnimationFrame(dasLoop);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onKeyDown(e: KeyboardEvent): void {
  if (!host) return;

  // Prevent default for game keys to avoid page scrolling
  const gameKeys = [
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    ' ', 'Shift', 'c', 'C', 'z', 'Z',
  ];
  if (gameKeys.includes(e.key)) {
    e.preventDefault();
  }

  let state = host.getState();

  // Restart handling (only when game over)
  if (state.gameOver && (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) {
    host.setState(createGame());
    return;
  }

  if (state.gameOver) return;

  switch (e.key) {
    case 'ArrowLeft': {
      const result = dasPress(dasLeft);
      dasLeft = result.das;
      if (result.fire) {
        host.setState(moveLeft(state));
      }
      break;
    }
    case 'ArrowRight': {
      const result = dasPress(dasRight);
      dasRight = result.das;
      if (result.fire) {
        host.setState(moveRight(state));
      }
      break;
    }
    case 'ArrowDown':
      if (!e.repeat) {
        host.setState(softDropStart(state));
      }
      break;
    case 'ArrowUp':
      if (!e.repeat) {
        host.setState(rotateCW(state));
      }
      break;
    case 'z':
    case 'Z':
      if (!e.repeat) {
        host.setState(rotateCCW(state));
      }
      break;
    case ' ':
      if (!e.repeat) {
        host.setState(hardDrop(state));
      }
      break;
    case 'Shift':
    case 'c':
    case 'C':
      if (!e.repeat) {
        host.setState(holdPiece(state));
      }
      break;
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (!host) return;

  switch (e.key) {
    case 'ArrowLeft':
      dasLeft = dasRelease(dasLeft);
      break;
    case 'ArrowRight':
      dasRight = dasRelease(dasRight);
      break;
    case 'ArrowDown':
      host.setState(softDropEnd(host.getState()));
      break;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize keyboard input handling. Call once during app startup.
 * The host object provides getState/setState for the input module
 * to read and write game state.
 */
export function initKeyboard(hostCallbacks: KeyboardHost): void {
  host = hostCallbacks;

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Start the DAS update loop
  lastTimestamp = 0;
  animFrameId = requestAnimationFrame(dasLoop);
}

/**
 * Tear down keyboard listeners and stop the DAS loop.
 * Useful for cleanup or testing.
 */
export function destroyKeyboard(): void {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);

  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  host = null;
  dasLeft = createDAS();
  dasRight = createDAS();
  lastTimestamp = 0;
}
