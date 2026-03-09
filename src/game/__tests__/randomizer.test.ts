import { describe, it, expect } from 'vitest';
import { createBag, PieceType } from '../tetrominoes';

const ALL_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

describe('7-bag randomizer', () => {
  it('createBag returns a shuffled array of all 7 piece types', () => {
    const bag = createBag();
    expect(bag.length).toBe(7);
    expect([...bag].sort()).toEqual([...ALL_TYPES].sort());
  });

  it('consecutive bags contain all 7 pieces each', () => {
    for (let i = 0; i < 10; i++) {
      const bag = createBag();
      expect([...bag].sort()).toEqual([...ALL_TYPES].sort());
    }
  });

  it('bags are shuffled (not always same order)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(createBag().join(','));
    }
    // With 50 attempts, we should see more than 1 unique order
    expect(results.size).toBeGreaterThan(1);
  });
});
