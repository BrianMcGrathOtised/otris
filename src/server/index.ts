import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { parseClientEvent, type ServerEvent } from '../shared/protocol.js';
import { LobbyManager } from './lobby.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

const wss = new WebSocketServer({ port: PORT });
const lobbyManager = new LobbyManager();

// Map player IDs to their WebSocket connections
const playerSockets = new Map<string, WebSocket>();
// Map player IDs to their display names
const playerNames = new Map<string, string>();

function sendEvent(ws: WebSocket, event: ServerEvent): void {
  ws.send(JSON.stringify(event));
}

function sendError(ws: WebSocket, message: string, code?: string): void {
  sendEvent(ws, { type: 'error', message, code });
}

function broadcastToLobby(lobbyId: string, event: ServerEvent, excludePlayerId?: string): void {
  const lobby = lobbyManager.getLobby(lobbyId);
  if (!lobby) return;
  for (const player of lobby.players) {
    if (player.id === excludePlayerId) continue;
    const socket = playerSockets.get(player.id);
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendEvent(socket, event);
    }
  }
}

wss.on('listening', () => {
  console.log(`[server] WebSocket server listening on port ${PORT}`);
});

wss.on('connection', (ws: WebSocket) => {
  const playerId = randomUUID();
  console.log(`[server] Player connected: ${playerId}`);

  playerSockets.set(playerId, ws);
  playerNames.set(playerId, `Player-${playerId.slice(0, 4)}`);

  sendEvent(ws, { type: 'welcome', playerId });

  ws.on('message', (raw: Buffer) => {
    const data = raw.toString();
    const event = parseClientEvent(data);

    if (!event) {
      console.warn(`[server] Invalid message from ${playerId}: ${data}`);
      sendError(ws, 'Invalid event format');
      return;
    }

    console.log(`[server] Event from ${playerId}: ${event.type}`);

    switch (event.type) {
      case 'set_name': {
        playerNames.set(playerId, event.name);
        break;
      }

      case 'create_lobby': {
        const name = playerNames.get(playerId) ?? 'Unknown';
        const lobby = lobbyManager.createLobby(playerId, name, event.settings);
        if (!lobby) {
          sendError(ws, 'Already in a lobby');
          break;
        }
        sendEvent(ws, { type: 'lobby_update', lobby });
        break;
      }

      case 'join_lobby': {
        const name = playerNames.get(playerId) ?? 'Unknown';
        const result = lobbyManager.joinLobby(event.lobbyId, playerId, name, event.password);
        if (!result.success) {
          sendError(ws, result.error);
          break;
        }
        const joiningPlayer = result.lobby.players.find(p => p.id === playerId);
        if (joiningPlayer) {
          broadcastToLobby(event.lobbyId, { type: 'player_joined', player: joiningPlayer }, playerId);
        }
        // Send full lobby state to all members including the joiner
        for (const player of result.lobby.players) {
          const socket = playerSockets.get(player.id);
          if (socket && socket.readyState === WebSocket.OPEN) {
            sendEvent(socket, { type: 'lobby_update', lobby: result.lobby });
          }
        }
        break;
      }

      case 'leave_lobby': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) {
          sendError(ws, 'Not in a lobby');
          break;
        }
        // Get lobby players before leave for broadcasting
        const lobbyBefore = lobbyManager.getLobby(lobbyId);
        const playersBefore = lobbyBefore ? [...lobbyBefore.players] : [];

        const result = lobbyManager.leaveLobby(lobbyId, playerId);
        if (!result.success) {
          sendError(ws, result.error);
          break;
        }
        // Notify remaining players
        for (const player of playersBefore) {
          if (player.id === playerId) continue;
          const socket = playerSockets.get(player.id);
          if (socket && socket.readyState === WebSocket.OPEN) {
            sendEvent(socket, { type: 'player_left', playerId, newHostId: result.newHostId });
            if (result.lobby) {
              sendEvent(socket, { type: 'lobby_update', lobby: result.lobby });
            }
          }
        }
        break;
      }

      case 'kick_player': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) {
          sendError(ws, 'Not in a lobby');
          break;
        }
        const result = lobbyManager.kickPlayer(lobbyId, playerId, event.playerId);
        if (!result.success) {
          sendError(ws, result.error);
          break;
        }
        // Notify kicked player
        const kickedSocket = playerSockets.get(event.playerId);
        if (kickedSocket && kickedSocket.readyState === WebSocket.OPEN) {
          sendEvent(kickedSocket, { type: 'player_left', playerId: event.playerId });
          sendEvent(kickedSocket, { type: 'error', message: 'You have been kicked from the lobby' });
        }
        // Broadcast to remaining
        broadcastToLobby(lobbyId, { type: 'player_left', playerId: event.playerId });
        broadcastToLobby(lobbyId, { type: 'lobby_update', lobby: result.lobby });
        break;
      }

      case 'change_settings': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) {
          sendError(ws, 'Not in a lobby');
          break;
        }
        const result = lobbyManager.updateSettings(lobbyId, playerId, event.settings);
        if (!result.success) {
          sendError(ws, result.error);
          break;
        }
        broadcastToLobby(lobbyId, { type: 'lobby_update', lobby: result.lobby });
        sendEvent(ws, { type: 'lobby_update', lobby: result.lobby });
        break;
      }

      case 'transfer_host': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) {
          sendError(ws, 'Not in a lobby');
          break;
        }
        const result = lobbyManager.transferHost(lobbyId, playerId, event.playerId);
        if (!result.success) {
          sendError(ws, result.error);
          break;
        }
        broadcastToLobby(lobbyId, { type: 'lobby_update', lobby: result.lobby });
        sendEvent(ws, { type: 'lobby_update', lobby: result.lobby });
        break;
      }

      case 'list_lobbies': {
        const lobbies = lobbyManager.listPublicLobbies();
        sendEvent(ws, { type: 'lobby_list', lobbies });
        break;
      }

      case 'player_ready':
      case 'start_game':
      case 'send_chat':
        // These will be handled in subsequent tasks
        break;
    }
  });

  ws.on('close', () => {
    console.log(`[server] Player disconnected: ${playerId}`);

    // Auto-leave lobby on disconnect
    const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
    if (lobbyId) {
      const lobbyBefore = lobbyManager.getLobby(lobbyId);
      const playersBefore = lobbyBefore ? [...lobbyBefore.players] : [];

      const result = lobbyManager.removePlayer(playerId);
      if (result) {
        for (const player of playersBefore) {
          if (player.id === playerId) continue;
          const socket = playerSockets.get(player.id);
          if (socket && socket.readyState === WebSocket.OPEN) {
            sendEvent(socket, { type: 'player_left', playerId, newHostId: result.newHostId });
            if (result.lobby) {
              sendEvent(socket, { type: 'lobby_update', lobby: result.lobby });
            }
          }
        }
      }
    }

    playerSockets.delete(playerId);
    playerNames.delete(playerId);
  });

  ws.on('error', (err: Error) => {
    console.error(`[server] WebSocket error for ${playerId}:`, err.message);
  });
});

export { wss, lobbyManager, playerSockets, playerNames };
