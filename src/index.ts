/**
 * Otris -- main entry point.
 *
 * On page load, connects to the server and shows the lobby UI.
 * When the host starts the game, the lobby hides and the game canvas
 * takes over with the standard requestAnimationFrame loop.
 */

import { createGame, tick } from './game/game';
import type { GameState } from './game/game';
import { render } from './renderer/render';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer/layout';
import { initKeyboard } from './input/keyboard';
import { connect, DEFAULT_WS_URL } from './client/connection';
import { initLobbyUI, showLobbyUI } from './client/lobby-ui';

// ---------------------------------------------------------------------------
// Canvas setup (hidden until game starts)
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.style.display = 'none';

const ctx = canvas.getContext('2d')!;

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

let state: GameState = createGame();
let animFrameId = 0;

// ---------------------------------------------------------------------------
// Animation frame loop
// ---------------------------------------------------------------------------

let lastTime = 0;

function gameLoop(timestamp: number): void {
  const delta = lastTime === 0 ? 0 : timestamp - lastTime;
  lastTime = timestamp;

  const cappedDelta = Math.min(delta, 100);

  state = tick(state, cappedDelta);
  render(ctx, state);

  // When game is over, show a "Back to Lobby" overlay
  if (state.gameOver && !document.getElementById('back-to-lobby-btn')) {
    const btn = document.createElement('button');
    btn.id = 'back-to-lobby-btn';
    btn.className = 'lobby-btn lobby-btn-accent back-to-lobby';
    btn.textContent = 'Back to Lobby';
    btn.addEventListener('click', () => {
      btn.remove();
      stopGame();
      showLobbyUI();
    });
    document.body.appendChild(btn);
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

function startGame(): void {
  canvas.style.display = 'block';
  state = createGame();
  lastTime = 0;
  animFrameId = requestAnimationFrame(gameLoop);
}

function stopGame(): void {
  canvas.style.display = 'none';
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = 0;
  }
}

// ---------------------------------------------------------------------------
// Exports for input module
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

// ---------------------------------------------------------------------------
// Connect to server and show lobby
// ---------------------------------------------------------------------------

const conn = connect(DEFAULT_WS_URL);

initLobbyUI({
  connection: conn,
  onGameStart: startGame,
});
