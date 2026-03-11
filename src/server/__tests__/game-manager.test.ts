import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameManager, type GameEventSender } from '../game-manager';

function createMockSender(): GameEventSender {
  return {
    sendToPlayer: vi.fn(),
    broadcastToGame: vi.fn(),
    getPlayerName: vi.fn((id: string) => `Player-${id}`),
  };
}

describe('GameManager', () => {
  let gm: GameManager;
  let sender: GameEventSender;

  beforeEach(() => {
    sender = createMockSender();
    gm = new GameManager(sender);
  });

  describe('createGame', () => {
    it('creates a game instance for a lobby', () => {
      gm.createGame('lobby-1', ['p1', 'p2']);
      expect(gm.getGame('lobby-1')).toBeDefined();
    });

    it('sets game status to countdown', () => {
      gm.createGame('lobby-1', ['p1', 'p2']);
      expect(gm.getGame('lobby-1')!.status).toBe('countdown');
    });
  });

  describe('startGame', () => {
    it('transitions game to playing status', () => {
      gm.createGame('lobby-1', ['p1', 'p2']);
      gm.startGame('lobby-1');
      expect(gm.getGame('lobby-1')!.status).toBe('playing');
    });

    it('broadcasts game_started to all players', () => {
      gm.createGame('lobby-1', ['p1', 'p2']);
      gm.startGame('lobby-1');
      expect(sender.broadcastToGame).toHaveBeenCalledWith(
        'lobby-1',
        { type: 'game_started' },
      );
    });
  });

  describe('handleLinesCleared', () => {
    beforeEach(() => {
      gm.createGame('lobby-1', ['p1', 'p2', 'p3']);
      gm.startGame('lobby-1');
    });

    it('does nothing for 1 line (0 garbage)', () => {
      gm.handleLinesCleared('lobby-1', 'p1', 1);
      expect(sender.sendToPlayer).not.toHaveBeenCalled();
    });

    it('sends garbage to a random opponent for 2+ lines', () => {
      gm.handleLinesCleared('lobby-1', 'p1', 4);
      // Should have sent garbage_received to someone
      expect(sender.sendToPlayer).toHaveBeenCalled();
      const call = (sender.sendToPlayer as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[1].type).toBe('garbage_received');
      expect(call[1].lines).toBe(4);
      expect(call[1].fromPlayerId).toBe('p1');
      // Target should not be the sender
      expect(call[0]).not.toBe('p1');
    });
  });

  describe('handlePlayerDead', () => {
    beforeEach(() => {
      gm.createGame('lobby-1', ['p1', 'p2', 'p3']);
      gm.startGame('lobby-1');
    });

    it('eliminates the player and broadcasts', () => {
      gm.handlePlayerDead('lobby-1', 'p1');
      expect(sender.broadcastToGame).toHaveBeenCalledWith(
        'lobby-1',
        expect.objectContaining({
          type: 'player_eliminated',
          playerId: 'p1',
          placement: 3,
        }),
      );
    });

    it('ends match when one player remains', () => {
      gm.handlePlayerDead('lobby-1', 'p1');
      gm.handlePlayerDead('lobby-1', 'p2');
      expect(sender.broadcastToGame).toHaveBeenCalledWith(
        'lobby-1',
        expect.objectContaining({
          type: 'match_end',
          winnerId: 'p3',
        }),
      );
    });

    it('sets game status to finished on match end', () => {
      gm.handlePlayerDead('lobby-1', 'p1');
      gm.handlePlayerDead('lobby-1', 'p2');
      expect(gm.getGame('lobby-1')!.status).toBe('finished');
    });

    it('does not end match with 2+ alive', () => {
      gm.handlePlayerDead('lobby-1', 'p1');
      const game = gm.getGame('lobby-1')!;
      expect(game.status).toBe('playing');
    });
  });

  describe('removeGame', () => {
    it('removes a game instance', () => {
      gm.createGame('lobby-1', ['p1', 'p2']);
      gm.removeGame('lobby-1');
      expect(gm.getGame('lobby-1')).toBeUndefined();
    });
  });

  describe('handleBoardUpdate', () => {
    beforeEach(() => {
      gm.createGame('lobby-1', ['p1', 'p2', 'p3']);
      gm.startGame('lobby-1');
    });

    it('broadcasts opponent_board to all other players in the game', () => {
      const board = [[0, 0], [1, 1]];
      gm.handleBoardUpdate('lobby-1', 'p1', board);
      expect(sender.broadcastToGame).toHaveBeenCalledWith(
        'lobby-1',
        expect.objectContaining({
          type: 'opponent_board',
          playerId: 'p1',
          board,
          alive: true,
        }),
        'p1',
      );
    });

    it('includes player name in the broadcast', () => {
      const board = [[0]];
      gm.handleBoardUpdate('lobby-1', 'p1', board);
      const call = (sender.broadcastToGame as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => (c[1] as { type: string }).type === 'opponent_board',
      );
      expect(call).toBeDefined();
      expect(call![1].playerName).toBe('Player-p1');
    });

    it('reports alive=false for eliminated player', () => {
      gm.handlePlayerDead('lobby-1', 'p1');
      const board = [[0]];
      gm.handleBoardUpdate('lobby-1', 'p1', board);
      const call = (sender.broadcastToGame as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => (c[1] as { type: string }).type === 'opponent_board',
      );
      expect(call).toBeDefined();
      expect(call![1].alive).toBe(false);
    });

    it('does nothing if game does not exist', () => {
      const callsBefore = (sender.broadcastToGame as ReturnType<typeof vi.fn>).mock.calls.length;
      gm.handleBoardUpdate('no-lobby', 'p1', [[0]]);
      expect((sender.broadcastToGame as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore);
    });

    it('does nothing if game is not playing', () => {
      gm.createGame('lobby-2', ['p4', 'p5']);
      // game is in countdown, not playing
      const callsBefore = (sender.broadcastToGame as ReturnType<typeof vi.fn>).mock.calls.length;
      gm.handleBoardUpdate('lobby-2', 'p4', [[0]]);
      expect((sender.broadcastToGame as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore);
    });
  });

  describe('getGameByPlayer', () => {
    it('finds game by player ID', () => {
      gm.createGame('lobby-1', ['p1', 'p2']);
      expect(gm.getGameByPlayer('p1')).toBeDefined();
      expect(gm.getGameByPlayer('p1')!.lobbyId).toBe('lobby-1');
    });

    it('returns undefined for unknown player', () => {
      expect(gm.getGameByPlayer('unknown')).toBeUndefined();
    });
  });
});
