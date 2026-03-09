import { describe, it, expect, beforeEach } from 'vitest';
import { LobbyManager } from '../lobby';

describe('Lobby visibility and password flow', () => {
  let manager: LobbyManager;

  beforeEach(() => {
    manager = new LobbyManager();
  });

  describe('public/private listing', () => {
    it('public lobbies appear in listing', () => {
      manager.createLobby('p1', 'Alice');
      const list = manager.listPublicLobbies();
      expect(list).toHaveLength(1);
      expect(list[0]!.hostName).toBe('Alice');
    });

    it('private lobbies do NOT appear in listing', () => {
      manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'secret' });
      const list = manager.listPublicLobbies();
      expect(list).toHaveLength(0);
    });

    it('mixed public/private lobbies only shows public', () => {
      manager.createLobby('p1', 'Alice');
      manager.createLobby('p2', 'Bob', { isPrivate: true, password: 'pw' });
      manager.createLobby('p3', 'Charlie');
      manager.createLobby('p4', 'Diana', { isPrivate: true, password: 'pw2' });
      const list = manager.listPublicLobbies();
      expect(list).toHaveLength(2);
      const names = list.map(l => l.hostName);
      expect(names).toContain('Alice');
      expect(names).toContain('Charlie');
      expect(names).not.toContain('Bob');
      expect(names).not.toContain('Diana');
    });

    it('private lobbies are joinable by ID with correct password', () => {
      const lobby = manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'secret' });
      const result = manager.joinLobby(lobby!.id, 'p2', 'Bob', 'secret');
      expect(result.success).toBe(true);
    });

    it('private lobbies reject join without password', () => {
      const lobby = manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'secret' });
      const result = manager.joinLobby(lobby!.id, 'p2', 'Bob');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('password');
      }
    });

    it('private lobbies reject join with wrong password', () => {
      const lobby = manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'secret' });
      const result = manager.joinLobby(lobby!.id, 'p2', 'Bob', 'wrong');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('password');
      }
    });

    it('public lobbies do not require password', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const result = manager.joinLobby(lobby!.id, 'p2', 'Bob');
      expect(result.success).toBe(true);
    });
  });

  describe('error states', () => {
    it('returns lobby full error', () => {
      const lobby = manager.createLobby('p1', 'Alice', { maxPlayers: 2 });
      manager.joinLobby(lobby!.id, 'p2', 'Bob');
      const result = manager.joinLobby(lobby!.id, 'p3', 'Charlie');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('full');
      }
    });

    it('returns lobby not found error', () => {
      const result = manager.joinLobby('nonexistent', 'p1', 'Alice');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('returns game in progress error', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      const stored = manager.getLobby(lobby!.id);
      if (stored) stored.status = 'in_game';
      const result = manager.joinLobby(lobby!.id, 'p2', 'Bob');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('in progress');
      }
    });

    it('updating lobby from public to private hides it from listing', () => {
      const lobby = manager.createLobby('p1', 'Alice');
      expect(manager.listPublicLobbies()).toHaveLength(1);
      manager.updateSettings(lobby!.id, 'p1', { isPrivate: true, password: 'pw' });
      expect(manager.listPublicLobbies()).toHaveLength(0);
    });

    it('updating lobby from private to public shows it in listing', () => {
      const lobby = manager.createLobby('p1', 'Alice', { isPrivate: true, password: 'pw' });
      expect(manager.listPublicLobbies()).toHaveLength(0);
      manager.updateSettings(lobby!.id, 'p1', { isPrivate: false });
      expect(manager.listPublicLobbies()).toHaveLength(1);
    });
  });
});
