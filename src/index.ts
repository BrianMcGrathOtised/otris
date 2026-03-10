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
import { insertGarbageRows, BOARD_WIDTH } from './game/board';
import type { ServerEvent } from './shared/protocol';

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
let garbageQueue: Array<{ lines: number }> = [];
let isEliminated = false;
let matchResult: { type: 'eliminated'; placement: number; total: number } | { type: 'winner' } | null = null;
let previousLinesCleared = 0;

// ---------------------------------------------------------------------------
// Overlay UI helpers
// ---------------------------------------------------------------------------

function removeOverlays(): void {
  const overlay = document.getElementById('game-overlay');
  if (overlay) overlay.remove();
  const btn = document.getElementById('back-to-lobby-btn');
  if (btn) btn.remove();
}

function showGameOverlay(title: string, subtitle: string, showButton: boolean): void {
  if (document.getElementById('game-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'game-overlay';
  overlay.className = 'game-overlay';
  overlay.innerHTML = `
    <div class="game-overlay-content">
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
  `;
  document.body.appendChild(overlay);

  if (showButton) {
    const btn = document.createElement('button');
    btn.id = 'back-to-lobby-btn';
    btn.className = 'lobby-btn lobby-btn-accent back-to-lobby';
    btn.textContent = 'Back to Lobby';
    btn.addEventListener('click', () => {
      removeOverlays();
      stopGame();
      showLobbyUI();
    });
    overlay.querySelector('.game-overlay-content')!.appendChild(btn);
  }
}

function showCountdown(remaining: number): void {
  let el = document.getElementById('countdown-display');
  if (!el) {
    el = document.createElement('div');
    el.id = 'countdown-display';
    el.className = 'countdown-display';
    document.body.appendChild(el);
  }
  el.textContent = remaining > 0 ? String(remaining) : 'GO!';
  if (remaining <= 0) {
    setTimeout(() => el?.remove(), 800);
  }
}

// ---------------------------------------------------------------------------
// Animation frame loop
// ---------------------------------------------------------------------------

let lastTime = 0;

function gameLoop(timestamp: number): void {
  const delta = lastTime === 0 ? 0 : timestamp - lastTime;
  lastTime = timestamp;

  const cappedDelta = Math.min(delta, 100);

  if (!isEliminated) {
    const prevState = state;
    state = tick(state, cappedDelta);

    // Check for new line clears and send to server
    if (state.lines > previousLinesCleared) {
      const newLines = state.lines - previousLinesCleared;
      previousLinesCleared = state.lines;
      conn.send({ type: 'lines_cleared', count: newLines });
    }

    // Process garbage queue when a piece locks (detected by piece type change or new spawn)
    if (
      garbageQueue.length > 0 &&
      prevState.currentPiece.type !== state.currentPiece.type &&
      state.currentPiece.y === 0
    ) {
      for (const g of garbageQueue) {
        const gapColumn = Math.floor(Math.random() * BOARD_WIDTH);
        state = { ...state, board: insertGarbageRows(state.board, g.lines, gapColumn) };
      }
      garbageQueue = [];
    }

    // Detect game over and notify server
    if (state.gameOver && !isEliminated) {
      isEliminated = true;
      conn.send({ type: 'player_dead' });
    }
  }

  render(ctx, state);

  // Show overlay based on match result
  if (matchResult && !document.getElementById('game-overlay')) {
    if (matchResult.type === 'eliminated') {
      showGameOverlay(
        'Eliminated!',
        `You placed ${matchResult.placement} of ${matchResult.total}`,
        false,
      );
    } else {
      showGameOverlay('You Win!', 'Congratulations!', true);
    }
  }

  animFrameId = requestAnimationFrame(gameLoop);
}

function startGame(): void {
  canvas.style.display = 'block';
  state = createGame();
  lastTime = 0;
  garbageQueue = [];
  isEliminated = false;
  matchResult = null;
  previousLinesCleared = 0;
  removeOverlays();
  animFrameId = requestAnimationFrame(gameLoop);
}

function stopGame(): void {
  canvas.style.display = 'none';
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = 0;
  }
  removeOverlays();
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

// Track total players in the game for placement display
let totalPlayersInGame = 0;

// Handle multiplayer game events from server
conn.onEvent((event: ServerEvent) => {
  switch (event.type) {
    case 'countdown_tick':
      showCountdown(event.remaining);
      break;

    case 'game_started':
      // Countdown finished, remove countdown display
      showCountdown(0);
      break;

    case 'garbage_received':
      garbageQueue.push({ lines: event.lines });
      break;

    case 'player_eliminated':
      totalPlayersInGame = event.alivePlayers.length + (event.alivePlayers.length + 1);
      break;

    case 'match_end':
      if (isEliminated) {
        // Already eliminated — show "Back to Lobby" on our existing overlay
        showGameOverlay(
          'Match Over',
          `Winner: ${event.winnerName}`,
          true,
        );
      } else {
        // We won!
        matchResult = { type: 'winner' };
      }
      // Auto-return to lobby after 8 seconds
      setTimeout(() => {
        removeOverlays();
        stopGame();
        showLobbyUI();
      }, 8000);
      break;

    case 'lobby_update':
      // Track player count for placement display
      totalPlayersInGame = event.lobby.players.length;
      break;
  }
});

initLobbyUI({
  connection: conn,
  onGameStart: startGame,
});
