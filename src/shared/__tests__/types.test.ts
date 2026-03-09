import { describe, it, expect } from 'vitest';
import {
  createDefaultLobbySettings,
  type Player,
  type Lobby,
  type LobbySettings,
} from '../types';

describe('shared types', () => {
  describe('createDefaultLobbySettings', () => {
    it('returns default lobby settings', () => {
      const settings = createDefaultLobbySettings();
      expect(settings.maxPlayers).toBe(4);
      expect(settings.startingSpeed).toBe(1);
      expect(settings.countdownTimer).toBe(3);
      expect(settings.isPrivate).toBe(false);
      expect(settings.password).toBe('');
    });

    it('returns a new object each call', () => {
      const a = createDefaultLobbySettings();
      const b = createDefaultLobbySettings();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe('type contracts', () => {
    it('Player has required fields', () => {
      const player: Player = { id: 'p1', name: 'Alice', ready: false };
      expect(player.id).toBe('p1');
      expect(player.name).toBe('Alice');
      expect(player.ready).toBe(false);
    });

    it('Lobby has required fields', () => {
      const lobby: Lobby = {
        id: 'lobby1',
        hostId: 'p1',
        players: [{ id: 'p1', name: 'Alice', ready: true }],
        settings: createDefaultLobbySettings(),
        status: 'waiting',
      };
      expect(lobby.id).toBe('lobby1');
      expect(lobby.hostId).toBe('p1');
      expect(lobby.players).toHaveLength(1);
      expect(lobby.status).toBe('waiting');
    });

    it('LobbySettings has all fields', () => {
      const settings: LobbySettings = {
        maxPlayers: 8,
        startingSpeed: 2,
        countdownTimer: 5,
        isPrivate: true,
        password: 'secret',
      };
      expect(settings.maxPlayers).toBe(8);
      expect(settings.isPrivate).toBe(true);
    });
  });
});
