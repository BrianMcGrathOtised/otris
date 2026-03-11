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
  joinTargetLobbyId: string | null;
  passwordPromptVisible: boolean;
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
    joinTargetLobbyId: null,
    passwordPromptVisible: false,
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
  return { ...state, lobby, screen: 'lobby', passwordPromptVisible: false, joinTargetLobbyId: null };
}

export function clearLobby(state: LobbyState): LobbyState {
  return { ...state, lobby: null, chatMessages: [], screen: 'menu' };
}

/** Return to lobby after a match — keep lobby if it exists, clear chat. */
export function returnToLobby(state: LobbyState): LobbyState {
  if (state.lobby) {
    return { ...state, chatMessages: [], screen: 'lobby' };
  }
  return { ...state, chatMessages: [], screen: 'menu' };
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

export function setJoinTargetLobbyId(state: LobbyState, lobbyId: string | null): LobbyState {
  return { ...state, joinTargetLobbyId: lobbyId };
}

export function setPasswordPromptVisible(state: LobbyState, visible: boolean): LobbyState {
  return { ...state, passwordPromptVisible: visible };
}

export function clearPasswordPrompt(state: LobbyState): LobbyState {
  return { ...state, passwordPromptVisible: false, joinTargetLobbyId: null };
}

export function isHost(state: LobbyState): boolean {
  return state.lobby !== null && state.playerId !== null && state.lobby.hostId === state.playerId;
}

export function getOwnPlayer(state: LobbyState) {
  if (!state.lobby || !state.playerId) return null;
  return state.lobby.players.find(p => p.id === state.playerId) ?? null;
}
