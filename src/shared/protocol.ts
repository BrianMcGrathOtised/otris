import type { Lobby, LobbySettings, Player } from './types.js';

// --- Client -> Server events ---

export interface CreateLobbyEvent {
  type: 'create_lobby';
  settings?: Partial<LobbySettings>;
}

export interface JoinLobbyEvent {
  type: 'join_lobby';
  lobbyId: string;
  password?: string;
}

export interface LeaveLobbyEvent {
  type: 'leave_lobby';
}

export interface PlayerReadyEvent {
  type: 'player_ready';
  ready: boolean;
}

export interface StartGameEvent {
  type: 'start_game';
}

export interface SendChatEvent {
  type: 'send_chat';
  message: string;
}

export interface KickPlayerEvent {
  type: 'kick_player';
  playerId: string;
}

export interface ChangeSettingsEvent {
  type: 'change_settings';
  settings: Partial<LobbySettings>;
}

export interface TransferHostEvent {
  type: 'transfer_host';
  playerId: string;
}

export interface ListLobbiesEvent {
  type: 'list_lobbies';
}

export interface SetNameEvent {
  type: 'set_name';
  name: string;
}

export type ClientEvent =
  | CreateLobbyEvent
  | JoinLobbyEvent
  | LeaveLobbyEvent
  | PlayerReadyEvent
  | StartGameEvent
  | SendChatEvent
  | KickPlayerEvent
  | ChangeSettingsEvent
  | TransferHostEvent
  | ListLobbiesEvent
  | SetNameEvent;

// --- Server -> Client events ---

export interface LobbyUpdateEvent {
  type: 'lobby_update';
  lobby: Lobby;
}

export interface PlayerJoinedEvent {
  type: 'player_joined';
  player: Player;
}

export interface PlayerLeftEvent {
  type: 'player_left';
  playerId: string;
  newHostId?: string;
}

export interface ChatMessageEvent {
  type: 'chat_message';
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameStartingEvent {
  type: 'game_starting';
  countdown: number;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  code?: string;
}

export interface LobbyListEvent {
  type: 'lobby_list';
  lobbies: Array<{
    id: string;
    hostName: string;
    playerCount: number;
    maxPlayers: number;
    status: Lobby['status'];
    isPrivate: boolean;
  }>;
}

export interface WelcomeEvent {
  type: 'welcome';
  playerId: string;
}

export type ServerEvent =
  | LobbyUpdateEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | ChatMessageEvent
  | GameStartingEvent
  | ErrorEvent
  | LobbyListEvent
  | WelcomeEvent;

// --- Validation helpers ---

const CLIENT_EVENT_TYPES: ReadonlySet<string> = new Set<ClientEvent['type']>([
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
]);

const SERVER_EVENT_TYPES: ReadonlySet<string> = new Set<ServerEvent['type']>([
  'lobby_update',
  'player_joined',
  'player_left',
  'chat_message',
  'game_starting',
  'error',
  'lobby_list',
  'welcome',
]);

export function isValidClientEventType(type: string): boolean {
  return CLIENT_EVENT_TYPES.has(type);
}

export function isValidServerEventType(type: string): boolean {
  return SERVER_EVENT_TYPES.has(type);
}

export function parseClientEvent(data: string): ClientEvent | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('type' in parsed) ||
      typeof (parsed as { type: unknown }).type !== 'string'
    ) {
      return null;
    }
    const event = parsed as { type: string };
    if (!isValidClientEventType(event.type)) {
      return null;
    }
    return parsed as ClientEvent;
  } catch {
    return null;
  }
}
