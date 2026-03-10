import { describe, it, expect } from 'vitest';
import { calculateGarbage } from '../garbage';

describe('calculateGarbage', () => {
  it('returns 0 garbage for 1 line cleared', () => {
    expect(calculateGarbage(1)).toBe(0);
  });

  it('returns 1 garbage for 2 lines cleared', () => {
    expect(calculateGarbage(2)).toBe(1);
  });

  it('returns 2 garbage for 3 lines cleared', () => {
    expect(calculateGarbage(3)).toBe(2);
  });

  it('returns 4 garbage for 4 lines (Tetris)', () => {
    expect(calculateGarbage(4)).toBe(4);
  });

  it('returns 0 garbage for 0 lines', () => {
    expect(calculateGarbage(0)).toBe(0);
  });
});
