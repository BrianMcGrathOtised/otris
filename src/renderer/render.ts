/**
 * Canvas renderer for Otris.
 *
 * Exports a pure `render(ctx, state)` function that draws the complete game
 * frame: board, current piece with gradient/glow, ghost piece, hold/next
 * displays, HUD, and game-over overlay.
 */

import type { Board } from '../game/board';
import { BOARD_WIDTH, BOARD_HEIGHT, HIDDEN_ROWS, TOTAL_ROWS } from '../game/board';
import { getShape, TETROMINOES } from '../game/tetrominoes';
import type { PieceType } from '../game/tetrominoes';
import type { GameState } from '../game/game';
import { getPieceColor } from './colors';
import type { PieceColorSet } from './colors';
import {
  CELL_SIZE,
  BOARD_PIXEL_WIDTH,
  BOARD_PIXEL_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOARD_X,
  BOARD_Y,
  HOLD_X,
  HOLD_Y,
  HOLD_SIZE,
  NEXT_X,
  NEXT_Y,
  NEXT_SIZE,
  MINI_CELL_SIZE,
} from './layout';
import { isValidPosition } from '../game/board';

// ---------------------------------------------------------------------------
// Ghost piece helper (pure, exported for testing)
// ---------------------------------------------------------------------------

/**
 * Calculate the Y position where the piece would land (ghost position).
 * Drops from `startY` until the piece can no longer move down.
 */
export function getGhostY(
  board: Board,
  shape: number[][],
  x: number,
  startY: number,
): number {
  let y = startY;
  while (isValidPosition(board, shape, x, y + 1)) {
    y++;
  }
  return y;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawGradientCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  colors: PieceColorSet,
  alpha: number = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Gradient fill (light top to dark bottom)
  const gradient = ctx.createLinearGradient(px, py, px, py + size);
  gradient.addColorStop(0, colors.light);
  gradient.addColorStop(1, colors.dark);
  ctx.fillStyle = gradient;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

  // Subtle inner border highlight
  ctx.strokeStyle = colors.light;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);

  ctx.restore();
}

function drawGlowCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  colors: PieceColorSet,
  alpha: number = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Glow effect
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 8;

  drawGradientCell(ctx, px, py, size, colors, alpha);

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Board rendering
// ---------------------------------------------------------------------------

function drawBoard(ctx: CanvasRenderingContext2D, board: Board): void {
  // Board background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);

  // Grid lines
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for (let col = 0; col <= BOARD_WIDTH; col++) {
    const x = BOARD_X + col * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, BOARD_Y);
    ctx.lineTo(x, BOARD_Y + BOARD_PIXEL_HEIGHT);
    ctx.stroke();
  }
  for (let row = 0; row <= BOARD_HEIGHT; row++) {
    const y = BOARD_Y + row * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(BOARD_X, y);
    ctx.lineTo(BOARD_X + BOARD_PIXEL_WIDTH, y);
    ctx.stroke();
  }

  // Occupied cells (skip hidden rows)
  for (let row = HIDDEN_ROWS; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < BOARD_WIDTH; col++) {
      const cell = board[row]![col]!;
      if (cell === 0) continue;

      const px = BOARD_X + col * CELL_SIZE;
      const py = BOARD_Y + (row - HIDDEN_ROWS) * CELL_SIZE;
      const colors = getPieceColor(cell);
      drawGlowCell(ctx, px, py, CELL_SIZE, colors);
    }
  }

  // Board border
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD_X, BOARD_Y, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);
}

// ---------------------------------------------------------------------------
// Ghost piece
// ---------------------------------------------------------------------------

function drawGhostPiece(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.gameOver) return;

  const piece = state.currentPiece;
  const shape = getShape(piece.type, piece.rotation);
  const ghostY = getGhostY(state.board, shape, piece.x, piece.y);

  // Don't draw ghost if it overlaps the actual piece
  if (ghostY === piece.y) return;

  const colors = getPieceColor(TETROMINOES[piece.type].colorId);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row]!.length; col++) {
      if (shape[row]![col] === 0) continue;

      const boardRow = ghostY + row;
      if (boardRow < HIDDEN_ROWS) continue;

      const px = BOARD_X + (piece.x + col) * CELL_SIZE;
      const py = BOARD_Y + (boardRow - HIDDEN_ROWS) * CELL_SIZE;

      // Semi-transparent outline
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = colors.base;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.fillStyle = colors.base;
      ctx.globalAlpha = 0.1;
      ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// Current (active) piece
// ---------------------------------------------------------------------------

function drawCurrentPiece(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.gameOver) return;

  const piece = state.currentPiece;
  const shape = getShape(piece.type, piece.rotation);
  const colors = getPieceColor(TETROMINOES[piece.type].colorId);

  // Slightly brighter variant for active piece
  const brightColors: PieceColorSet = {
    base: colors.base,
    light: colors.light,
    dark: colors.base, // use base as dark for brighter look
    glow: colors.glow,
  };

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row]!.length; col++) {
      if (shape[row]![col] === 0) continue;

      const boardRow = piece.y + row;
      if (boardRow < HIDDEN_ROWS) continue;

      const px = BOARD_X + (piece.x + col) * CELL_SIZE;
      const py = BOARD_Y + (boardRow - HIDDEN_ROWS) * CELL_SIZE;
      drawGlowCell(ctx, px, py, CELL_SIZE, brightColors);
    }
  }
}

// ---------------------------------------------------------------------------
// Mini piece display (hold / next)
// ---------------------------------------------------------------------------

function drawMiniPiece(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  centerX: number,
  centerY: number,
  cellSize: number,
  alpha: number = 1,
): void {
  const shape = getShape(type, 0);
  const colors = getPieceColor(TETROMINOES[type].colorId);

  // Calculate bounding box of filled cells
  let minRow = shape.length;
  let maxRow = 0;
  let minCol = shape[0]!.length;
  let maxCol = 0;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r]!.length; c++) {
      if (shape[r]![c] !== 0) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  const filledWidth = (maxCol - minCol + 1) * cellSize;
  const filledHeight = (maxRow - minRow + 1) * cellSize;
  const offsetX = centerX - filledWidth / 2;
  const offsetY = centerY - filledHeight / 2;

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (shape[r]![c] === 0) continue;
      const px = offsetX + (c - minCol) * cellSize;
      const py = offsetY + (r - minRow) * cellSize;
      drawGradientCell(ctx, px, py, cellSize, colors, alpha);
    }
  }
}

// ---------------------------------------------------------------------------
// Hold piece panel
// ---------------------------------------------------------------------------

function drawHoldPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Panel label
  ctx.fillStyle = '#666';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HOLD', HOLD_X + HOLD_SIZE / 2, HOLD_Y - 10);

  // Panel background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(HOLD_X, HOLD_Y, HOLD_SIZE, HOLD_SIZE);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(HOLD_X, HOLD_Y, HOLD_SIZE, HOLD_SIZE);

  if (state.holdPiece !== null) {
    const alpha = state.holdUsed ? 0.4 : 1;
    drawMiniPiece(
      ctx,
      state.holdPiece,
      HOLD_X + HOLD_SIZE / 2,
      HOLD_Y + HOLD_SIZE / 2,
      MINI_CELL_SIZE,
      alpha,
    );
  }
}

// ---------------------------------------------------------------------------
// Next piece panel
// ---------------------------------------------------------------------------

function drawNextPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Panel label
  ctx.fillStyle = '#666';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT', NEXT_X + NEXT_SIZE / 2, NEXT_Y - 10);

  // Panel background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(NEXT_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(NEXT_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);

  drawMiniPiece(
    ctx,
    state.nextPiece,
    NEXT_X + NEXT_SIZE / 2,
    NEXT_Y + NEXT_SIZE / 2,
    MINI_CELL_SIZE,
  );
}

// ---------------------------------------------------------------------------
// HUD (score, lines, level)
// ---------------------------------------------------------------------------

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  const hudY = BOARD_Y + BOARD_PIXEL_HEIGHT + 25;

  ctx.fillStyle = '#aaa';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Lines: ${state.lines}`, BOARD_X, hudY);

  ctx.textAlign = 'center';
  ctx.fillText(`Level: ${state.level}`, BOARD_X + BOARD_PIXEL_WIDTH / 2, hudY);

  ctx.textAlign = 'right';
  ctx.fillText(`Score: ${state.score}`, BOARD_X + BOARD_PIXEL_WIDTH, hudY);

  // Additional info on side panels
  const infoY = HOLD_Y + HOLD_SIZE + 40;
  ctx.fillStyle = '#555';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE`, HOLD_X + HOLD_SIZE / 2, infoY);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px monospace';
  ctx.fillText(`${state.score}`, HOLD_X + HOLD_SIZE / 2, infoY + 22);

  ctx.fillStyle = '#555';
  ctx.font = '12px monospace';
  ctx.fillText(`LEVEL`, NEXT_X + NEXT_SIZE / 2, infoY);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px monospace';
  ctx.fillText(`${state.level}`, NEXT_X + NEXT_SIZE / 2, infoY + 22);

  ctx.fillStyle = '#555';
  ctx.font = '12px monospace';
  ctx.fillText(`LINES`, NEXT_X + NEXT_SIZE / 2, infoY + 60);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px monospace';
  ctx.fillText(`${state.lines}`, NEXT_X + NEXT_SIZE / 2, infoY + 82);
}

// ---------------------------------------------------------------------------
// Game over overlay
// ---------------------------------------------------------------------------

function drawGameOverOverlay(ctx: CanvasRenderingContext2D): void {
  // Semi-transparent dark overlay over the whole canvas
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // "GAME OVER" text
  ctx.fillStyle = '#ff1744';
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff1744';
  ctx.shadowBlur = 20;
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#aaa';
  ctx.font = '18px monospace';
  ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

function drawTitle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#555';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('OTRIS', CANVAS_WIDTH / 2, 10);
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

/**
 * Render the complete game frame to a CanvasRenderingContext2D.
 * This is a pure rendering function — it reads state but does not mutate it.
 */
export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawTitle(ctx);
  drawBoard(ctx, state.board);
  drawGhostPiece(ctx, state);
  drawCurrentPiece(ctx, state);
  drawHoldPanel(ctx, state);
  drawNextPanel(ctx, state);
  drawHUD(ctx, state);

  if (state.gameOver) {
    drawGameOverOverlay(ctx);
  }
}
