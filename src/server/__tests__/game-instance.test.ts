import { describe, it, expect } from 'vitest';
import { GameInstance, type GamePlayer } from '../game-instance';

function createInstance(playerIds: string[] = ['p1', 'p2', 'p3']): GameInstance {
  return new GameInstance('lobby-1', playerIds);
}

describe('GameInstance', () => {
  describe('constructor', () => {
    it('tracks all players as alive', () => {
      const gi = createInstance();
      expect(gi.getAlivePlayers()).toEqual(['p1', 'p2', 'p3']);
    });

    it('sets status to countdown', () => {
      const gi = createInstance();
      expect(gi.status).toBe('countdown');
    });

    it('stores the lobby ID', () => {
      const gi = createInstance();
      expect(gi.lobbyId).toBe('lobby-1');
    });

    it('initializes each player with zero garbage queue', () => {
      const gi = createInstance();
      const player = gi.getPlayer('p1');
      expect(player).toBeDefined();
      expect(player!.alive).toBe(true);
      expect(player!.garbageQueue).toBe(0);
    });
  });

  describe('startGame', () => {
    it('transitions status from countdown to playing', () => {
      const gi = createInstance();
      gi.startGame();
      expect(gi.status).toBe('playing');
    });
  });

  describe('eliminatePlayer', () => {
    it('marks a player as dead', () => {
      const gi = createInstance();
      gi.startGame();
      gi.eliminatePlayer('p1');
      expect(gi.getPlayer('p1')!.alive).toBe(false);
    });

    it('removes player from alive list', () => {
      const gi = createInstance();
      gi.startGame();
      gi.eliminatePlayer('p1');
      expect(gi.getAlivePlayers()).toEqual(['p2', 'p3']);
    });

    it('returns the placement (position from last)', () => {
      const gi = createInstance(); // 3 players
      gi.startGame();
      const placement = gi.eliminatePlayer('p1');
      expect(placement).toBe(3); // 3rd place (first to die)
    });

    it('returns correct placement for second elimination', () => {
      const gi = createInstance();
      gi.startGame();
      gi.eliminatePlayer('p1'); // 3rd
      const placement = gi.eliminatePlayer('p2'); // 2nd
      expect(placement).toBe(2);
    });

    it('does not eliminate already-dead player', () => {
      const gi = createInstance();
      gi.startGame();
      gi.eliminatePlayer('p1');
      const placement = gi.eliminatePlayer('p1');
      expect(placement).toBe(null);
    });

    it('does not eliminate unknown player', () => {
      const gi = createInstance();
      gi.startGame();
      const placement = gi.eliminatePlayer('unknown');
      expect(placement).toBe(null);
    });
  });

  describe('isMatchOver', () => {
    it('returns false when multiple players alive', () => {
      const gi = createInstance();
      gi.startGame();
      expect(gi.isMatchOver()).toBe(false);
    });

    it('returns true when only one player alive', () => {
      const gi = createInstance();
      gi.startGame();
      gi.eliminatePlayer('p1');
      gi.eliminatePlayer('p2');
      expect(gi.isMatchOver()).toBe(true);
    });

    it('returns true for 2-player game when one eliminated', () => {
      const gi = new GameInstance('lobby-1', ['p1', 'p2']);
      gi.startGame();
      gi.eliminatePlayer('p1');
      expect(gi.isMatchOver()).toBe(true);
    });
  });

  describe('getWinner', () => {
    it('returns null when match is not over', () => {
      const gi = createInstance();
      gi.startGame();
      expect(gi.getWinner()).toBeNull();
    });

    it('returns the last alive player', () => {
      const gi = createInstance();
      gi.startGame();
      gi.eliminatePlayer('p1');
      gi.eliminatePlayer('p2');
      expect(gi.getWinner()).toBe('p3');
    });
  });

  describe('finishMatch', () => {
    it('sets status to finished', () => {
      const gi = createInstance();
      gi.startGame();
      gi.eliminatePlayer('p1');
      gi.eliminatePlayer('p2');
      gi.finishMatch();
      expect(gi.status).toBe('finished');
    });
  });

  describe('addGarbage', () => {
    it('adds garbage to player queue', () => {
      const gi = createInstance();
      gi.startGame();
      gi.addGarbage('p1', 4);
      expect(gi.getPlayer('p1')!.garbageQueue).toBe(4);
    });

    it('accumulates garbage', () => {
      const gi = createInstance();
      gi.startGame();
      gi.addGarbage('p1', 2);
      gi.addGarbage('p1', 3);
      expect(gi.getPlayer('p1')!.garbageQueue).toBe(5);
    });
  });

  describe('clearGarbage', () => {
    it('resets player garbage queue to zero', () => {
      const gi = createInstance();
      gi.startGame();
      gi.addGarbage('p1', 4);
      gi.clearGarbage('p1');
      expect(gi.getPlayer('p1')!.garbageQueue).toBe(0);
    });
  });

  describe('getRandomOpponent', () => {
    it('returns a different alive player', () => {
      const gi = createInstance();
      gi.startGame();
      const opponent = gi.getRandomOpponent('p1');
      expect(opponent).not.toBe('p1');
      expect(['p2', 'p3']).toContain(opponent);
    });

    it('returns null when no opponents alive', () => {
      const gi = new GameInstance('lobby-1', ['p1', 'p2']);
      gi.startGame();
      gi.eliminatePlayer('p2');
      const opponent = gi.getRandomOpponent('p1');
      expect(opponent).toBeNull();
    });
  });
});
