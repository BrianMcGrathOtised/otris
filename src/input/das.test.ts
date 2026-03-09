import { describe, it, expect } from 'vitest';
import {
  createDAS,
  dasPress,
  dasRelease,
  dasUpdate,
  DAS_INITIAL_DELAY_MS,
  DAS_REPEAT_INTERVAL_MS,
} from './das';

describe('DAS (Delayed Auto Shift)', () => {
  it('creates an initial unpressed state', () => {
    const das = createDAS();
    expect(das.pressed).toBe(false);
    expect(das.elapsed).toBe(0);
    expect(das.charged).toBe(false);
  });

  it('fires once on initial press', () => {
    const das = createDAS();
    const result = dasPress(das);
    expect(result.fire).toBe(true);
    expect(result.das.pressed).toBe(true);
    expect(result.das.elapsed).toBe(0);
    expect(result.das.charged).toBe(false);
  });

  it('does not fire on duplicate press (OS key repeat)', () => {
    const das = createDAS();
    const { das: pressed } = dasPress(das);
    const result = dasPress(pressed);
    expect(result.fire).toBe(false);
  });

  it('resets state on release', () => {
    const das = createDAS();
    const { das: pressed } = dasPress(das);
    const released = dasRelease(pressed);
    expect(released.pressed).toBe(false);
    expect(released.elapsed).toBe(0);
    expect(released.charged).toBe(false);
  });

  it('does not fire during initial delay', () => {
    const { das } = dasPress(createDAS());
    const result = dasUpdate(das, DAS_INITIAL_DELAY_MS - 1);
    expect(result.fires).toBe(0);
    expect(result.das.charged).toBe(false);
    expect(result.das.elapsed).toBe(DAS_INITIAL_DELAY_MS - 1);
  });

  it('fires once when initial delay is exactly reached', () => {
    const { das } = dasPress(createDAS());
    const result = dasUpdate(das, DAS_INITIAL_DELAY_MS);
    expect(result.fires).toBe(1);
    expect(result.das.charged).toBe(true);
    expect(result.das.elapsed).toBe(0);
  });

  it('fires additional repeats at the repeat interval', () => {
    const { das } = dasPress(createDAS());
    // Charge past initial delay
    const { das: charged } = dasUpdate(das, DAS_INITIAL_DELAY_MS);
    // One full repeat interval
    const result = dasUpdate(charged, DAS_REPEAT_INTERVAL_MS);
    expect(result.fires).toBe(1);
  });

  it('fires multiple repeats in a large delta', () => {
    const { das } = dasPress(createDAS());
    // Large delta: initial delay + 3 repeat intervals
    const totalMs = DAS_INITIAL_DELAY_MS + DAS_REPEAT_INTERVAL_MS * 3;
    const result = dasUpdate(das, totalMs);
    // 1 for initial charge + 3 repeats = 4
    expect(result.fires).toBe(4);
    expect(result.das.charged).toBe(true);
    expect(result.das.elapsed).toBe(0);
  });

  it('accumulates fractional time across frames', () => {
    const { das } = dasPress(createDAS());
    // First frame: 100ms (under the 170ms threshold)
    const { das: das2, fires: f1 } = dasUpdate(das, 100);
    expect(f1).toBe(0);
    expect(das2.elapsed).toBe(100);

    // Second frame: 80ms (total 180ms, exceeds 170ms threshold)
    const { das: das3, fires: f2 } = dasUpdate(das2, 80);
    expect(f2).toBe(1); // The charge fires
    expect(das3.charged).toBe(true);
    expect(das3.elapsed).toBe(10); // 180 - 170 = 10ms remainder
  });

  it('does not fire when not pressed', () => {
    const das = createDAS();
    const result = dasUpdate(das, 500);
    expect(result.fires).toBe(0);
    expect(result.das.pressed).toBe(false);
  });

  it('stops firing after release', () => {
    const { das } = dasPress(createDAS());
    const { das: charged } = dasUpdate(das, DAS_INITIAL_DELAY_MS + 10);
    const released = dasRelease(charged);
    const result = dasUpdate(released, DAS_REPEAT_INTERVAL_MS * 5);
    expect(result.fires).toBe(0);
  });
});
