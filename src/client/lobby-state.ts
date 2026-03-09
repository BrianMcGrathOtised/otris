/**
 * Client-side lobby state management.
 *
 * Pure functions for managing the lobby UI state. All mutations return
 * new state objects (immutable style) so they are easy to test.
 */

import type { Lobby } from '../shared/types.js';
import type { ChatMessageEvent, LobbyListEvent } from '../shared/protocol.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Screen = 'menu' | 'create' | 'lobby';

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface LobbyListEntry {
  id: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: Lobby['status'];
  isPrivate: boolean;
}

export interface LobbyState {
  screen: Screen;
  playerId: string | null;
  playerName: string;
  lobby: Lobby | null;
  chatMessages: ChatMessage[];
  lobbyList: LobbyListEntry[];
  errorMessage: string | null;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(): LobbyState {
  return {
    screen: 'menu',
    playerId: null,
    playerName: '',
    lobby: null,
    chatMessages: [],
    lobbyList: [],
    errorMessage: null,
  };
}

// ---------------------------------------------------------------------------
// Reducers (pure state transitions)
// ---------------------------------------------------------------------------

export function setPlayerId(state: LobbyState, playerId: string): LobbyState {
  return { ...state, playerId };
}

export function setPlayerName(state: LobbyState, playerName: string): LobbyState {
  return { ...state, playerName };
}

export function setScreen(state: LobbyState, screen: Screen): LobbyState {
  return { ...state, screen };
}

export function updateLobby(state: LobbyState, lobby: Lobby): LobbyState {
  return { ...state, lobby, screen: 'lobby' };
}

export function clearLobby(state: LobbyState): LobbyState {
  return { ...state, lobby: null, chatMessages: [], screen: 'menu' };
}

export function addChatMessage(state: LobbyState, event: ChatMessageEvent): LobbyState {
  const msg: ChatMessage = {
    playerId: event.playerId,
    playerName: event.playerName,
    message: event.message,
    timestamp: event.timestamp,
  };
  return { ...state, chatMessages: [...state.chatMessages, msg] };
}

export function updateLobbyList(state: LobbyState, event: LobbyListEvent): LobbyState {
  return { ...state, lobbyList: event.lobbies };
}

export function setError(state: LobbyState, message: string): LobbyState {
  return { ...state, errorMessage: message };
}

export function clearError(state: LobbyState): LobbyState {
  return { ...state, errorMessage: null };
}

export function isHost(state: LobbyState): boolean {
  return state.lobby !== null && state.playerId !== null && state.lobby.hostId === state.playerId;
}

export function getOwnPlayer(state: LobbyState) {
  if (!state.lobby || !state.playerId) return null;
  return state.lobby.players.find(p => p.id === state.playerId) ?? null;
}
