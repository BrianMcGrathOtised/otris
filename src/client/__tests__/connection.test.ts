import { describe, it, expect } from 'vitest';
import { parseServerEvent } from '../connection';

describe('connection', () => {
  describe('parseServerEvent', () => {
    it('parses a valid welcome event', () => {
      const event = parseServerEvent(JSON.stringify({ type: 'welcome', playerId: 'abc' }));
      expect(event).not.toBeNull();
      expect(event!.type).toBe('welcome');
      if (event && event.type === 'welcome') {
        expect(event.playerId).toBe('abc');
      }
    });

    it('parses a valid lobby_update event', () => {
      const event = parseServerEvent(
        JSON.stringify({
          type: 'lobby_update',
          lobby: {
            id: 'l1',
            hostId: 'p1',
            players: [],
            settings: { maxPlayers: 4, startingSpeed: 1, countdownTimer: 3, isPrivate: false, password: '' },
            status: 'waiting',
          },
        }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('lobby_update');
    });

    it('parses a valid chat_message event', () => {
      const event = parseServerEvent(
        JSON.stringify({
          type: 'chat_message',
          playerId: 'p1',
          playerName: 'Alice',
          message: 'hello',
          timestamp: 12345,
        }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('chat_message');
    });

    it('parses a valid error event', () => {
      const event = parseServerEvent(
        JSON.stringify({ type: 'error', message: 'Something failed' }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('error');
    });

    it('parses a valid lobby_list event', () => {
      const event = parseServerEvent(
        JSON.stringify({ type: 'lobby_list', lobbies: [] }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('lobby_list');
    });

    it('parses a valid game_starting event', () => {
      const event = parseServerEvent(
        JSON.stringify({ type: 'game_starting', countdown: 3 }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('game_starting');
    });

    it('parses player_joined and player_left events', () => {
      const joined = parseServerEvent(
        JSON.stringify({ type: 'player_joined', player: { id: 'p1', name: 'Alice', ready: false } }),
      );
      expect(joined).not.toBeNull();
      expect(joined!.type).toBe('player_joined');

      const left = parseServerEvent(
        JSON.stringify({ type: 'player_left', playerId: 'p1' }),
      );
      expect(left).not.toBeNull();
      expect(left!.type).toBe('player_left');
    });

    it('returns null for invalid JSON', () => {
      expect(parseServerEvent('not json')).toBeNull();
    });

    it('returns null for non-object JSON', () => {
      expect(parseServerEvent('"string"')).toBeNull();
      expect(parseServerEvent('42')).toBeNull();
      expect(parseServerEvent('null')).toBeNull();
    });

    it('returns null when type field is missing', () => {
      expect(parseServerEvent(JSON.stringify({ foo: 'bar' }))).toBeNull();
    });

    it('returns null when type is not a string', () => {
      expect(parseServerEvent(JSON.stringify({ type: 42 }))).toBeNull();
    });

    it('returns null for unknown event types', () => {
      expect(parseServerEvent(JSON.stringify({ type: 'unknown_event' }))).toBeNull();
    });

    it('returns null for client event types', () => {
      expect(parseServerEvent(JSON.stringify({ type: 'create_lobby' }))).toBeNull();
      expect(parseServerEvent(JSON.stringify({ type: 'set_name' }))).toBeNull();
    });
  });
});
