import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { parseClientEvent, type ServerEvent } from '../shared/protocol.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

const wss = new WebSocketServer({ port: PORT });

function sendEvent(ws: WebSocket, event: ServerEvent): void {
  ws.send(JSON.stringify(event));
}

wss.on('listening', () => {
  console.log(`[server] WebSocket server listening on port ${PORT}`);
});

wss.on('connection', (ws: WebSocket) => {
  const playerId = randomUUID();
  console.log(`[server] Player connected: ${playerId}`);

  sendEvent(ws, { type: 'welcome', playerId });

  ws.on('message', (raw: Buffer) => {
    const data = raw.toString();
    const event = parseClientEvent(data);

    if (!event) {
      console.warn(`[server] Invalid message from ${playerId}: ${data}`);
      ws.send(
        JSON.stringify({ type: 'error', message: 'Invalid event format' }),
      );
      return;
    }

    console.log(`[server] Event from ${playerId}: ${event.type}`);
    // Event routing will be added in subsequent tasks
  });

  ws.on('close', () => {
    console.log(`[server] Player disconnected: ${playerId}`);
  });

  ws.on('error', (err: Error) => {
    console.error(`[server] WebSocket error for ${playerId}:`, err.message);
  });
});
