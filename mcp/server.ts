#!/usr/bin/env node
/**
 * Flovart MCP Server
 * 
 * Exposes the Flovart visual canvas to Claude Code via Model Context Protocol.
 * Runs as a stdio MCP server — Claude Code spawns this process.
 * 
 * Tools:
 *   canvas_status    — Check if the Flovart canvas is connected
 *   add_image        — Place an image on the canvas
 *   add_text         — Place a text label on the canvas
 *   remove_element   — Remove an element by ID
 *   get_elements     — List elements on the current board
 *   get_board_info   — Get current board metadata
 *   set_board        — Switch or create a board
 *   arrange_grid     — Auto-arrange elements in a grid
 *   generate_storyboard — Create a storyboard layout (board + shot slots)
 * 
 * Usage:
 *   npx tsx mcp/server.ts              (dev)
 *   node dist/mcp/server.js            (built)
 * 
 * Claude Code config (.claude/settings.json):
 *   "mcpServers": {
 *     "flovart": {
 *       "command": "npx",
 *       "args": ["tsx", "mcp/server.ts"],
 *       "cwd": "<project-root>"
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { startBridge, stopBridge } from './canvasBridge.js';
import {
  AddImageSchema,
  AddTextSchema,
  GenerateStoryboardSchema,
  ArrangeGridSchema,
  RemoveElementSchema,
  GetElementsSchema,
  SetBoardSchema,
  handleAddImage,
  handleAddText,
  handleGenerateStoryboard,
  handleArrangeGrid,
  handleRemoveElement,
  handleGetElements,
  handleSetBoard,
  handleGetBoardInfo,
  handleCanvasStatus,
} from './tools.js';

const server = new McpServer({
  name: 'flovart',
  version: '0.1.0',
});

// ─── Tool Registration ──────────────────────────────────

server.tool(
  'canvas_status',
  'Check if the Flovart canvas app is connected',
  {},
  async () => handleCanvasStatus(),
);

server.tool(
  'add_image',
  'Place an image on the Flovart canvas. Accepts a base64 data URL.',
  AddImageSchema.shape,
  async (args) => handleAddImage(args),
);

server.tool(
  'add_text',
  'Place a text label on the Flovart canvas.',
  AddTextSchema.shape,
  async (args) => handleAddText(args),
);

server.tool(
  'remove_element',
  'Remove an element from the canvas by its ID.',
  RemoveElementSchema.shape,
  async (args) => handleRemoveElement(args),
);

server.tool(
  'get_elements',
  'List all elements on the current board. Filter by type: image, text, shape, or all.',
  GetElementsSchema.shape,
  async (args) => handleGetElements(args),
);

server.tool(
  'get_board_info',
  'Get info about the current board (name, element count, zoom, pan).',
  {},
  async () => handleGetBoardInfo(),
);

server.tool(
  'set_board',
  'Switch to a named board, or create it if it does not exist.',
  SetBoardSchema.shape,
  async (args) => handleSetBoard(args),
);

server.tool(
  'arrange_grid',
  'Auto-arrange all elements on the current board into a grid layout.',
  ArrangeGridSchema.shape,
  async (args) => handleArrangeGrid(args),
);

server.tool(
  'generate_storyboard',
  'Create a storyboard: a new board with a grid layout of shot slots. Returns shot positions so you can place images with add_image.',
  GenerateStoryboardSchema.shape,
  async (args) => handleGenerateStoryboard(args),
);

// ─── Start ──────────────────────────────────────────────

async function main() {
  console.error('[Flovart MCP] Starting server...');

  // Start WebSocket bridge for canvas communication  
  await startBridge();
  console.error('[Flovart MCP] Canvas bridge ready');

  // Connect MCP server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Flovart MCP] MCP server running on stdio');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.error('[Flovart MCP] Shutting down...');
    stopBridge();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    stopBridge();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[Flovart MCP] Fatal error:', err);
  process.exit(1);
});
