import { describe, it, expect } from 'vitest';
import { PIECE_COLORS, getPieceColor } from '../colors';

describe('PIECE_COLORS', () => {
  it('defines colors for all 7 piece types (colorIds 1-7)', () => {
    for (let id = 1; id <= 7; id++) {
      expect(PIECE_COLORS[id]).toBeDefined();
      expect(PIECE_COLORS[id]!.base).toBeTruthy();
      expect(PIECE_COLORS[id]!.light).toBeTruthy();
      expect(PIECE_COLORS[id]!.dark).toBeTruthy();
    }
  });

  it('uses cyan for I-piece (colorId 1)', () => {
    expect(PIECE_COLORS[1]!.base).toMatch(/cyan|#0[0-9a-f]*ff/i);
  });

  it('uses yellow for O-piece (colorId 2)', () => {
    expect(PIECE_COLORS[2]!.base).toMatch(/yellow|#ff0|#ffd/i);
  });
});

describe('getPieceColor', () => {
  it('returns the correct color for a valid colorId', () => {
    const color = getPieceColor(1);
    expect(color).toBe(PIECE_COLORS[1]);
  });

  it('returns a fallback color for colorId 0 (empty)', () => {
    const color = getPieceColor(0);
    expect(color).toBeDefined();
    expect(color.base).toBeTruthy();
  });

  it('returns a fallback color for unknown colorId', () => {
    const color = getPieceColor(99);
    expect(color).toBeDefined();
    expect(color.base).toBeTruthy();
  });
});
