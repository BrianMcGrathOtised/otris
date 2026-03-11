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
import {
  createOpponentMap,
  updateOpponentBoard,
  eliminateOpponent,
  clearOpponents,
  getOpponents,
  type OpponentMap,
  type OpponentState,
} from './client/opponent-state';

// ---------------------------------------------------------------------------
// Canvas setup (hidden until game starts)
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.style.display = 'none';

const ctx = canvas.getContext('2d')!;

// ---------------------------------------------------------------------------
// Responsive canvas scaling
// ---------------------------------------------------------------------------

function scaleCanvas(): void {
  const padding = 16; // small margin around edges
  const vw = window.innerWidth - padding * 2;
  const vh = window.innerHeight - padding * 2;

  const scaleX = vw / CANVAS_WIDTH;
  const scaleY = vh / CANVAS_HEIGHT;
  const scale = Math.min(scaleX, scaleY, 1); // never upscale beyond 1

  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = 'top left';

  // Center the canvas accounting for scaled size
  const scaledW = CANVAS_WIDTH * scale;
  const scaledH = CANVAS_HEIGHT * scale;
  canvas.style.marginLeft = `${(window.innerWidth - scaledW) / 2}px`;
  canvas.style.marginTop = `${(window.innerHeight - scaledH) / 2}px`;
}

window.addEventListener('resize', scaleCanvas);

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

let state: GameState = createGame();
let animFrameId = 0;
let garbageQueue: Array<{ lines: number }> = [];
let garbageFlashAlpha = 0;
let eliminationFlashAlpha = 0;
let isEliminated = false;
let waitingForStart = false;
let matchResult: { type: 'eliminated'; placement: number; total: number } | { type: 'winner' } | null = null;
let previousLinesCleared = 0;
let lastProcessedBoard: number[][] | null = null;
let opponents: OpponentMap = createOpponentMap();

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
let backgroundTickId: ReturnType<typeof setInterval> | null = null;
let lastBackgroundTime = 0;
const BACKGROUND_TICK_MS = 50;
const MAX_TICK_STEP = 100; // same cap as RAF loop

/** Advance game logic by deltaMs (shared by RAF loop and background fallback). */
function advanceGame(deltaMs: number): void {
  if (isEliminated || waitingForStart) return;

  state = tick(state, deltaMs);

  // Check for new line clears and send to server
  if (state.lines > previousLinesCleared) {
    const newLines = state.lines - previousLinesCleared;
    previousLinesCleared = state.lines;
    conn.send({ type: 'lines_cleared', count: newLines });
  }

  // Detect board change (piece locked via gravity OR hard drop from keyboard).
  // Comparing references works because board arrays are immutable — a new
  // reference means a piece was locked, lines were cleared, or garbage arrived.
  if (state.board !== lastProcessedBoard) {
    // Process pending garbage on piece lock
    if (garbageQueue.length > 0) {
      for (const g of garbageQueue) {
        const gapColumn = Math.floor(Math.random() * BOARD_WIDTH);
        state = { ...state, board: insertGarbageRows(state.board, g.lines, gapColumn) };
      }
      garbageQueue = [];
    }

    // Send board snapshot to opponents
    conn.send({ type: 'board_update', board: state.board });
    lastProcessedBoard = state.board;
  }

  // Detect game over and notify server
  if (state.gameOver && !isEliminated) {
    isEliminated = true;
    eliminationFlashAlpha = 1; // trigger red flash animation
    conn.send({ type: 'player_dead' });
  }
}

function gameLoop(timestamp: number): void {
  const delta = lastTime === 0 ? 0 : timestamp - lastTime;
  lastTime = timestamp;

  const cappedDelta = Math.min(delta, 100);
  advanceGame(cappedDelta);

  // Decay garbage flash alpha (~0.5s fade at 60fps)
  if (garbageFlashAlpha > 0) {
    garbageFlashAlpha = Math.max(0, garbageFlashAlpha - cappedDelta / 500);
  }

  // Decay elimination flash alpha (~300ms fade)
  if (eliminationFlashAlpha > 0) {
    eliminationFlashAlpha = Math.max(0, eliminationFlashAlpha - cappedDelta / 300);
  }

  // Calculate total pending garbage lines
  const totalGarbageLines = garbageQueue.reduce((sum, g) => sum + g.lines, 0);

  render(ctx, state, getOpponents(opponents), totalGarbageLines, garbageFlashAlpha, eliminationFlashAlpha);

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

// Background tab fallback: keep game ticking via setInterval when RAF is paused
document.addEventListener('visibilitychange', () => {
  if (!animFrameId && backgroundTickId === null) return; // game not running

  if (document.hidden) {
    // Tab hidden — start interval-based ticking (no rendering)
    cancelAnimationFrame(animFrameId);
    animFrameId = 0;
    lastBackgroundTime = Date.now();
    backgroundTickId = setInterval(() => {
      // Browsers throttle background intervals to ~1000ms.
      // Calculate real elapsed time and catch up in capped steps.
      const now = Date.now();
      let elapsed = now - lastBackgroundTime;
      lastBackgroundTime = now;
      while (elapsed > 0) {
        const step = Math.min(elapsed, MAX_TICK_STEP);
        advanceGame(step);
        elapsed -= step;
      }
    }, BACKGROUND_TICK_MS);
  } else {
    // Tab visible — stop interval, resume RAF
    if (backgroundTickId !== null) {
      clearInterval(backgroundTickId);
      backgroundTickId = null;
    }
    lastTime = 0; // reset to avoid delta spike on first frame
    animFrameId = requestAnimationFrame(gameLoop);
  }
});

function startGame(): void {
  canvas.style.display = 'block';
  scaleCanvas();
  state = createGame();
  lastTime = 0;
  garbageQueue = [];
  garbageFlashAlpha = 0;
  eliminationFlashAlpha = 0;
  isEliminated = false;
  waitingForStart = true;
  matchResult = null;
  previousLinesCleared = 0;
  lastProcessedBoard = state.board;
  opponents = clearOpponents();
  removeOverlays();
  animFrameId = requestAnimationFrame(gameLoop);
}

function stopGame(): void {
  canvas.style.display = 'none';
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = 0;
  }
  if (backgroundTickId !== null) {
    clearInterval(backgroundTickId);
    backgroundTickId = null;
  }
  opponents = clearOpponents();
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

export function getOpponentStates(): readonly OpponentState[] {
  return getOpponents(opponents);
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
      // Countdown finished — allow game logic to run
      waitingForStart = false;
      showCountdown(0);
      break;

    case 'garbage_received':
      garbageQueue.push({ lines: event.lines });
      garbageFlashAlpha = 1; // trigger red flash
      break;

    case 'player_eliminated':
      totalPlayersInGame = event.alivePlayers.length + (event.alivePlayers.length + 1);
      opponents = eliminateOpponent(opponents, event.playerId);
      break;

    case 'opponent_board':
      opponents = updateOpponentBoard(
        opponents,
        event.playerId,
        event.playerName,
        event.board,
        event.alive,
      );
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
