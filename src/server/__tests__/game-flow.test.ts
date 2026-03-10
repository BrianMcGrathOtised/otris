import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameManager, type GameEventSender } from '../game-manager';
import { LobbyManager } from '../lobby';

function createMockSender(): GameEventSender {
  return {
    sendToPlayer: vi.fn(),
    broadcastToGame: vi.fn(),
    getPlayerName: vi.fn((id: string) => `Player-${id}`),
  };
}

describe('game flow integration', () => {
  let lobbyManager: LobbyManager;
  let gameManager: GameManager;
  let sender: GameEventSender;

  beforeEach(() => {
    sender = createMockSender();
    lobbyManager = new LobbyManager();
    gameManager = new GameManager(sender);
  });

  it('full match lifecycle: create → start → eliminate → end → reset lobby', () => {
    // Setup lobby
    const lobby = lobbyManager.createLobby('host', 'Host')!;
    lobbyManager.joinLobby(lobby.id, 'p2', 'Player2');
    lobbyManager.toggleReady(lobby.id, 'host', true);
    lobbyManager.toggleReady(lobby.id, 'p2', true);
    lobbyManager.startGame(lobby.id, 'host');

    // Create game
    const game = gameManager.createGame(lobby.id, ['host', 'p2']);
    expect(game.status).toBe('countdown');

    // Start game
    gameManager.startGame(lobby.id);
    expect(game.status).toBe('playing');

    // Player sends lines
    gameManager.handleLinesCleared(lobby.id, 'host', 4);
    expect(sender.sendToPlayer).toHaveBeenCalledWith(
      'p2',
      expect.objectContaining({ type: 'garbage_received', lines: 4 }),
    );

    // Player2 dies
    gameManager.handlePlayerDead(lobby.id, 'p2');
    expect(game.status).toBe('finished');

    // Verify match end broadcast
    expect(sender.broadcastToGame).toHaveBeenCalledWith(
      lobby.id,
      expect.objectContaining({
        type: 'match_end',
        winnerId: 'host',
      }),
    );

    // Reset lobby after match
    lobby.status = 'waiting';
    for (const p of lobby.players) {
      p.ready = false;
    }
    expect(lobby.status).toBe('waiting');
    expect(lobby.players.every(p => !p.ready)).toBe(true);
  });

  it('handles player disconnect during game', () => {
    lobbyManager.createLobby('host', 'Host');
    const lobbyId = lobbyManager.getPlayerLobbyId('host')!;
    lobbyManager.joinLobby(lobbyId, 'p2', 'Player2');
    lobbyManager.joinLobby(lobbyId, 'p3', 'Player3');

    gameManager.createGame(lobbyId, ['host', 'p2', 'p3']);
    gameManager.startGame(lobbyId);

    // Player disconnects (treated as elimination)
    gameManager.handlePlayerDead(lobbyId, 'p2');
    const game = gameManager.getGame(lobbyId)!;
    expect(game.getAlivePlayers()).toEqual(['host', 'p3']);
    expect(game.status).toBe('playing');
  });
});
