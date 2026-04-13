export type WorkflowStage = 'idle' | 'input' | 'agent' | 'generate' | 'output' | 'error';

export type NodeKind =
  | 'prompt'       // Text input
  | 'loadImage'    // Image input
  | 'enhancer'     // Prompt enhancer
  | 'generator'    // Image generation (AIGC)
  | 'preview'      // Output preview
  | 'llm'          // Generic LLM node (system prompt → text in → text out)
  | 'imageGen'     // Text/Image → Image (provider-agnostic)
  | 'videoGen'     // Text/Image → Video
  | 'runningHub'   // RunningHub ComfyUI API call
  | 'httpRequest'  // Generic HTTP / MCP call
  | 'condition'    // Branch based on text condition
  | 'merge'        // Merge multiple inputs into one
  | 'template'     // Text template with {{variable}} interpolation
  | 'saveToCanvas';// Place result onto the drawing canvas

export type PortType = 'text' | 'image' | 'result' | 'video' | 'any';

export type XYPosition = { x: number; y: number };

export interface NodePort {
  key: string;
  type: PortType;
  label: string;
}

export interface NodeDefinition {
  title: string;
  width: number;
  height: number;
  inputs: NodePort[];
  outputs: NodePort[];
}

export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Per-node configuration (system prompt, model, URL, etc.) */
  config?: NodeConfig;
}

/** Node-specific configuration depending on kind */
export interface NodeConfig {
  /** LLM: system prompt */
  systemPrompt?: string;
  /** LLM / ImageGen / VideoGen: provider to use */
  provider?: string;
  /** LLM / ImageGen / VideoGen: model to use */
  model?: string;
  /** RunningHub: model endpoint path */
  rhEndpoint?: string;
  /** RunningHub: resolution (1k/2k/4k) */
  rhResolution?: '1k' | '2k' | '4k';
  /** RunningHub: aspect ratio */
  rhAspectRatio?: string;
  /** HTTP/MCP: request URL */
  httpUrl?: string;
  /** HTTP/MCP: HTTP method */
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** HTTP/MCP: request headers (JSON string) */
  httpHeaders?: string;
  /** HTTP/MCP: request body template (supports {{input}} variables) */
  httpBodyTemplate?: string;
  /** HTTP/MCP: JSONPath to extract result from response */
  httpResultPath?: string;
  /** Template: text template with {{variable}} placeholders */
  templateText?: string;
  /** Condition: expression to evaluate (e.g., "{{input}} contains 'error'") */
  conditionExpr?: string;
  /** Generic label for display */
  label?: string;
  /** Temperature for LLM calls */
  temperature?: number;
  /** Max tokens for LLM calls */
  maxTokens?: number;
}

export interface WorkflowEdge {
  id: string;
  fromNode: string;
  fromPort: string;
  toNode: string;
  toPort: string;
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

export interface PendingConnection {
  fromNode: string;
  fromPort: string;
  mouseX: number;
  mouseY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

