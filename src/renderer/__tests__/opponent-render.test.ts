import { describe, it, expect } from 'vitest';
import {
  OPPONENT_CELL_SIZE,
  OPPONENT_BOARD_WIDTH,
  OPPONENT_BOARD_HEIGHT,
  OPPONENT_PANEL_WIDTH,
  OPPONENT_PANEL_X,
  OPPONENT_MINI_BOARD_SPACING,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOARD_X,
  BOARD_PIXEL_WIDTH,
  SIDE_PANEL_WIDTH,
  PADDING_TOP,
} from '../layout';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../game/board';
import { getOpponentLayout } from '../render';

describe('opponent panel layout constants', () => {
  it('OPPONENT_CELL_SIZE is small enough for mini-boards (~4px)', () => {
    expect(OPPONENT_CELL_SIZE).toBe(4);
  });

  it('OPPONENT_BOARD_WIDTH/HEIGHT match cell size * board dimensions', () => {
    expect(OPPONENT_BOARD_WIDTH).toBe(OPPONENT_CELL_SIZE * BOARD_WIDTH);   // 40
    expect(OPPONENT_BOARD_HEIGHT).toBe(OPPONENT_CELL_SIZE * BOARD_HEIGHT); // 80
  });

  it('OPPONENT_PANEL_X starts after the next piece panel', () => {
    const expectedX = BOARD_X + BOARD_PIXEL_WIDTH + SIDE_PANEL_WIDTH;
    expect(OPPONENT_PANEL_X).toBe(expectedX);
  });

  it('OPPONENT_PANEL_WIDTH is wide enough for a 2-column layout', () => {
    // At least 2 mini-boards side by side plus spacing
    expect(OPPONENT_PANEL_WIDTH).toBeGreaterThanOrEqual(OPPONENT_BOARD_WIDTH * 2 + 10);
  });

  it('CANVAS_WIDTH includes the opponent panel', () => {
    expect(CANVAS_WIDTH).toBe(OPPONENT_PANEL_X + OPPONENT_PANEL_WIDTH);
  });

  it('9 mini-boards fit within the canvas height', () => {
    // With 2 columns, we need ceil(9/2) = 5 rows
    const rows = Math.ceil(9 / 2);
    const totalHeight = rows * (OPPONENT_BOARD_HEIGHT + OPPONENT_MINI_BOARD_SPACING + 14); // 14 for name label
    expect(totalHeight).toBeLessThanOrEqual(CANVAS_HEIGHT);
  });
});

describe('getOpponentLayout', () => {
  it('uses a single column for 1-3 opponents', () => {
    const pos0 = getOpponentLayout(0, 3);
    const pos1 = getOpponentLayout(1, 3);
    const pos2 = getOpponentLayout(2, 3);

    // All in same column (same x)
    expect(pos0.x).toBe(pos1.x);
    expect(pos1.x).toBe(pos2.x);

    // Y increases with each row
    expect(pos1.y).toBeGreaterThan(pos0.y);
    expect(pos2.y).toBeGreaterThan(pos1.y);
  });

  it('uses a 2-column grid for 4+ opponents', () => {
    const pos0 = getOpponentLayout(0, 5); // col 0, row 0
    const pos1 = getOpponentLayout(1, 5); // col 1, row 0
    const pos2 = getOpponentLayout(2, 5); // col 0, row 1
    const pos3 = getOpponentLayout(3, 5); // col 1, row 1

    // Columns 0 and 1 have different x
    expect(pos1.x).toBeGreaterThan(pos0.x);
    // Same row = same y
    expect(pos0.y).toBe(pos1.y);
    expect(pos2.y).toBe(pos3.y);
    // Second row is below first
    expect(pos2.y).toBeGreaterThan(pos0.y);
  });

  it('positions start at OPPONENT_PANEL_X offset', () => {
    const pos = getOpponentLayout(0, 1);
    expect(pos.x).toBe(OPPONENT_PANEL_X + 5);
    expect(pos.y).toBe(PADDING_TOP + 16);
  });

  it('all 9 opponents fit within canvas bounds', () => {
    for (let i = 0; i < 9; i++) {
      const pos = getOpponentLayout(i, 9);
      expect(pos.x).toBeGreaterThanOrEqual(OPPONENT_PANEL_X);
      expect(pos.x + OPPONENT_BOARD_WIDTH).toBeLessThanOrEqual(CANVAS_WIDTH);
      const bottomY = pos.y + 14 + OPPONENT_BOARD_HEIGHT; // name + board
      expect(bottomY).toBeLessThanOrEqual(CANVAS_HEIGHT);
    }
  });
});
