/**
 * useCanvasBridge — React hook that connects to the MCP server's WebSocket bridge
 * and executes canvas commands received from Claude Code.
 * 
 * Usage in App.tsx:
 *   useCanvasBridge({ elements, setElements, boards, setBoards, activeBoardId, setActiveBoardId, generateId });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Element, ImageElement, TextElement, Board } from '../types';

const BRIDGE_WS_URL = 'ws://127.0.0.1:23981';

interface CanvasCommand {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

interface CanvasBridgeOptions {
  elements: Element[];
  boards: Board[];
  activeBoardId: string;
  setElements: (updater: (prev: Element[]) => Element[]) => void;
  updateActiveBoard: (updater: (board: Board) => Board) => void;
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setActiveBoardId: (id: string) => void;
  createNewBoard: (name: string) => Board;
  generateId: () => string;
}

export function useCanvasBridge(options: CanvasBridgeOptions) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sendResponse = useCallback((id: string, success: boolean, data?: unknown, error?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ id, success, data, error }));
    }
  }, []);

  const handleCommand = useCallback((cmd: CanvasCommand) => {
    const { elements, boards, activeBoardId, setElements, setBoards, setActiveBoardId, updateActiveBoard, createNewBoard, generateId } = optionsRef.current;

    try {
      switch (cmd.type) {
        case 'addElement': {
          const p = cmd.payload;
          const id = generateId();

          if (p.elementType === 'image') {
            if (typeof p.href !== 'string' || !p.href) {
              sendResponse(cmd.id, false, undefined, 'Missing required field: href');
              break;
            }
            const el: ImageElement = {
              id,
              type: 'image',
              href: String(p.href),
              x: typeof p.x === 'number' ? p.x : 100 + elements.length * 40,
              y: typeof p.y === 'number' ? p.y : 100 + elements.length * 40,
              width: typeof p.width === 'number' ? p.width : 512,
              height: typeof p.height === 'number' ? p.height : 512,
              mimeType: 'image/png',
              name: typeof p.name === 'string' ? p.name : `Shot ${elements.filter(e => e.type === 'image').length + 1}`,
            };
            setElements(prev => [...prev, el]);
            sendResponse(cmd.id, true, { id });
          } else if (p.elementType === 'text') {
            if (typeof p.text !== 'string') {
              sendResponse(cmd.id, false, undefined, 'Missing required field: text');
              break;
            }
            const el: TextElement = {
              id,
              type: 'text',
              text: String(p.text),
              x: typeof p.x === 'number' ? p.x : 100,
              y: typeof p.y === 'number' ? p.y : 100,
              fontSize: typeof p.fontSize === 'number' ? p.fontSize : 24,
              fontColor: typeof p.fontColor === 'string' ? p.fontColor : '#ffffff',
              width: 300,
              height: 40,
              name: typeof p.name === 'string' ? p.name : `Text ${elements.filter(e => e.type === 'text').length + 1}`,
            };
            setElements(prev => [...prev, el]);
            sendResponse(cmd.id, true, { id });
          } else {
            sendResponse(cmd.id, false, undefined, `Unknown element type: ${p.elementType}`);
          }
          break;
        }

        case 'removeElement': {
          const targetId = cmd.payload.elementId as string;
          const exists = elements.some(el => el.id === targetId);
          if (!exists) {
            sendResponse(cmd.id, false, undefined, `Element ${targetId} not found`);
          } else {
            setElements(prev => prev.filter(el => el.id !== targetId));
            sendResponse(cmd.id, true);
          }
          break;
        }

        case 'updateElement': {
          const { elementId, ...updates } = cmd.payload as { elementId: string;[k: string]: unknown };
          setElements(prev => prev.map(el =>
            el.id === elementId ? { ...el, ...updates } as Element : el
          ));
          sendResponse(cmd.id, true);
          break;
        }

        case 'clearBoard': {
          setElements(() => []);
          sendResponse(cmd.id, true);
          break;
        }

        case 'setBoard': {
          const boardName = cmd.payload.name as string;
          const existing = boards.find(b => b.name === boardName);
          if (existing) {
            setActiveBoardId(existing.id);
            sendResponse(cmd.id, true, { boardId: existing.id });
          } else {
            const newBoard = createNewBoard(boardName);
            setBoards(prev => [...prev, newBoard]);
            setActiveBoardId(newBoard.id);
            sendResponse(cmd.id, true, { boardId: newBoard.id, created: true });
          }
          break;
        }

        case 'arrangeGrid': {
          const cols = typeof cmd.payload.columns === 'number' ? cmd.payload.columns : 3;
          const gap = typeof cmd.payload.gap === 'number' ? cmd.payload.gap : 40;
          const startX = typeof cmd.payload.startX === 'number' ? cmd.payload.startX : 100;
          const startY = typeof cmd.payload.startY === 'number' ? cmd.payload.startY : 100;

          setElements(prev => {
            let col = 0, row = 0;
            let maxHeightInRow = 0;
            let currentY = startY;

            return prev.map(el => {
              const w = 'width' in el ? (el as { width: number }).width : 200;
              const h = 'height' in el ? (el as { height: number }).height : 200;

              const newEl = { ...el, x: startX + col * (w + gap), y: currentY };
              maxHeightInRow = Math.max(maxHeightInRow, h);
              col++;
              if (col >= cols) {
                col = 0;
                row++;
                currentY += maxHeightInRow + gap;
                maxHeightInRow = 0;
              }
              return newEl as Element;
            });
          });
          sendResponse(cmd.id, true);
          break;
        }

        case 'getElements': {
          const filter = cmd.payload.filter as string;
          const filtered = filter === 'all'
            ? elements
            : elements.filter(el => el.type === filter);
          sendResponse(cmd.id, true, filtered);
          break;
        }

        case 'getBoardInfo': {
          const board = boards.find(b => b.id === activeBoardId);
          sendResponse(cmd.id, true, board ? {
            id: board.id,
            name: board.name,
            elementCount: board.elements.length,
            zoom: board.zoom,
            panOffset: board.panOffset,
          } : null);
          break;
        }

        default:
          sendResponse(cmd.id, false, undefined, `Unknown command: ${cmd.type}`);
      }
    } catch (err: any) {
      sendResponse(cmd.id, false, undefined, err.message ?? 'Unknown error');
    }
  }, [sendResponse]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      try {
        ws = new WebSocket(BRIDGE_WS_URL);
      } catch {
        // WebSocket constructor can throw in some environments
        reconnectTimer = setTimeout(connect, 3000);
        return;
      }

      ws.onopen = () => {
        console.log('[CanvasBridge] Connected to MCP bridge');
        setConnected(true);
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const cmd: CanvasCommand = JSON.parse(event.data);
          if (cmd.id && cmd.type) {
            handleCommand(cmd);
          }
        } catch {
          console.warn('[CanvasBridge] Invalid message received');
        }
      };

      ws.onclose = () => {
        console.log('[CanvasBridge] Disconnected, reconnecting in 3s...');
        setConnected(false);
        wsRef.current = null;
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror  
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      wsRef.current = null;
    };
  }, [handleCommand]);

  return { connected };
}
