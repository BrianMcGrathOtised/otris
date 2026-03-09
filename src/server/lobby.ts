import { randomBytes } from 'node:crypto';
import type { Lobby, LobbySettings, Player } from '../shared/types.js';
import { createDefaultLobbySettings } from '../shared/types.js';

export interface LobbySuccess {
  success: true;
  lobby: Lobby;
  newHostId?: string;
}

export interface LobbyError {
  success: false;
  error: string;
}

export type LobbyResult = LobbySuccess | LobbyError;

export interface LeaveResult {
  success: true;
  lobby: Lobby | null;
  lobbyId: string;
  leftPlayerId: string;
  newHostId?: string;
}

export interface LeaveError {
  success: false;
  error: string;
}

export type LeaveResultType = LeaveResult | LeaveError;

export interface LobbySummary {
  id: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: Lobby['status'];
  isPrivate: boolean;
}

function generateLobbyId(): string {
  return randomBytes(3).toString('hex');
}

export class LobbyManager {
  private lobbies = new Map<string, Lobby>();
  private playerToLobby = new Map<string, string>();

  createLobby(hostId: string, hostName: string, settings?: Partial<LobbySettings>): Lobby | null {
    if (this.playerToLobby.has(hostId)) {
      return null;
    }

    const id = generateLobbyId();
    const defaults = createDefaultLobbySettings();
    const mergedSettings: LobbySettings = { ...defaults, ...settings };

    const player: Player = { id: hostId, name: hostName, ready: false };
    const lobby: Lobby = {
      id,
      hostId,
      players: [player],
      settings: mergedSettings,
      status: 'waiting',
    };

    this.lobbies.set(id, lobby);
    this.playerToLobby.set(hostId, id);
    return lobby;
  }

  joinLobby(lobbyId: string, playerId: string, playerName: string, password?: string): LobbyResult {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.status !== 'waiting') {
      return { success: false, error: 'Game is already in progress' };
    }

    if (this.playerToLobby.has(playerId)) {
      return { success: false, error: 'Player is already in a lobby' };
    }

    if (lobby.players.length >= lobby.settings.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }

    if (lobby.settings.isPrivate) {
      if (!password || password !== lobby.settings.password) {
        return { success: false, error: 'Incorrect password' };
      }
    }

    const player: Player = { id: playerId, name: playerName, ready: false };
    lobby.players.push(player);
    this.playerToLobby.set(playerId, lobbyId);

    return { success: true, lobby };
  }

  leaveLobby(lobbyId: string, playerId: string): LeaveResultType {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    const playerIndex = lobby.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: 'Player not in lobby' };
    }

    lobby.players.splice(playerIndex, 1);
    this.playerToLobby.delete(playerId);

    if (lobby.players.length === 0) {
      this.lobbies.delete(lobbyId);
      return { success: true, lobby: null, lobbyId, leftPlayerId: playerId };
    }

    let newHostId: string | undefined;
    if (lobby.hostId === playerId) {
      newHostId = lobby.players[0]!.id;
      lobby.hostId = newHostId;
    }

    return { success: true, lobby, lobbyId, leftPlayerId: playerId, newHostId };
  }

  kickPlayer(lobbyId: string, requesterId: string, targetId: string): LobbyResult {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.hostId !== requesterId) {
      return { success: false, error: 'Only the host can kick players' };
    }

    if (requesterId === targetId) {
      return { success: false, error: 'Cannot kick yourself' };
    }

    const playerIndex = lobby.players.findIndex(p => p.id === targetId);
    if (playerIndex === -1) {
      return { success: false, error: 'Player not in lobby' };
    }

    lobby.players.splice(playerIndex, 1);
    this.playerToLobby.delete(targetId);

    return { success: true, lobby };
  }

  updateSettings(lobbyId: string, requesterId: string, settings: Partial<LobbySettings>): LobbyResult {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.hostId !== requesterId) {
      return { success: false, error: 'Only the host can change settings' };
    }

    lobby.settings = { ...lobby.settings, ...settings };
    return { success: true, lobby };
  }

  transferHost(lobbyId: string, requesterId: string, newHostId: string): LobbyResult {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.hostId !== requesterId) {
      return { success: false, error: 'Only the host can transfer host' };
    }

    if (requesterId === newHostId) {
      return { success: false, error: 'Already the host' };
    }

    const targetExists = lobby.players.some(p => p.id === newHostId);
    if (!targetExists) {
      return { success: false, error: 'Target player not in lobby' };
    }

    lobby.hostId = newHostId;
    return { success: true, lobby };
  }

  getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  getPlayerLobbyId(playerId: string): string | undefined {
    return this.playerToLobby.get(playerId);
  }

  listPublicLobbies(): LobbySummary[] {
    const result: LobbySummary[] = [];
    for (const lobby of this.lobbies.values()) {
      if (!lobby.settings.isPrivate) {
        const host = lobby.players.find(p => p.id === lobby.hostId);
        result.push({
          id: lobby.id,
          hostName: host?.name ?? 'Unknown',
          playerCount: lobby.players.length,
          maxPlayers: lobby.settings.maxPlayers,
          status: lobby.status,
          isPrivate: false,
        });
      }
    }
    return result;
  }

  toggleReady(lobbyId: string, playerId: string, ready: boolean): LobbyResult {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    const player = lobby.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not in lobby' };
    }

    player.ready = ready;
    return { success: true, lobby };
  }

  areAllReady(lobbyId: string): boolean {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return false;
    }
    return lobby.players.every(p => p.ready);
  }

  startGame(lobbyId: string, requesterId: string, forceStart = false): LobbyResult {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.hostId !== requesterId) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (lobby.status !== 'waiting') {
      return { success: false, error: 'Lobby is not in waiting status' };
    }

    if (forceStart) {
      if (lobby.players.length < 2) {
        return { success: false, error: 'Need at least 2 players to force start' };
      }
    } else {
      if (!this.areAllReady(lobbyId)) {
        return { success: false, error: 'Not all players are ready' };
      }
    }

    lobby.status = 'starting';
    return { success: true, lobby };
  }

  removePlayer(playerId: string): LeaveResult | null {
    const lobbyId = this.playerToLobby.get(playerId);
    if (!lobbyId) {
      return null;
    }
    const result = this.leaveLobby(lobbyId, playerId);
    if (result.success) {
      return result;
    }
    return null;
  }
}
