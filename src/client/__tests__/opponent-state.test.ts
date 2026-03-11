import { describe, it, expect } from 'vitest';
import {
  createOpponentMap,
  updateOpponentBoard,
  eliminateOpponent,
  clearOpponents,
  getOpponents,
  getAliveOpponents,
  type OpponentState,
  type OpponentMap,
} from '../opponent-state';

function makeBoard(fill = 0): number[][] {
  return Array.from({ length: 22 }, () => Array(10).fill(fill));
}

describe('opponent-state', () => {
  describe('createOpponentMap', () => {
    it('returns an empty map', () => {
      const map = createOpponentMap();
      expect(getOpponents(map)).toEqual([]);
    });
  });

  describe('updateOpponentBoard', () => {
    it('adds a new opponent when not present', () => {
      let map = createOpponentMap();
      const board = makeBoard();
      map = updateOpponentBoard(map, 'p1', 'Alice', board, true);
      const opponents = getOpponents(map);
      expect(opponents).toHaveLength(1);
      expect(opponents[0]!.playerId).toBe('p1');
      expect(opponents[0]!.name).toBe('Alice');
      expect(opponents[0]!.board).toBe(board);
      expect(opponents[0]!.alive).toBe(true);
    });

    it('updates an existing opponent board and name', () => {
      let map = createOpponentMap();
      const board1 = makeBoard(0);
      const board2 = makeBoard(1);
      map = updateOpponentBoard(map, 'p1', 'Alice', board1, true);
      map = updateOpponentBoard(map, 'p1', 'Alice2', board2, true);
      const opponents = getOpponents(map);
      expect(opponents).toHaveLength(1);
      expect(opponents[0]!.name).toBe('Alice2');
      expect(opponents[0]!.board).toBe(board2);
    });

    it('handles multiple opponents', () => {
      let map = createOpponentMap();
      map = updateOpponentBoard(map, 'p1', 'Alice', makeBoard(), true);
      map = updateOpponentBoard(map, 'p2', 'Bob', makeBoard(), true);
      map = updateOpponentBoard(map, 'p3', 'Charlie', makeBoard(), true);
      expect(getOpponents(map)).toHaveLength(3);
    });

    it('preserves immutability — original map unchanged', () => {
      const map = createOpponentMap();
      const map2 = updateOpponentBoard(map, 'p1', 'Alice', makeBoard(), true);
      expect(getOpponents(map)).toHaveLength(0);
      expect(getOpponents(map2)).toHaveLength(1);
    });
  });

  describe('eliminateOpponent', () => {
    it('sets alive to false for the given player', () => {
      let map = createOpponentMap();
      map = updateOpponentBoard(map, 'p1', 'Alice', makeBoard(), true);
      map = updateOpponentBoard(map, 'p2', 'Bob', makeBoard(), true);
      map = eliminateOpponent(map, 'p1');
      const opponents = getOpponents(map);
      const alice = opponents.find(o => o.playerId === 'p1');
      const bob = opponents.find(o => o.playerId === 'p2');
      expect(alice!.alive).toBe(false);
      expect(bob!.alive).toBe(true);
    });

    it('is a no-op for unknown player IDs', () => {
      let map = createOpponentMap();
      map = updateOpponentBoard(map, 'p1', 'Alice', makeBoard(), true);
      const map2 = eliminateOpponent(map, 'unknown');
      // Should return same reference when no change
      expect(map2).toBe(map);
    });
  });

  describe('clearOpponents', () => {
    it('returns an empty map', () => {
      let map = createOpponentMap();
      map = updateOpponentBoard(map, 'p1', 'Alice', makeBoard(), true);
      map = updateOpponentBoard(map, 'p2', 'Bob', makeBoard(), true);
      map = clearOpponents();
      expect(getOpponents(map)).toEqual([]);
    });
  });

  describe('getAliveOpponents', () => {
    it('returns only alive opponents', () => {
      let map = createOpponentMap();
      map = updateOpponentBoard(map, 'p1', 'Alice', makeBoard(), true);
      map = updateOpponentBoard(map, 'p2', 'Bob', makeBoard(), true);
      map = eliminateOpponent(map, 'p1');
      const alive = getAliveOpponents(map);
      expect(alive).toHaveLength(1);
      expect(alive[0]!.playerId).toBe('p2');
    });
  });
});
