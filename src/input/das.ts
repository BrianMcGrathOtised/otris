/**
 * DAS (Delayed Auto Shift) — pure logic for key-repeat timing.
 *
 * Tracks pressed state and elapsed time to determine when a
 * directional action should fire. No DOM dependency.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DAS_INITIAL_DELAY_MS = 170;
export const DAS_REPEAT_INTERVAL_MS = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DASState {
  /** Whether the key is currently held down. */
  pressed: boolean;
  /** Milliseconds accumulated since the key was pressed (or last repeat). */
  elapsed: number;
  /** Whether the initial delay has already been exceeded (now in repeat mode). */
  charged: boolean;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function createDAS(): DASState {
  return { pressed: false, elapsed: 0, charged: false };
}

/**
 * Call when the key is pressed down.
 * Returns a new DASState and a flag indicating whether an action should fire
 * immediately (the initial press always fires).
 */
export function dasPress(state: DASState): { das: DASState; fire: boolean } {
  if (state.pressed) {
    // Already pressed — ignore repeat keydown events from OS
    return { das: state, fire: false };
  }
  return {
    das: { pressed: true, elapsed: 0, charged: false },
    fire: true,
  };
}

/**
 * Call when the key is released.
 */
export function dasRelease(_state: DASState): DASState {
  return createDAS();
}

/**
 * Advance the DAS timer by `deltaMs`. Returns the updated state and the
 * number of times the action should fire this frame (0, 1, or more if
 * delta is large).
 */
export function dasUpdate(
  state: DASState,
  deltaMs: number,
): { das: DASState; fires: number } {
  if (!state.pressed) {
    return { das: state, fires: 0 };
  }

  let elapsed = state.elapsed + deltaMs;
  let charged = state.charged;
  let fires = 0;

  if (!charged) {
    // Still in initial delay phase
    if (elapsed >= DAS_INITIAL_DELAY_MS) {
      charged = true;
      fires += 1;
      elapsed -= DAS_INITIAL_DELAY_MS;
    }
  }

  if (charged) {
    // In repeat phase — consume as many intervals as possible
    while (elapsed >= DAS_REPEAT_INTERVAL_MS) {
      fires += 1;
      elapsed -= DAS_REPEAT_INTERVAL_MS;
    }
  }

  return {
    das: { pressed: true, elapsed, charged },
    fires,
  };
}
