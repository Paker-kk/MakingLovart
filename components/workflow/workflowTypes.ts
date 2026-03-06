export type WorkflowStage = 'idle' | 'input' | 'agent' | 'generate' | 'output' | 'error';

export type WorkflowNodeKind = 'prompt' | 'loadImage' | 'enhancer' | 'generator' | 'preview';

export type WorkflowConnectionType =
	| 'main'
	| 'ai_memory'
	| 'ai_document'
	| 'ai_tool'
	| 'ai_languageModel'
	| 'ai_embedding'
	| 'ai_vectorStore'
	| 'ai_textSplitter'
	| 'ai_outputParser';

export type WorkflowPortMode = 'input' | 'output';

export interface WorkflowPortDef {
	key: string;
	label: string;
	mode: WorkflowPortMode;
	connectionType: WorkflowConnectionType;
	required?: boolean;
	maxConnections?: number;
}

export interface WorkflowNodeDef {
	kind: WorkflowNodeKind;
	title: string;
	width: number;
	headerTone: 'violet' | 'emerald' | 'blue' | 'amber' | 'neutral';
	inputs: WorkflowPortDef[];
	outputs: WorkflowPortDef[];
}

export interface WorkflowNode {
	id: string;
	kind: WorkflowNodeKind;
	x: number;
	y: number;
}

export interface WorkflowEdge {
	id: string;
	fromNode: string;
	fromPort: string;
	toNode: string;
	toPort: string;
	connectionType: WorkflowConnectionType;
}

export interface WorkflowGroup {
	id: string;
	title: string;
	x: number;
	y: number;
	width: number;
	height: number;
	nodeIds: string[];
}

export interface WorkflowViewport {
	x: number;
	y: number;
	scale: number;
}

export interface WorkflowRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export const WORKFLOW_NODE_DEFS: Record<WorkflowNodeKind, WorkflowNodeDef> = {
	prompt: {
		kind: 'prompt',
		title: 'Prompt Input',
		width: 360,
		headerTone: 'violet',
		inputs: [],
		outputs: [{ key: 'text', label: 'Text', mode: 'output', connectionType: 'main' }],
	},
	loadImage: {
		kind: 'loadImage',
		title: 'Load Image',
		width: 320,
		headerTone: 'blue',
		inputs: [],
		outputs: [{ key: 'image', label: 'Image', mode: 'output', connectionType: 'main' }],
	},
	enhancer: {
		kind: 'enhancer',
		title: 'Prompt Enhancer Agent',
		width: 320,
		headerTone: 'emerald',
		inputs: [{ key: 'text', label: 'Text', mode: 'input', connectionType: 'main', required: true, maxConnections: 1 }],
		outputs: [{ key: 'text', label: 'Text', mode: 'output', connectionType: 'main' }],
	},
	generator: {
		kind: 'generator',
		title: 'Generator / KSampler',
		width: 360,
		headerTone: 'amber',
		inputs: [
			{ key: 'text', label: 'Text', mode: 'input', connectionType: 'main', required: true, maxConnections: 1 },
			{ key: 'image', label: 'Image', mode: 'input', connectionType: 'main', maxConnections: 1 },
		],
		outputs: [{ key: 'result', label: 'Result', mode: 'output', connectionType: 'main' }],
	},
	preview: {
		kind: 'preview',
		title: 'Preview / Output',
		width: 300,
		headerTone: 'neutral',
		inputs: [{ key: 'result', label: 'Result', mode: 'input', connectionType: 'main', required: true, maxConnections: 1 }],
		outputs: [],
	},
};

export const DEFAULT_WORKFLOW_NODES: WorkflowNode[] = [
	{ id: 'prompt_1', kind: 'prompt', x: 240, y: 110 },
	{ id: 'image_1', kind: 'loadImage', x: 250, y: 420 },
	{ id: 'enhancer_1', kind: 'enhancer', x: 720, y: 120 },
	{ id: 'generator_1', kind: 'generator', x: 1140, y: 220 },
	{ id: 'preview_1', kind: 'preview', x: 1580, y: 220 },
];

export const DEFAULT_WORKFLOW_EDGES: WorkflowEdge[] = [
	{ id: 'e1', fromNode: 'prompt_1', fromPort: 'text', toNode: 'enhancer_1', toPort: 'text', connectionType: 'main' },
	{ id: 'e2', fromNode: 'enhancer_1', fromPort: 'text', toNode: 'generator_1', toPort: 'text', connectionType: 'main' },
	{ id: 'e3', fromNode: 'image_1', fromPort: 'image', toNode: 'generator_1', toPort: 'image', connectionType: 'main' },
	{ id: 'e4', fromNode: 'generator_1', fromPort: 'result', toNode: 'preview_1', toPort: 'result', connectionType: 'main' },
];

export const DEFAULT_WORKFLOW_VIEWPORT: WorkflowViewport = { x: -120, y: -80, scale: 0.84 };
