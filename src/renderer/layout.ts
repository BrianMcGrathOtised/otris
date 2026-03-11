/**
 * Layout constants and coordinate-mapping utilities for the Canvas renderer.
 *
 * Canvas layout:
 *   - Hold display (left) | Board (center) | Next display (right)
 *   - HUD text below the board
 */

import { BOARD_WIDTH, BOARD_HEIGHT } from '../game/board';

/** Pixels per board cell. */
export const CELL_SIZE = 30;

/** Board dimensions in pixels. */
export const BOARD_PIXEL_WIDTH = CELL_SIZE * BOARD_WIDTH;   // 300
export const BOARD_PIXEL_HEIGHT = CELL_SIZE * BOARD_HEIGHT;  // 600

/** Side panel width (hold / next piece displays). */
export const SIDE_PANEL_WIDTH = 120;

/** Vertical padding at top/bottom. */
export const PADDING_TOP = 40;
export const PADDING_BOTTOM = 80;

/** Opponent mini-board constants. */
export const OPPONENT_CELL_SIZE = 4;
export const OPPONENT_BOARD_WIDTH = OPPONENT_CELL_SIZE * BOARD_WIDTH;   // 40
export const OPPONENT_BOARD_HEIGHT = OPPONENT_CELL_SIZE * BOARD_HEIGHT; // 80
export const OPPONENT_MINI_BOARD_SPACING = 8;
export const OPPONENT_PANEL_WIDTH = 110;

/** Opponent panel X position (starts after the next piece panel). */
export const OPPONENT_PANEL_X = SIDE_PANEL_WIDTH + BOARD_PIXEL_WIDTH + SIDE_PANEL_WIDTH;

/** Total canvas dimensions. */
export const CANVAS_WIDTH = OPPONENT_PANEL_X + OPPONENT_PANEL_WIDTH; // 650
export const CANVAS_HEIGHT = PADDING_TOP + BOARD_PIXEL_HEIGHT + PADDING_BOTTOM;      // 720

/** Top-left pixel position of the board area on the canvas. */
export const BOARD_X = SIDE_PANEL_WIDTH;
export const BOARD_Y = PADDING_TOP;

/** Hold piece display position. */
export const HOLD_X = 10;
export const HOLD_Y = PADDING_TOP + 30;
export const HOLD_SIZE = SIDE_PANEL_WIDTH - 20;

/** Next piece display position. */
export const NEXT_X = SIDE_PANEL_WIDTH + BOARD_PIXEL_WIDTH + 10;
export const NEXT_Y = PADDING_TOP + 30;
export const NEXT_SIZE = SIDE_PANEL_WIDTH - 20;

/** Mini cell size for hold/next displays. */
export const MINI_CELL_SIZE = 20;

/** Garbage queue indicator (vertical bar on left edge of board). */
export const GARBAGE_QUEUE_WIDTH = 8;
export const GARBAGE_QUEUE_X = BOARD_X - GARBAGE_QUEUE_WIDTH - 2;
export const GARBAGE_QUEUE_Y = BOARD_Y;
export const GARBAGE_SEGMENT_HEIGHT = CELL_SIZE;

/**
 * Convert a board grid coordinate (col, row) to the top-left pixel on the canvas.
 * Row 0 is the first visible row (HIDDEN_ROWS are not displayed).
 */
export function boardCellToPixel(col: number, row: number): { px: number; py: number } {
  return {
    px: BOARD_X + col * CELL_SIZE,
    py: BOARD_Y + row * CELL_SIZE,
  };
}
