import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseClientEvent, type ServerEvent } from '../shared/protocol.js';
import { LobbyManager } from './lobby.js';
import { GameManager } from './game-manager.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const IS_PROD = process.env['NODE_ENV'] === 'production';

// Resolve the static file directory (dist/ relative to project root)
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const STATIC_DIR = IS_PROD
  ? join(__dirname, '..', '..', 'client')
  : '';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  if (!IS_PROD || !STATIC_DIR) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Otris server running. Use Vite dev server for the client.');
    return;
  }

  const url = req.url === '/' ? '/index.html' : req.url ?? '/index.html';
  const safePath = url.split('?')[0]!.replace(/\.\./g, '');
  let filePath = join(STATIC_DIR, safePath);

  // SPA fallback: serve index.html for paths without extensions
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(STATIC_DIR, 'index.html');
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
}

const httpServer = createServer(serveStatic);
const wss = new WebSocketServer({ server: httpServer });
const lobbyManager = new LobbyManager();

// Map player IDs to their WebSocket connections
const playerSockets = new Map<string, WebSocket>();
// Map player IDs to their display names
const playerNames = new Map<string, string>();

function sendEvent(ws: WebSocket, event: ServerEvent): void {
  ws.send(JSON.stringify(event));
}

function sendToPlayer(playerId: string, event: ServerEvent): void {
  const socket = playerSockets.get(playerId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    sendEvent(socket, event);
  }
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

const gameManager = new GameManager({
  sendToPlayer,
  broadcastToGame: broadcastToLobby,
  getPlayerName: (id: string) => playerNames.get(id) ?? 'Unknown',
});

function startCountdown(lobbyId: string, seconds: number): void {
  const lobby = lobbyManager.getLobby(lobbyId);
  if (!lobby) return;

  const playerIds = lobby.players.map(p => p.id);
  gameManager.createGame(lobbyId, playerIds);
  lobby.status = 'in_game';

  let remaining = seconds;

  const tick = (): void => {
    if (remaining > 0) {
      broadcastToLobby(lobbyId, { type: 'countdown_tick', remaining });
      remaining--;
      setTimeout(tick, 1000);
    } else {
      gameManager.startGame(lobbyId);
    }
  };

  tick();
}

function resetLobbyAfterMatch(lobbyId: string): void {
  const lobby = lobbyManager.getLobby(lobbyId);
  if (!lobby) return;
  lobby.status = 'waiting';
  for (const p of lobby.players) {
    p.ready = false;
  }
  broadcastToLobby(lobbyId, { type: 'lobby_update', lobby });
  gameManager.removeGame(lobbyId);
}

httpServer.listen(PORT, () => {
  console.log(`[server] Otris server listening on port ${PORT}${IS_PROD ? ' (production)' : ' (development)'}`);
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

      case 'player_ready': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) {
          sendError(ws, 'Not in a lobby');
          break;
        }
        const result = lobbyManager.toggleReady(lobbyId, playerId, event.ready);
        if (!result.success) {
          sendError(ws, result.error);
          break;
        }
        broadcastToLobby(lobbyId, { type: 'lobby_update', lobby: result.lobby });
        sendEvent(ws, { type: 'lobby_update', lobby: result.lobby });
        break;
      }

      case 'start_game': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) {
          sendError(ws, 'Not in a lobby');
          break;
        }
        const result = lobbyManager.startGame(lobbyId, playerId);
        if (!result.success) {
          sendError(ws, result.error);
          break;
        }
        // Broadcast game_starting to all lobby members including sender
        const countdown = result.lobby.settings.countdownTimer;
        for (const player of result.lobby.players) {
          const socket = playerSockets.get(player.id);
          if (socket && socket.readyState === WebSocket.OPEN) {
            sendEvent(socket, { type: 'game_starting', countdown });
          }
        }
        // Start countdown and create game instance
        startCountdown(lobbyId, countdown);
        break;
      }

      case 'board_update': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) break;
        gameManager.handleBoardUpdate(lobbyId, playerId, event.board);
        break;
      }

      case 'lines_cleared': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) break;
        gameManager.handleLinesCleared(lobbyId, playerId, event.count);
        break;
      }

      case 'player_dead': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) break;
        gameManager.handlePlayerDead(lobbyId, playerId);
        // Check if match ended and reset lobby
        const game = gameManager.getGame(lobbyId);
        if (game && game.status === 'finished') {
          // Delay reset to let clients show results
          setTimeout(() => resetLobbyAfterMatch(lobbyId), 5000);
        }
        break;
      }

      case 'send_chat': {
        const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
        if (!lobbyId) {
          sendError(ws, 'Not in a lobby');
          break;
        }
        const senderName = playerNames.get(playerId) ?? 'Unknown';
        const chatEvent: ServerEvent = {
          type: 'chat_message',
          playerId,
          playerName: senderName,
          message: event.message,
          timestamp: Date.now(),
        };
        // Broadcast to all lobby members including sender
        const lobby = lobbyManager.getLobby(lobbyId);
        if (lobby) {
          for (const player of lobby.players) {
            const socket = playerSockets.get(player.id);
            if (socket && socket.readyState === WebSocket.OPEN) {
              sendEvent(socket, chatEvent);
            }
          }
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log(`[server] Player disconnected: ${playerId}`);

    // Handle disconnect during active game
    const lobbyId = lobbyManager.getPlayerLobbyId(playerId);
    if (lobbyId) {
      const game = gameManager.getGame(lobbyId);
      if (game && game.status === 'playing') {
        gameManager.handlePlayerDead(lobbyId, playerId);
        const updatedGame = gameManager.getGame(lobbyId);
        if (updatedGame && updatedGame.status === 'finished') {
          setTimeout(() => resetLobbyAfterMatch(lobbyId), 5000);
        }
      }

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

export { wss, lobbyManager, gameManager, playerSockets, playerNames };
