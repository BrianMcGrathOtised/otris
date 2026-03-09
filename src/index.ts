/**
 * Otris — main entry point.
 *
 * Sets up the canvas, creates the initial game state, and starts the
 * requestAnimationFrame render/tick loop.
 */

import { createGame, tick } from './game/game';
import type { GameState } from './game/game';
import { render } from './renderer/render';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer/layout';
import { initKeyboard } from './input/keyboard';

// ---------------------------------------------------------------------------
// Canvas setup
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const ctx = canvas.getContext('2d')!;

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

let state: GameState = createGame();

// ---------------------------------------------------------------------------
// Animation frame loop
// ---------------------------------------------------------------------------

let lastTime = 0;

function gameLoop(timestamp: number): void {
  const delta = lastTime === 0 ? 0 : timestamp - lastTime;
  lastTime = timestamp;

  // Cap delta to avoid huge jumps (e.g. when tab is backgrounded)
  const cappedDelta = Math.min(delta, 100);

  state = tick(state, cappedDelta);
  render(ctx, state);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// ---------------------------------------------------------------------------
// Exports for input module to access
// ---------------------------------------------------------------------------

export function getState(): GameState {
  return state;
}

export function setState(newState: GameState): void {
  state = newState;
}

// ---------------------------------------------------------------------------
// Initialize keyboard input
// ---------------------------------------------------------------------------

initKeyboard({ getState, setState });
