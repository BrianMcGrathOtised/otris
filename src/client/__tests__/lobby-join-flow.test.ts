import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  setPlayerId,
  setScreen,
  updateLobby,
  updateLobbyList,
  setError,
  clearError,
  setJoinTargetLobbyId,
  setPasswordPromptVisible,
  clearPasswordPrompt,
  type LobbyState,
} from '../lobby-state';
import type { Lobby } from '../../shared/types';
import type { LobbyListEvent } from '../../shared/protocol';

function makeLobby(overrides: Partial<Lobby> = {}): Lobby {
  return {
    id: 'lobby1',
    hostId: 'player1',
    players: [{ id: 'player1', name: 'Alice', ready: false }],
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

describe('lobby join flow state', () => {
  describe('join by ID', () => {
    it('initial state has no join target lobby ID', () => {
      const state = createInitialState();
      expect(state.joinTargetLobbyId).toBeNull();
    });

    it('setJoinTargetLobbyId stores lobby ID for join', () => {
      const state = createInitialState();
      const next = setJoinTargetLobbyId(state, 'abc123');
      expect(next.joinTargetLobbyId).toBe('abc123');
    });

    it('setJoinTargetLobbyId clears when set to null', () => {
      let state = createInitialState();
      state = setJoinTargetLobbyId(state, 'abc123');
      const next = setJoinTargetLobbyId(state, null);
      expect(next.joinTargetLobbyId).toBeNull();
    });
  });

  describe('password prompt', () => {
    it('initial state has password prompt not visible', () => {
      const state = createInitialState();
      expect(state.passwordPromptVisible).toBe(false);
    });

    it('setPasswordPromptVisible shows the prompt', () => {
      const state = createInitialState();
      const next = setPasswordPromptVisible(state, true);
      expect(next.passwordPromptVisible).toBe(true);
    });

    it('clearPasswordPrompt hides the prompt and clears target', () => {
      let state = createInitialState();
      state = setJoinTargetLobbyId(state, 'lobby1');
      state = setPasswordPromptVisible(state, true);
      const next = clearPasswordPrompt(state);
      expect(next.passwordPromptVisible).toBe(false);
      expect(next.joinTargetLobbyId).toBeNull();
    });
  });

  describe('error display for join failures', () => {
    it('setError stores error for wrong password', () => {
      const state = createInitialState();
      const next = setError(state, 'Incorrect password');
      expect(next.errorMessage).toBe('Incorrect password');
    });

    it('setError stores error for lobby full', () => {
      const state = createInitialState();
      const next = setError(state, 'Lobby is full');
      expect(next.errorMessage).toBe('Lobby is full');
    });

    it('setError stores error for lobby not found', () => {
      const state = createInitialState();
      const next = setError(state, 'Lobby not found');
      expect(next.errorMessage).toBe('Lobby not found');
    });

    it('clearError removes the error message', () => {
      let state = createInitialState();
      state = setError(state, 'Some error');
      const next = clearError(state);
      expect(next.errorMessage).toBeNull();
    });
  });

  describe('lobby list filtering', () => {
    it('lobby list only contains entries from server (already filtered)', () => {
      const state = createInitialState();
      const event: LobbyListEvent = {
        type: 'lobby_list',
        lobbies: [
          { id: 'pub1', hostName: 'Alice', playerCount: 2, maxPlayers: 4, status: 'waiting', isPrivate: false },
        ],
      };
      const next = updateLobbyList(state, event);
      expect(next.lobbyList).toHaveLength(1);
      expect(next.lobbyList[0]!.isPrivate).toBe(false);
    });

    it('updateLobby on successful join clears password prompt', () => {
      let state = createInitialState();
      state = setPlayerId(state, 'p2');
      state = setJoinTargetLobbyId(state, 'lobby1');
      state = setPasswordPromptVisible(state, true);
      const next = updateLobby(state, makeLobby());
      expect(next.screen).toBe('lobby');
      expect(next.lobby).not.toBeNull();
      // Password prompt should be cleared when lobby is joined
      expect(next.passwordPromptVisible).toBe(false);
      expect(next.joinTargetLobbyId).toBeNull();
    });
  });
});
