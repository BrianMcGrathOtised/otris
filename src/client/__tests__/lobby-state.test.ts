import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  setPlayerId,
  setPlayerName,
  setScreen,
  updateLobby,
  clearLobby,
  returnToLobby,
  addChatMessage,
  updateLobbyList,
  setError,
  clearError,
  isHost,
  getOwnPlayer,
} from '../lobby-state';
import type { Lobby } from '../../shared/types';
import type { ChatMessageEvent, LobbyListEvent } from '../../shared/protocol';

function makeLobby(overrides: Partial<Lobby> = {}): Lobby {
  return {
    id: 'lobby1',
    hostId: 'player1',
    players: [
      { id: 'player1', name: 'Alice', ready: false },
      { id: 'player2', name: 'Bob', ready: true },
    ],
    settings: {
      maxPlayers: 4,
      startingSpeed: 1,
      countdownTimer: 3,
      isPrivate: false,
      password: '',
    },
    status: 'waiting',
    ...overrides,
  };
}

describe('lobby-state', () => {
  describe('createInitialState', () => {
    it('returns the correct initial state', () => {
      const state = createInitialState();
      expect(state.screen).toBe('menu');
      expect(state.playerId).toBeNull();
      expect(state.playerName).toBe('');
      expect(state.lobby).toBeNull();
      expect(state.chatMessages).toEqual([]);
      expect(state.lobbyList).toEqual([]);
      expect(state.errorMessage).toBeNull();
    });
  });

  describe('setPlayerId', () => {
    it('sets the player ID', () => {
      const state = createInitialState();
      const next = setPlayerId(state, 'abc-123');
      expect(next.playerId).toBe('abc-123');
      // original unchanged
      expect(state.playerId).toBeNull();
    });
  });

  describe('setPlayerName', () => {
    it('sets the player name', () => {
      const state = createInitialState();
      const next = setPlayerName(state, 'Alice');
      expect(next.playerName).toBe('Alice');
    });
  });

  describe('setScreen', () => {
    it('changes the current screen', () => {
      const state = createInitialState();
      expect(setScreen(state, 'create').screen).toBe('create');
      expect(setScreen(state, 'lobby').screen).toBe('lobby');
      expect(setScreen(state, 'menu').screen).toBe('menu');
    });
  });

  describe('updateLobby', () => {
    it('sets lobby and switches screen to lobby', () => {
      const state = createInitialState();
      const lobby = makeLobby();
      const next = updateLobby(state, lobby);
      expect(next.lobby).toBe(lobby);
      expect(next.screen).toBe('lobby');
    });
  });

  describe('clearLobby', () => {
    it('clears lobby, chat, and returns to menu', () => {
      let state = createInitialState();
      state = updateLobby(state, makeLobby());
      state = addChatMessage(state, {
        type: 'chat_message',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'hi',
        timestamp: 1000,
      });
      const next = clearLobby(state);
      expect(next.lobby).toBeNull();
      expect(next.chatMessages).toEqual([]);
      expect(next.screen).toBe('menu');
    });

    it('preserves playerName when clearing lobby', () => {
      let state = createInitialState();
      state = setPlayerName(state, 'Alice');
      state = updateLobby(state, makeLobby());
      const next = clearLobby(state);
      expect(next.playerName).toBe('Alice');
    });
  });

  describe('returnToLobby', () => {
    it('clears chat but keeps lobby and stays on lobby screen', () => {
      let state = createInitialState();
      state = setPlayerName(state, 'Alice');
      state = updateLobby(state, makeLobby());
      state = addChatMessage(state, {
        type: 'chat_message',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'hi',
        timestamp: 1000,
      });
      const next = returnToLobby(state);
      expect(next.lobby).not.toBeNull();
      expect(next.screen).toBe('lobby');
      expect(next.chatMessages).toEqual([]);
      expect(next.playerName).toBe('Alice');
    });

    it('falls back to menu screen if no lobby exists', () => {
      let state = createInitialState();
      state = setPlayerName(state, 'Alice');
      const next = returnToLobby(state);
      expect(next.screen).toBe('menu');
      expect(next.playerName).toBe('Alice');
    });
  });

  describe('addChatMessage', () => {
    it('appends a chat message', () => {
      const state = createInitialState();
      const event: ChatMessageEvent = {
        type: 'chat_message',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'hello',
        timestamp: 12345,
      };
      const next = addChatMessage(state, event);
      expect(next.chatMessages).toHaveLength(1);
      expect(next.chatMessages[0]).toEqual({
        playerId: 'p1',
        playerName: 'Alice',
        message: 'hello',
        timestamp: 12345,
      });
    });

    it('preserves existing messages', () => {
      let state = createInitialState();
      state = addChatMessage(state, {
        type: 'chat_message',
        playerId: 'p1',
        playerName: 'Alice',
        message: 'first',
        timestamp: 1,
      });
      state = addChatMessage(state, {
        type: 'chat_message',
        playerId: 'p2',
        playerName: 'Bob',
        message: 'second',
        timestamp: 2,
      });
      expect(state.chatMessages).toHaveLength(2);
      expect(state.chatMessages[0]!.message).toBe('first');
      expect(state.chatMessages[1]!.message).toBe('second');
    });
  });

  describe('updateLobbyList', () => {
    it('replaces the lobby list', () => {
      const state = createInitialState();
      const event: LobbyListEvent = {
        type: 'lobby_list',
        lobbies: [
          { id: 'a', hostName: 'Alice', playerCount: 2, maxPlayers: 4, status: 'waiting', isPrivate: false },
        ],
      };
      const next = updateLobbyList(state, event);
      expect(next.lobbyList).toHaveLength(1);
      expect(next.lobbyList[0]!.id).toBe('a');
    });
  });

  describe('setError / clearError', () => {
    it('sets and clears error messages', () => {
      let state = createInitialState();
      state = setError(state, 'Something went wrong');
      expect(state.errorMessage).toBe('Something went wrong');
      state = clearError(state);
      expect(state.errorMessage).toBeNull();
    });
  });

  describe('isHost', () => {
    it('returns true when the player is the host', () => {
      let state = createInitialState();
      state = setPlayerId(state, 'player1');
      state = updateLobby(state, makeLobby({ hostId: 'player1' }));
      expect(isHost(state)).toBe(true);
    });

    it('returns false when the player is not the host', () => {
      let state = createInitialState();
      state = setPlayerId(state, 'player2');
      state = updateLobby(state, makeLobby({ hostId: 'player1' }));
      expect(isHost(state)).toBe(false);
    });

    it('returns false when there is no lobby', () => {
      const state = createInitialState();
      expect(isHost(state)).toBe(false);
    });
  });

  describe('getOwnPlayer', () => {
    it('returns the player object for the current player', () => {
      let state = createInitialState();
      state = setPlayerId(state, 'player2');
      state = updateLobby(state, makeLobby());
      const player = getOwnPlayer(state);
      expect(player).not.toBeNull();
      expect(player!.name).toBe('Bob');
    });

    it('returns null when not in a lobby', () => {
      const state = createInitialState();
      expect(getOwnPlayer(state)).toBeNull();
    });

    it('returns null when player ID not found in lobby', () => {
      let state = createInitialState();
      state = setPlayerId(state, 'nobody');
      state = updateLobby(state, makeLobby());
      expect(getOwnPlayer(state)).toBeNull();
    });
  });
});
