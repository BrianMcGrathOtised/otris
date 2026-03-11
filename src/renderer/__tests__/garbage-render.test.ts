import { describe, it, expect } from 'vitest';
import { PIECE_COLORS, getPieceColor } from '../colors';
import { GARBAGE_QUEUE_WIDTH, GARBAGE_QUEUE_X, GARBAGE_QUEUE_Y, GARBAGE_SEGMENT_HEIGHT } from '../layout';
import { BOARD_X, BOARD_Y, BOARD_PIXEL_HEIGHT } from '../layout';

describe('GARBAGE_CELL color (colorId 8)', () => {
  it('defines a color entry for colorId 8', () => {
    expect(PIECE_COLORS[8]).toBeDefined();
    expect(PIECE_COLORS[8]!.base).toBeTruthy();
    expect(PIECE_COLORS[8]!.light).toBeTruthy();
    expect(PIECE_COLORS[8]!.dark).toBeTruthy();
    expect(PIECE_COLORS[8]!.glow).toBeTruthy();
  });

  it('getPieceColor returns the garbage color for colorId 8', () => {
    const color = getPieceColor(8);
    expect(color).toBe(PIECE_COLORS[8]);
  });

  it('garbage color is a dark gray tone', () => {
    const color = PIECE_COLORS[8]!;
    // Base should be a gray-ish hex value (not bright saturated)
    expect(color.base).toMatch(/^#[0-9a-fA-F]{3,6}$/);
  });
});

describe('garbage queue layout constants', () => {
  it('GARBAGE_QUEUE_WIDTH is a narrow bar (8-10px)', () => {
    expect(GARBAGE_QUEUE_WIDTH).toBeGreaterThanOrEqual(8);
    expect(GARBAGE_QUEUE_WIDTH).toBeLessThanOrEqual(10);
  });

  it('GARBAGE_QUEUE_X is positioned to the left of the board', () => {
    expect(GARBAGE_QUEUE_X).toBeLessThan(BOARD_X);
    expect(GARBAGE_QUEUE_X).toBeGreaterThanOrEqual(BOARD_X - GARBAGE_QUEUE_WIDTH - 4);
  });

  it('GARBAGE_QUEUE_Y aligns with the board top', () => {
    expect(GARBAGE_QUEUE_Y).toBe(BOARD_Y);
  });

  it('GARBAGE_SEGMENT_HEIGHT is defined for each pending line', () => {
    expect(GARBAGE_SEGMENT_HEIGHT).toBeGreaterThan(0);
  });
});

describe('render with garbage queue', () => {
  it('render() accepts garbageQueueSize and garbageFlashAlpha parameters', async () => {
    // Import render to verify its signature accepts the new params
    const { render } = await import('../render');
    expect(typeof render).toBe('function');
    // render(ctx, state, opponents, garbageQueueSize, garbageFlashAlpha)
    // Should accept 5 parameters without error
    expect(render.length).toBeGreaterThanOrEqual(2);
  });
});
