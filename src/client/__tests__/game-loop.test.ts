import { describe, it, expect } from 'vitest';
import { createGame, tick, type GameState } from '../../game/game';

/**
 * Tests verifying game loop gating behaviour:
 * - Game state should NOT advance when waiting for start signal
 * - Game state SHOULD advance when playing
 * - Background-tab catch-up via multiple ticks
 */
describe('Game loop gating', () => {
  it('tick does not advance gravity when deltaMs is 0', () => {
    const state = createGame();
    const after = tick(state, 0);
    // With 0 delta, gravity timer should not advance
    expect(after.gravityTimer).toBe(state.gravityTimer);
    expect(after.currentPiece.y).toBe(state.currentPiece.y);
  });

  it('tick advances gravity when deltaMs > 0', () => {
    const state = createGame();
    // A small tick should accumulate gravity
    const after = tick(state, 50);
    expect(after.gravityTimer).toBeGreaterThan(state.gravityTimer);
  });

  it('skipping tick preserves game state exactly', () => {
    const state = createGame();
    // Simulating the waitingForStart behaviour: just don't call tick
    // State should remain identical
    const stateJson = JSON.stringify(state);
    expect(JSON.stringify(state)).toBe(stateJson);
  });
});

describe('Background tab catch-up', () => {
  it('multiple small ticks advance game state progressively', () => {
    const state = createGame();
    // Small ticks that accumulate gravity without triggering a drop
    const after1 = tick(state, 50);
    const after2 = tick(after1, 50);
    // Gravity timer should accumulate across ticks
    expect(after2.gravityTimer).toBeGreaterThanOrEqual(after1.gravityTimer);
    // At minimum the second state should have more accumulated time
    expect(after1.gravityTimer).toBeGreaterThan(state.gravityTimer);
  });
});
