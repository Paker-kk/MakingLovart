export type WorkflowStage = 'idle' | 'input' | 'agent' | 'generate' | 'output' | 'error';

export type NodeKind = 'prompt' | 'loadImage' | 'enhancer' | 'generator' | 'preview';
export type PortType = 'text' | 'image' | 'result';

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

