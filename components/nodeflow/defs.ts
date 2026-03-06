import type { NodeDefinition, NodeKind, WorkflowEdge, WorkflowGroup, WorkflowNode } from './types';

export const NODE_DEFS: Record<NodeKind, NodeDefinition> = {
  prompt: {
    title: 'CLIP Text Encode (Prompt)',
    width: 360,
    height: 240,
    inputs: [],
    outputs: [{ key: 'text', type: 'text', label: 'TEXT' }],
  },
  loadImage: {
    title: 'Load Image',
    width: 300,
    height: 160,
    inputs: [],
    outputs: [{ key: 'image', type: 'image', label: 'IMAGE' }],
  },
  enhancer: {
    title: 'Prompt Enhancer Agent',
    width: 320,
    height: 170,
    inputs: [{ key: 'text', type: 'text', label: 'TEXT IN' }],
    outputs: [{ key: 'text', type: 'text', label: 'TEXT OUT' }],
  },
  generator: {
    title: 'KSampler / Generator',
    width: 360,
    height: 190,
    inputs: [
      { key: 'text', type: 'text', label: 'PROMPT' },
      { key: 'image', type: 'image', label: 'IMAGE' },
    ],
    outputs: [{ key: 'result', type: 'result', label: 'RESULT' }],
  },
  preview: {
    title: 'Preview / Save Output',
    width: 280,
    height: 130,
    inputs: [{ key: 'result', type: 'result', label: 'RESULT IN' }],
    outputs: [],
  },
};

export const INITIAL_NODES: WorkflowNode[] = [
  { id: 'prompt_1', kind: 'prompt', x: 240, y: 120 },
  { id: 'image_1', kind: 'loadImage', x: 260, y: 460 },
  { id: 'enhancer_1', kind: 'enhancer', x: 740, y: 140 },
  { id: 'generator_1', kind: 'generator', x: 1180, y: 260 },
  { id: 'preview_1', kind: 'preview', x: 1600, y: 280 },
];

export const INITIAL_EDGES: WorkflowEdge[] = [
  { id: 'edge_1', fromNode: 'prompt_1', fromPort: 'text', toNode: 'enhancer_1', toPort: 'text' },
  { id: 'edge_2', fromNode: 'enhancer_1', fromPort: 'text', toNode: 'generator_1', toPort: 'text' },
  { id: 'edge_3', fromNode: 'image_1', fromPort: 'image', toNode: 'generator_1', toPort: 'image' },
  { id: 'edge_4', fromNode: 'generator_1', fromPort: 'result', toNode: 'preview_1', toPort: 'result' },
];

export const INITIAL_GROUPS: WorkflowGroup[] = [];

