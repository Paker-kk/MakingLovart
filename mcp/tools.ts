/**
 * Flovart MCP Server — Tool definitions
 * 
 * Each tool corresponds to a canvas operation that Claude Code can invoke.
 * Tools use canvasBridge to communicate with the running Flovart canvas.
 */

import { z } from 'zod';
import { sendCommand, isCanvasConnected } from './canvasBridge.js';

// ─── Schemas ────────────────────────────────────────────

export const AddImageSchema = z.object({
  imageDataUrl: z.string().describe('Base64 data URL of the image (data:image/png;base64,...)'),
  x: z.number().optional().describe('X position on canvas (default: auto-arrange)'),
  y: z.number().optional().describe('Y position on canvas (default: auto-arrange)'),
  width: z.number().optional().describe('Display width in pixels'),
  height: z.number().optional().describe('Display height in pixels'),
  name: z.string().optional().describe('Label for the element in the layer panel'),
});

export const AddTextSchema = z.object({
  text: z.string().describe('Text content'),
  x: z.number().optional(),
  y: z.number().optional(),
  fontSize: z.number().optional().default(24),
  fontColor: z.string().optional().default('#ffffff'),
  name: z.string().optional(),
});

export const GenerateStoryboardSchema = z.object({
  prompt: z.string().describe('Scene description, e.g. "追车场景，6个分镜"'),
  shotCount: z.number().min(1).max(20).optional().default(6).describe('Number of shots to generate'),
  style: z.string().optional().describe('Visual style: cinematic, anime, watercolor, etc.'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3']).optional().default('16:9'),
});

export const ArrangeGridSchema = z.object({
  columns: z.number().min(1).max(10).optional().default(3),
  gap: z.number().optional().default(40),
  startX: z.number().optional().default(100),
  startY: z.number().optional().default(100),
});

export const RemoveElementSchema = z.object({
  elementId: z.string().describe('ID of the element to remove'),
});

export const GetElementsSchema = z.object({
  type: z.enum(['image', 'text', 'shape', 'all']).optional().default('all'),
});

export const SetBoardSchema = z.object({
  boardName: z.string().optional().describe('Switch to board by name, or create new if not found'),
});

// ─── Tool Handlers ──────────────────────────────────────

export async function handleAddImage(args: z.infer<typeof AddImageSchema>) {
  const resp = await sendCommand({
    type: 'addElement',
    payload: {
      elementType: 'image',
      href: args.imageDataUrl,
      x: args.x,
      y: args.y,
      width: args.width ?? 512,
      height: args.height ?? 512,
      name: args.name,
    },
  });
  if (!resp.success) throw new Error(resp.error ?? 'Failed to add image');
  return { content: [{ type: 'text' as const, text: `Image added to canvas. Element ID: ${(resp.data as any)?.id ?? 'unknown'}` }] };
}

export async function handleAddText(args: z.infer<typeof AddTextSchema>) {
  const resp = await sendCommand({
    type: 'addElement',
    payload: {
      elementType: 'text',
      text: args.text,
      x: args.x,
      y: args.y,
      fontSize: args.fontSize,
      fontColor: args.fontColor,
      name: args.name,
    },
  });
  if (!resp.success) throw new Error(resp.error ?? 'Failed to add text');
  return { content: [{ type: 'text' as const, text: `Text element added. ID: ${(resp.data as any)?.id ?? 'unknown'}` }] };
}

export async function handleGenerateStoryboard(args: z.infer<typeof GenerateStoryboardSchema>) {
  // Step 1: Create board for the storyboard
  await sendCommand({
    type: 'setBoard',
    payload: { name: `Storyboard: ${args.prompt.slice(0, 30)}` },
  });

  // Step 2: Generate shot descriptions using AI (will be called by the MCP server)
  // For now, return a structured plan that Claude Code will use to generate images
  const shots = [];
  for (let i = 1; i <= args.shotCount; i++) {
    shots.push({
      shotNumber: i,
      description: `Shot ${i} of "${args.prompt}"`,
      position: {
        x: 100 + ((i - 1) % 3) * 560,
        y: 100 + Math.floor((i - 1) / 3) * 400,
      },
    });
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        message: `Storyboard board created with ${args.shotCount} shot slots`,
        prompt: args.prompt,
        style: args.style ?? 'cinematic',
        aspectRatio: args.aspectRatio,
        shots,
        nextStep: 'Use add_image tool to place generated images for each shot. Use add_text to label each shot.',
      }, null, 2),
    }],
  };
}

export async function handleArrangeGrid(args: z.infer<typeof ArrangeGridSchema>) {
  const resp = await sendCommand({
    type: 'arrangeGrid',
    payload: {
      columns: args.columns,
      gap: args.gap,
      startX: args.startX,
      startY: args.startY,
    },
  });
  if (!resp.success) throw new Error(resp.error ?? 'Failed to arrange elements');
  return { content: [{ type: 'text' as const, text: `Elements arranged in ${args.columns}-column grid.` }] };
}

export async function handleRemoveElement(args: z.infer<typeof RemoveElementSchema>) {
  const resp = await sendCommand({
    type: 'removeElement',
    payload: { elementId: args.elementId },
  });
  if (!resp.success) throw new Error(resp.error ?? 'Failed to remove element');
  return { content: [{ type: 'text' as const, text: `Element ${args.elementId} removed.` }] };
}

export async function handleGetElements(args: z.infer<typeof GetElementsSchema>) {
  const resp = await sendCommand({
    type: 'getElements',
    payload: { filter: args.type },
  });
  if (!resp.success) throw new Error(resp.error ?? 'Failed to get elements');
  const elements = resp.data as any[];
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        count: elements?.length ?? 0,
        elements: elements?.map((el: any) => ({
          id: el.id,
          type: el.type,
          name: el.name,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
        })) ?? [],
      }, null, 2),
    }],
  };
}

export async function handleSetBoard(args: z.infer<typeof SetBoardSchema>) {
  const resp = await sendCommand({
    type: 'setBoard',
    payload: { name: args.boardName },
  });
  if (!resp.success) throw new Error(resp.error ?? 'Failed to set board');
  return { content: [{ type: 'text' as const, text: `Switched to board "${args.boardName}".` }] };
}

export async function handleGetBoardInfo() {
  const resp = await sendCommand({
    type: 'getBoardInfo',
    payload: {},
  });
  if (!resp.success) throw new Error(resp.error ?? 'Failed to get board info');
  return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
}

export function handleCanvasStatus() {
  const connected = isCanvasConnected();
  return {
    content: [{
      type: 'text' as const,
      text: connected
        ? 'Flovart canvas is connected and ready.'
        : 'Flovart canvas is NOT connected. Please open the app in your browser.',
    }],
  };
}
