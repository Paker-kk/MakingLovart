

export type Tool = 'select' | 'pan' | 'draw' | 'erase' | 'rectangle' | 'circle' | 'triangle' | 'text' | 'arrow' | 'highlighter' | 'lasso' | 'line';

export type WheelAction = 'zoom' | 'pan';

export type GenerationMode = 'image' | 'video' | 'keyframe';

export interface Point {
  x: number;
  y: number;
}

interface CanvasElementBase {
  id: string;
  x: number;
  y: number;
  name?: string;
  isVisible?: boolean;
  isLocked?: boolean;
  parentId?: string;
}

export interface ImageElement extends CanvasElementBase {
  type: 'image';
  href: string; 
  width: number;
  height: number;
  mimeType: string;
  borderRadius?: number;
}

export interface VideoElement extends CanvasElementBase {
  type: 'video';
  href: string; // Blob URL
  width: number;
  height: number;
  mimeType: string;
}

export interface PathElement extends CanvasElementBase {
  type: 'path';
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity?: number;
}

export interface ShapeElement extends CanvasElementBase {
    type: 'shape';
    shapeType: 'rectangle' | 'circle' | 'triangle';
    width: number;
    height: number;
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    borderRadius?: number;
    strokeDashArray?: [number, number];
}

export interface TextElement extends CanvasElementBase {
    type: 'text';
    text: string;
    fontSize: number;
    fontColor: string;
    width: number;
    height: number;
}

export interface ArrowElement extends CanvasElementBase {
    type: 'arrow';
    points: [Point, Point];
    strokeColor: string;
    strokeWidth: number;
}

export interface LineElement extends CanvasElementBase {
    type: 'line';
    points: [Point, Point];
    strokeColor: string;
    strokeWidth: number;
}

export interface GroupElement extends CanvasElementBase {
    type: 'group';
    width: number;
    height: number;
}


export type Element = ImageElement | PathElement | ShapeElement | TextElement | ArrowElement | LineElement | GroupElement | VideoElement;

export interface UserEffect {
  id: string;
  name: string;
  value: string;
}

export interface Board {
  id: string;
  name: string;
  elements: Element[];
  history: Element[][];
  historyIndex: number;
  panOffset: Point;
  zoom: number;
  canvasBackgroundColor: string;
}

// Asset Library
export type AssetCategory = 'character' | 'scene' | 'prop';

export interface AssetItem {
  id: string;
  name?: string;
  category: AssetCategory;
  dataUrl: string; // base64 image
  mimeType: string; // image/png, image/jpeg
  width: number;
  height: number;
  createdAt: number;
}

export interface AssetLibrary {
  character: AssetItem[];
  scene: AssetItem[];
  prop: AssetItem[];
}

export interface GenerationHistoryItem {
  id: string;
  name?: string;
  dataUrl: string;        // 图片 base64 或视频缩略图 base64
  mimeType: string;
  width: number;
  height: number;
  prompt: string;
  createdAt: number;
  /** 生成类型：image | video，默认 image */
  mediaType?: 'image' | 'video';
}

// API Key & Model Preferences
export type ThemeMode = 'light' | 'dark' | 'system';
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'stability' | 'qwen' | 'banana' | 'custom';
export type AICapability = 'text' | 'image' | 'video' | 'agent';

export interface UserApiKey {
  id: string;
  provider: AIProvider;
  capabilities: AICapability[];
  key: string;
  baseUrl?: string;
  name?: string;
  isDefault?: boolean;
  status?: 'unknown' | 'ok' | 'error';
  /** 用户为这个 Key 自定义的可调用模型列表 */
  customModels?: string[];
  /** 这些自定义模型中用户设定的默认模型 */
  defaultModel?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ModelPreference {
  textModel: string;
  imageModel: string;
  videoModel: string;
  agentModel: string;
}

// Agent / Workflow
export type WorkspaceMode = 'whiteboard' | 'node';
export type PromptEnhanceMode = 'smart' | 'style' | 'precise' | 'translate';

export interface PromptEnhanceRequest {
  prompt: string;
  mode: PromptEnhanceMode;
  stylePreset?: string;
}

export interface PromptEnhanceResult {
  enhancedPrompt: string;
  negativePrompt: string;
  suggestions: string[];
  notes?: string;
}

export interface CharacterLockProfile {
  id: string;
  name: string;
  anchorElementId: string;
  referenceImage: string; // dataURL
  descriptor: string;
  createdAt: number;
  isActive: boolean;
}

export interface ChatAttachment {
  id: string;
  name: string;
  href: string;
  mimeType: string;
  source: 'canvas' | 'upload';
}
