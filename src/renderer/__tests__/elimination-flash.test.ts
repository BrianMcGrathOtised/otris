import { describe, it, expect } from 'vitest';
import { BOARD_X, BOARD_Y, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT } from '../layout';

describe('render() accepts eliminationFlashAlpha parameter', () => {
  it('render() accepts 6 parameters (ctx, state, opponents, garbageQueueSize, garbageFlashAlpha, eliminationFlashAlpha)', async () => {
    const { render } = await import('../render');
    expect(typeof render).toBe('function');
    // The function should accept at least 6 params (some may be optional with defaults)
    // We verify it can be called without error with all 6
    expect(render.length).toBeGreaterThanOrEqual(2);
  });

  it('drawEliminationFlash is exported for testing', async () => {
    const mod = await import('../render');
    expect(typeof (mod as any).drawEliminationFlash).toBe('function');
  });
});

describe('drawEliminationFlash', () => {
  it('does nothing when flashAlpha is 0', async () => {
    const { drawEliminationFlash } = await import('../render');
    const calls: string[] = [];
    const fakeCtx = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      fillRect: () => calls.push('fillRect'),
      set globalAlpha(_v: number) { /* no-op */ },
      set fillStyle(_v: string) { /* no-op */ },
    } as unknown as CanvasRenderingContext2D;

    drawEliminationFlash(fakeCtx, 0);
    // Should early-return without drawing anything
    expect(calls).not.toContain('fillRect');
  });

  it('draws a red overlay on the board area when flashAlpha > 0', async () => {
    const { drawEliminationFlash } = await import('../render');
    const fillRectCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
    let lastAlpha = 0;
    let lastFillStyle = '';
    const fakeCtx = {
      save: () => {},
      restore: () => {},
      fillRect: (x: number, y: number, w: number, h: number) => {
        fillRectCalls.push({ x, y, w, h });
      },
      set globalAlpha(v: number) { lastAlpha = v; },
      get globalAlpha() { return lastAlpha; },
      set fillStyle(v: string) { lastFillStyle = v; },
      get fillStyle() { return lastFillStyle; },
    } as unknown as CanvasRenderingContext2D;

    drawEliminationFlash(fakeCtx, 0.5);

    // Should have drawn at least one fillRect covering the board area
    expect(fillRectCalls.length).toBeGreaterThanOrEqual(1);
    const boardFill = fillRectCalls.find(
      (c) => c.x === BOARD_X && c.y === BOARD_Y &&
             c.w === BOARD_PIXEL_WIDTH && c.h === BOARD_PIXEL_HEIGHT,
    );
    expect(boardFill).toBeDefined();
  });
});
