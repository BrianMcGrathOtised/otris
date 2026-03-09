/**
 * WebSocket client connection module.
 *
 * Provides a thin wrapper around the browser WebSocket API with typed
 * event serialization/deserialization using the shared protocol types.
 */

import type { ClientEvent, ServerEvent } from '../shared/protocol.js';
import { isValidServerEventType } from '../shared/protocol.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServerEventHandler = (event: ServerEvent) => void;

export interface Connection {
  send(event: ClientEvent): void;
  onEvent(handler: ServerEventHandler): void;
  disconnect(): void;
  getReadyState(): number;
}

// ---------------------------------------------------------------------------
// Parsing helper (exported for testing)
// ---------------------------------------------------------------------------

export function parseServerEvent(data: string): ServerEvent | null {
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
    if (!isValidServerEventType(event.type)) {
      return null;
    }
    return parsed as ServerEvent;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connection factory
// ---------------------------------------------------------------------------

export function connect(url: string): Connection {
  const ws = new WebSocket(url);
  const handlers: ServerEventHandler[] = [];

  ws.addEventListener('message', (event: MessageEvent) => {
    const parsed = parseServerEvent(String(event.data));
    if (parsed) {
      for (const handler of handlers) {
        handler(parsed);
      }
    }
  });

  return {
    send(event: ClientEvent): void {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    },

    onEvent(handler: ServerEventHandler): void {
      handlers.push(handler);
    },

    disconnect(): void {
      ws.close();
    },

    getReadyState(): number {
      return ws.readyState;
    },
  };
}

// ---------------------------------------------------------------------------
// Default server URL
// ---------------------------------------------------------------------------

export const DEFAULT_WS_URL = 'ws://localhost:3000';
