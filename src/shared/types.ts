export interface Player {
  id: string;
  name: string;
  ready: boolean;
}

export interface LobbySettings {
  maxPlayers: number;
  startingSpeed: number;
  countdownTimer: number;
  isPrivate: boolean;
  password: string;
}

export type LobbyStatus = 'waiting' | 'starting' | 'in_game';

export interface Lobby {
  id: string;
  hostId: string;
  players: Player[];
  settings: LobbySettings;
  status: LobbyStatus;
}

export function createDefaultLobbySettings(): LobbySettings {
  return {
    maxPlayers: 4,
    startingSpeed: 1,
    countdownTimer: 3,
    isPrivate: false,
    password: '',
  };
}
