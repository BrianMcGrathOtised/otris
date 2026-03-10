import { describe, it, expect } from 'vitest';
import {
  isValidClientEventType,
  isValidServerEventType,
  parseClientEvent,
  type ClientEvent,
  type ServerEvent,
} from '../protocol';

describe('protocol validation', () => {
  describe('isValidClientEventType', () => {
    const validTypes: ClientEvent['type'][] = [
      'create_lobby',
      'join_lobby',
      'leave_lobby',
      'player_ready',
      'start_game',
      'send_chat',
      'kick_player',
      'change_settings',
      'transfer_host',
      'list_lobbies',
      'set_name',
      'lines_cleared',
      'player_dead',
    ];

    it.each(validTypes)('accepts valid client event type: %s', (type) => {
      expect(isValidClientEventType(type)).toBe(true);
    });

    it('rejects unknown event types', () => {
      expect(isValidClientEventType('unknown')).toBe(false);
      expect(isValidClientEventType('')).toBe(false);
    });

    it('rejects server event types', () => {
      expect(isValidClientEventType('welcome')).toBe(false);
      expect(isValidClientEventType('lobby_update')).toBe(false);
    });
  });

  describe('isValidServerEventType', () => {
    const validTypes: ServerEvent['type'][] = [
      'lobby_update',
      'player_joined',
      'player_left',
      'chat_message',
      'game_starting',
      'error',
      'lobby_list',
      'welcome',
      'garbage_received',
      'player_eliminated',
      'match_end',
      'countdown_tick',
      'game_started',
    ];

    it.each(validTypes)('accepts valid server event type: %s', (type) => {
      expect(isValidServerEventType(type)).toBe(true);
    });

    it('rejects unknown event types', () => {
      expect(isValidServerEventType('unknown')).toBe(false);
    });

    it('rejects client event types', () => {
      expect(isValidServerEventType('create_lobby')).toBe(false);
    });
  });

  describe('parseClientEvent', () => {
    it('parses a valid create_lobby event', () => {
      const event = parseClientEvent(JSON.stringify({ type: 'create_lobby' }));
      expect(event).not.toBeNull();
      expect(event!.type).toBe('create_lobby');
    });

    it('parses a join_lobby event with lobbyId', () => {
      const event = parseClientEvent(
        JSON.stringify({ type: 'join_lobby', lobbyId: 'abc123' }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('join_lobby');
      if (event!.type === 'join_lobby') {
        expect(event.lobbyId).toBe('abc123');
      }
    });

    it('parses a send_chat event with message', () => {
      const event = parseClientEvent(
        JSON.stringify({ type: 'send_chat', message: 'hello' }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('send_chat');
    });

    it('parses a set_name event', () => {
      const event = parseClientEvent(
        JSON.stringify({ type: 'set_name', name: 'Alice' }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('set_name');
    });

    it('parses a lines_cleared event', () => {
      const event = parseClientEvent(
        JSON.stringify({ type: 'lines_cleared', count: 4 }),
      );
      expect(event).not.toBeNull();
      expect(event!.type).toBe('lines_cleared');
    });

    it('parses a player_dead event', () => {
      const event = parseClientEvent(JSON.stringify({ type: 'player_dead' }));
      expect(event).not.toBeNull();
      expect(event!.type).toBe('player_dead');
    });

    it('returns null for invalid JSON', () => {
      expect(parseClientEvent('not json')).toBeNull();
    });

    it('returns null for non-object JSON', () => {
      expect(parseClientEvent('"string"')).toBeNull();
      expect(parseClientEvent('42')).toBeNull();
      expect(parseClientEvent('null')).toBeNull();
    });

    it('returns null when type field is missing', () => {
      expect(parseClientEvent(JSON.stringify({ foo: 'bar' }))).toBeNull();
    });

    it('returns null when type is not a string', () => {
      expect(parseClientEvent(JSON.stringify({ type: 42 }))).toBeNull();
    });

    it('returns null for unknown event types', () => {
      expect(
        parseClientEvent(JSON.stringify({ type: 'unknown_event' })),
      ).toBeNull();
    });

    it('returns null for server event types', () => {
      expect(
        parseClientEvent(JSON.stringify({ type: 'welcome' })),
      ).toBeNull();
    });
  });
});
