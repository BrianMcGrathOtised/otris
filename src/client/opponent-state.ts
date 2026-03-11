/**
 * Client-side opponent state management.
 *
 * Pure functions for tracking opponent boards and alive status during
 * a multiplayer match. All mutations return new state objects (immutable
 * style) so they are easy to test.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpponentState {
  playerId: string;
  name: string;
  board: number[][];
  alive: boolean;
}

/**
 * Opaque opponent map — a readonly array of opponent entries keyed by
 * playerId. We use an array rather than a Map so the data structure is
 * easy to iterate for rendering and fully immutable-friendly.
 */
export type OpponentMap = readonly OpponentState[];

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOpponentMap(): OpponentMap {
  return [];
}

// ---------------------------------------------------------------------------
// Reducers (pure state transitions)
// ---------------------------------------------------------------------------

/** Add or update an opponent's board state. */
export function updateOpponentBoard(
  map: OpponentMap,
  playerId: string,
  name: string,
  board: number[][],
  alive: boolean,
): OpponentMap {
  const idx = map.findIndex(o => o.playerId === playerId);
  const entry: OpponentState = { playerId, name, board, alive };
  if (idx === -1) {
    return [...map, entry];
  }
  const next = [...map];
  next[idx] = entry;
  return next;
}

/** Mark an opponent as eliminated. Returns the same reference if not found. */
export function eliminateOpponent(map: OpponentMap, playerId: string): OpponentMap {
  const idx = map.findIndex(o => o.playerId === playerId);
  if (idx === -1) return map;
  const next = [...map];
  next[idx] = { ...next[idx]!, alive: false };
  return next;
}

/** Reset the opponent map (used on game start/stop). */
export function clearOpponents(): OpponentMap {
  return [];
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Return all opponents as an array. */
export function getOpponents(map: OpponentMap): readonly OpponentState[] {
  return map;
}

/** Return only alive opponents. */
export function getAliveOpponents(map: OpponentMap): readonly OpponentState[] {
  return map.filter(o => o.alive);
}
