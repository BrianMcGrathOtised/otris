import { describe, it, expect } from 'vitest';
import {
  CELL_SIZE,
  BOARD_PIXEL_WIDTH,
  BOARD_PIXEL_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BOARD_X,
  BOARD_Y,
  boardCellToPixel,
} from '../layout';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../game/board';

describe('layout constants', () => {
  it('CELL_SIZE is 30px', () => {
    expect(CELL_SIZE).toBe(30);
  });

  it('board pixel dimensions match cell size * board dimensions', () => {
    expect(BOARD_PIXEL_WIDTH).toBe(CELL_SIZE * BOARD_WIDTH);
    expect(BOARD_PIXEL_HEIGHT).toBe(CELL_SIZE * BOARD_HEIGHT);
  });

  it('canvas dimensions are large enough to hold the board plus sidebars', () => {
    expect(CANVAS_WIDTH).toBeGreaterThan(BOARD_PIXEL_WIDTH);
    expect(CANVAS_HEIGHT).toBeGreaterThanOrEqual(BOARD_PIXEL_HEIGHT);
  });

  it('board is positioned within the canvas bounds', () => {
    expect(BOARD_X).toBeGreaterThanOrEqual(0);
    expect(BOARD_Y).toBeGreaterThanOrEqual(0);
    expect(BOARD_X + BOARD_PIXEL_WIDTH).toBeLessThanOrEqual(CANVAS_WIDTH);
    expect(BOARD_Y + BOARD_PIXEL_HEIGHT).toBeLessThanOrEqual(CANVAS_HEIGHT);
  });
});

describe('boardCellToPixel', () => {
  it('returns top-left pixel coordinates for cell (0, 0)', () => {
    const { px, py } = boardCellToPixel(0, 0);
    expect(px).toBe(BOARD_X);
    expect(py).toBe(BOARD_Y);
  });

  it('offsets by cell size for adjacent cells', () => {
    const { px: px1, py: py1 } = boardCellToPixel(1, 0);
    const { px: px0, py: py0 } = boardCellToPixel(0, 0);
    expect(px1 - px0).toBe(CELL_SIZE);
    expect(py1).toBe(py0);

    const { px: px01, py: py01 } = boardCellToPixel(0, 1);
    expect(px01).toBe(px0);
    expect(py01 - py0).toBe(CELL_SIZE);
  });
});
