import { describe, it, expect, beforeEach } from 'vitest';
import { LobbyManager } from '../lobby';
import { createDefaultLobbySettings } from '../../shared/types';

describe('LobbyManager', () => {
  let manager: LobbyManager;

  beforeEach(() => {
    manager = new LobbyManager();
  });

  describe('createLobby', () => {
    it('creates a lobby with host as first player', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      expect(lobby.hostId).toBe('p1');
      expect(lobby.players).toHaveLength(1);
      expect(lobby.players[0]).toEqual({ id: 'p1', name: 'Alice', ready: false });
      expect(lobby.status).toBe('waiting');
      expect(lobby.id).toBeTruthy();
    });

    it('generates unique lobby IDs', () => {
      const a = manager.createLobby('p1', 'Alice');
      const b = manager.createLobby('p2', 'Bob');
      expect(a.id).not.toBe(b.id);
    });

    it('uses default settings when none provided', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const defaults = createDefaultLobbySettings();
      expect(lobby.settings).toEqual(defaults);
    });

    it('merges partial settings with defaults', () => {
      const lobby = manager.createLobby('p1', 'Alice', { maxPlayers: 8, isPrivate: true, password: 'secret' });
      expect(lobby.settings.maxPlayers).toBe(8);
      expect(lobby.settings.isPrivate).toBe(true);
      expect(lobby.settings.password).toBe('secret');
      expect(lobby.settings.startingSpeed).toBe(1);
    });

    it('tracks player to lobby mapping', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      expect(manager.getPlayerLobbyId('p1')).toBe(lobby.id);
    });

    it('returns error if player is already in a lobby', () => {
      manager.createLobby('p1', 'Alice');
      const result = manager.createLobby('p1', 'Alice');
      expect(result).toBeNull();
    });
  });

  describe('joinLobby', () => {
    it('adds a player to an existing lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.joinLobby(lobby.id, 'p2', 'Bob');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby.players).toHaveLength(2);
        expect(result.lobby.players[1]).toEqual({ id: 'p2', name: 'Bob', ready: false });
      }
    });

    it('returns error for nonexistent lobby', () => {
      const result = manager.joinLobby('fake', 'p2', 'Bob');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('returns error when lobby is full', () => {
      const lobby = manager.createLobby('p1', 'Alice', { maxPlayers: 2 });
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.joinLobby(lobby.id, 'p3', 'Charlie');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('full');
      }
    });

    it('returns error when password is wrong for private lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'secret' });
      const result = manager.joinLobby(lobby.id, 'p2', 'Bob', 'wrong');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('password');
      }
    });

    it('allows join with correct password', () => {
      const lobby = manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'secret' });
      const result = manager.joinLobby(lobby.id, 'p2', 'Bob', 'secret');
      expect(result.success).toBe(true);
    });

    it('returns error when password is missing for private lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'secret' });
      const result = manager.joinLobby(lobby.id, 'p2', 'Bob');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('password');
      }
    });

    it('returns error if player is already in a lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.joinLobby(lobby.id, 'p2', 'Bob');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already');
      }
    });

    it('tracks player to lobby mapping after join', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      expect(manager.getPlayerLobbyId('p2')).toBe(lobby.id);
    });

    it('returns error when lobby is not in waiting status', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      // Manually set lobby to in_game to test
      const stored = manager.getLobby(lobby.id);
      if (stored) stored.status = 'in_game';
      const result = manager.joinLobby(lobby.id, 'p2', 'Bob');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('in progress');
      }
    });
  });

  describe('leaveLobby', () => {
    it('removes a player from the lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.leaveLobby(lobby.id, 'p2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby!.players).toHaveLength(1);
        expect(result.lobby!.players[0]!.id).toBe('p1');
      }
    });

    it('transfers host when host leaves', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.leaveLobby(lobby.id, 'p1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby!.hostId).toBe('p2');
        expect(result.newHostId).toBe('p2');
      }
    });

    it('deletes lobby when last player leaves', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.leaveLobby(lobby.id, 'p1');
      expect(result.success).toBe(true);
      expect(result.lobby).toBeNull();
      expect(manager.getLobby(lobby.id)).toBeUndefined();
    });

    it('clears player to lobby mapping', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.leaveLobby(lobby.id, 'p1');
      expect(manager.getPlayerLobbyId('p1')).toBeUndefined();
    });

    it('returns error for nonexistent lobby', () => {
      const result = manager.leaveLobby('fake', 'p1');
      expect(result.success).toBe(false);
    });

    it('returns error if player is not in the lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.leaveLobby(lobby.id, 'p99');
      expect(result.success).toBe(false);
    });
  });

  describe('kickPlayer', () => {
    it('allows host to kick a player', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.kickPlayer(lobby.id, 'p1', 'p2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby.players).toHaveLength(1);
      }
    });

    it('rejects kick from non-host', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.kickPlayer(lobby.id, 'p2', 'p1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('host');
      }
    });

    it('rejects kicking self', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.kickPlayer(lobby.id, 'p1', 'p1');
      expect(result.success).toBe(false);
    });

    it('rejects kicking player not in lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.kickPlayer(lobby.id, 'p1', 'p99');
      expect(result.success).toBe(false);
    });

    it('clears kicked player mapping', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.kickPlayer(lobby.id, 'p1', 'p2');
      expect(manager.getPlayerLobbyId('p2')).toBeUndefined();
    });
  });

  describe('updateSettings', () => {
    it('allows host to update settings', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.updateSettings(lobby.id, 'p1', { maxPlayers: 8 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby.settings.maxPlayers).toBe(8);
        expect(result.lobby.settings.startingSpeed).toBe(1);
      }
    });

    it('rejects settings change from non-host', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.updateSettings(lobby.id, 'p2', { maxPlayers: 8 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('host');
      }
    });

    it('returns error for nonexistent lobby', () => {
      const result = manager.updateSettings('fake', 'p1', { maxPlayers: 8 });
      expect(result.success).toBe(false);
    });
  });

  describe('transferHost', () => {
    it('allows host to transfer host role', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.transferHost(lobby.id, 'p1', 'p2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby.hostId).toBe('p2');
      }
    });

    it('rejects transfer from non-host', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.transferHost(lobby.id, 'p2', 'p1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('host');
      }
    });

    it('rejects transfer to player not in lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.transferHost(lobby.id, 'p1', 'p99');
      expect(result.success).toBe(false);
    });

    it('rejects transfer to self', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.transferHost(lobby.id, 'p1', 'p1');
      expect(result.success).toBe(false);
    });
  });

  describe('getLobby', () => {
    it('returns lobby by id', () => {
      const created = manager.createLobby('p1', 'Alice');
      const lobby = manager.getLobby(created.id);
      expect(lobby).toBeDefined();
      expect(lobby!.id).toBe(created.id);
    });

    it('returns undefined for nonexistent lobby', () => {
      expect(manager.getLobby('fake')).toBeUndefined();
    });
  });

  describe('listPublicLobbies', () => {
    it('lists only public lobbies', () => {
      manager.createLobby('p1', 'Alice');
      manager.createLobby('p2', 'Bob', { isPrivate: true, password: 'secret' });
      manager.createLobby('p3', 'Charlie');
      const list = manager.listPublicLobbies();
      expect(list).toHaveLength(2);
    });

    it('returns lobby summary format', () => {
      manager.createLobby('p1', 'Alice');
      const list = manager.listPublicLobbies();
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(expect.objectContaining({
        hostName: 'Alice',
        playerCount: 1,
        maxPlayers: 4,
        status: 'waiting',
        isPrivate: false,
      }));
      expect(list[0]!.id).toBeTruthy();
    });

    it('returns empty array when no public lobbies exist', () => {
      const list = manager.listPublicLobbies();
      expect(list).toHaveLength(0);
    });
  });

  describe('getPlayerLobbyId', () => {
    it('returns undefined for player not in any lobby', () => {
      expect(manager.getPlayerLobbyId('unknown')).toBeUndefined();
    });
  });

  describe('toggleReady', () => {
    it('toggles a player ready state to true', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const result = manager.toggleReady(lobby.id, 'p2', true);
      expect(result.success).toBe(true);
      if (result.success) {
        const player = result.lobby.players.find(p => p.id === 'p2');
        expect(player!.ready).toBe(true);
      }
    });

    it('toggles a player ready state to false', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.toggleReady(lobby.id, 'p2', true);
      const result = manager.toggleReady(lobby.id, 'p2', false);
      expect(result.success).toBe(true);
      if (result.success) {
        const player = result.lobby.players.find(p => p.id === 'p2');
        expect(player!.ready).toBe(false);
      }
    });

    it('returns error for nonexistent lobby', () => {
      const result = manager.toggleReady('fake', 'p1', true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('returns error if player is not in the lobby', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.toggleReady(lobby.id, 'p99', true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not in lobby');
      }
    });
  });

  describe('areAllReady', () => {
    it('returns false when not all players are ready', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      expect(manager.areAllReady(lobby.id)).toBe(false);
    });

    it('returns true when all players are ready', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.toggleReady(lobby.id, 'p1', true);
      manager.toggleReady(lobby.id, 'p2', true);
      expect(manager.areAllReady(lobby.id)).toBe(true);
    });

    it('returns false for nonexistent lobby', () => {
      expect(manager.areAllReady('fake')).toBe(false);
    });

    it('returns true for single player who is ready', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.toggleReady(lobby.id, 'p1', true);
      expect(manager.areAllReady(lobby.id)).toBe(true);
    });
  });

  describe('startGame', () => {
    it('allows host to start when all players are ready', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.toggleReady(lobby.id, 'p1', true);
      manager.toggleReady(lobby.id, 'p2', true);
      const result = manager.startGame(lobby.id, 'p1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby.status).toBe('starting');
      }
    });

    it('rejects start from non-host', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.toggleReady(lobby.id, 'p1', true);
      manager.toggleReady(lobby.id, 'p2', true);
      const result = manager.startGame(lobby.id, 'p2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('host');
      }
    });

    it('rejects start when not all players are ready', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.toggleReady(lobby.id, 'p1', true);
      const result = manager.startGame(lobby.id, 'p1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('ready');
      }
    });

    it('allows host override with 2+ players even if not all ready', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.toggleReady(lobby.id, 'p1', true);
      // p2 not ready, but host can force start with 2+ players
      const result = manager.startGame(lobby.id, 'p1', true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.lobby.status).toBe('starting');
      }
    });

    it('rejects host override with only 1 player', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.startGame(lobby.id, 'p1', true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('2');
      }
    });

    it('returns error for nonexistent lobby', () => {
      const result = manager.startGame('fake', 'p1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('rejects start when lobby is not in waiting status', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      manager.toggleReady(lobby.id, 'p1', true);
      manager.toggleReady(lobby.id, 'p2', true);
      manager.startGame(lobby.id, 'p1');
      // Try starting again
      const result = manager.startGame(lobby.id, 'p1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not in waiting');
      }
    });
  });

  describe('disconnect cleanup', () => {
    it('removes player from lobby on disconnect', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      manager.joinLobby(lobby.id, 'p2', 'Bob');
      const lobbyId = manager.getPlayerLobbyId('p2');
      expect(lobbyId).toBe(lobby.id);
      const result = manager.removePlayer('p2');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.lobby!.players).toHaveLength(1);
      }
      expect(manager.getPlayerLobbyId('p2')).toBeUndefined();
    });

    it('returns null if player is not in any lobby', () => {
      const result = manager.removePlayer('unknown');
      expect(result).toBeNull();
    });

    it('deletes lobby if last player disconnects', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.removePlayer('p1');
      expect(result).not.toBeNull();
      expect(result!.lobby).toBeNull();
      expect(manager.getLobby(lobby.id)).toBeUndefined();
    });
  });
});
