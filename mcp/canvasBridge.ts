/**
 * Canvas Bridge — WebSocket server for MCP ↔ Canvas communication
 * 
 * The MCP server calls methods here to push commands to the Flovart canvas.
 * The React app connects via WebSocket to receive and execute these commands.
 * 
 * Protocol:
 *   MCP Server → canvasBridge.send(command) → WebSocket → React useCanvasBridge hook
 *   React hook → WebSocket ack → canvasBridge resolves promise
 * 
 * Future: swap WebSocket for Tauri IPC when running as desktop app.
 */

import { WebSocketServer, WebSocket } from 'ws';

export interface CanvasCommand {
  id: string;
  type: 
    | 'addElement'
    | 'removeElement'
    | 'updateElement'
    | 'clearBoard'
    | 'setBoard'
    | 'arrangeGrid'
    | 'getElements'
    | 'getBoardInfo';
  payload: Record<string, unknown>;
}

export interface CanvasResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

const BRIDGE_PORT = 23981;

let wss: WebSocketServer | null = null;
let connectedClient: WebSocket | null = null;
const pendingRequests = new Map<string, {
  resolve: (value: CanvasResponse) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function generateId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function startBridge(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (wss) { resolve(); return; }

    wss = new WebSocketServer({ port: BRIDGE_PORT, host: '127.0.0.1' });

    wss.on('listening', () => {
      console.error(`[CanvasBridge] WebSocket server listening on ws://127.0.0.1:${BRIDGE_PORT}`);
      resolve();
    });

    wss.on('error', (err) => {
      console.error(`[CanvasBridge] Server error:`, err.message);
      reject(err);
    });

    wss.on('connection', (ws) => {
      console.error('[CanvasBridge] Canvas client connected');
      connectedClient = ws;

      ws.on('message', (data) => {
        try {
          const resp: CanvasResponse = JSON.parse(data.toString());
          const pending = pendingRequests.get(resp.id);
          if (pending) {
            clearTimeout(pending.timer);
            pendingRequests.delete(resp.id);
            pending.resolve(resp);
          }
        } catch {
          console.error('[CanvasBridge] Invalid message from canvas');
        }
      });

      ws.on('close', () => {
        console.error('[CanvasBridge] Canvas client disconnected');
        if (connectedClient === ws) connectedClient = null;
      });
    });
  });
}

export function isCanvasConnected(): boolean {
  return connectedClient !== null && connectedClient.readyState === WebSocket.OPEN;
}

export function sendCommand(command: Omit<CanvasCommand, 'id'>, timeoutMs = 30000): Promise<CanvasResponse> {
  return new Promise((resolve, reject) => {
    if (!isCanvasConnected()) {
      reject(new Error('Canvas is not connected. Please open Flovart in a browser or Tauri window.'));
      return;
    }

    const id = generateId();
    const fullCommand: CanvasCommand = { id, ...command };

    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Command ${command.type} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingRequests.set(id, { resolve, reject, timer });
    connectedClient!.send(JSON.stringify(fullCommand));
  });
}

export function stopBridge(): void {
  for (const [, pending] of pendingRequests) {
    clearTimeout(pending.timer);
    pending.reject(new Error('Bridge shutting down'));
  }
  pendingRequests.clear();
  connectedClient?.close();
  wss?.close();
  wss = null;
  connectedClient = null;
}
