

export type Tool = 'select' | 'pan' | 'draw' | 'erase' | 'rectangle' | 'circle' | 'triangle' | 'text' | 'arrow' | 'highlighter' | 'lasso' | 'line';

export type WheelAction = 'zoom' | 'pan';

export type GenerationMode = 'image' | 'video';

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

// API Key & Model Preferences
<<<<<<< Updated upstream
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'stability' | 'qwen' | 'banana' | 'custom';
=======
export type ThemeMode = 'light' | 'dark' | 'system';
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'stability' | 'qwen' | 'banana' | 'runninghub' | 'custom';
>>>>>>> Stashed changes
export type AICapability = 'text' | 'image' | 'video' | 'agent';

export type RunningHubInstanceType = 'default' | 'plus';
export type RunningHubAspectRatio = 'auto' | '1:1' | '16:9' | '16:10' | '4:3' | '3:2' | '9:16' | '10:16' | '3:4' | '2:3';

export interface RunningHubConfig {
  textToImageAppId?: string;
  imageToImageAppId?: string;
  inpaintAppId?: string;
  /** 图片输入节点 ID（nodeInfoList 中用于注入参考图的 nodeId），默认 '2' */
  imageNodeId?: string;
  /** 图片输入字段名（nodeInfoList 中用于注入参考图的 fieldName），默认 'images' */
  imageInputFieldName?: string;
  /** 遮罩输入节点 ID（nodeInfoList 中用于注入 mask 的 nodeId），默认与 imageNodeId 相同 */
  maskNodeId?: string;
  /** 遮罩输入字段名（nodeInfoList 中用于注入 mask 的 fieldName），默认 'mask' */
  maskFieldName?: string;
  promptNodeId?: string;
  promptFieldName?: string;
  modelNodeId?: string;
  modelFieldName?: string;
  modelFieldDataJson?: string;
  aspectNodeId?: string;
  aspectFieldName?: string;
  aspectFieldDataJson?: string;
  promptTypeNodeId?: string;
  promptTypeFieldName?: string;
  promptTypeValue?: string;
  model?: string;
  aspectRatio?: RunningHubAspectRatio;
  instanceType?: RunningHubInstanceType;
  usePersonalQueue?: boolean;
  retainSeconds?: number;
  webhookUrl?: string;
}

export interface UserApiKey {
  id: string;
  provider: AIProvider;
  key: string;
  baseUrl?: string;
  name?: string;
  isDefault?: boolean;
  status?: 'unknown' | 'ok' | 'error';
<<<<<<< Updated upstream
=======
  /** 用户为这个 Key 自定义的可调用模型列表 */
  customModels?: string[];
  /** 这些自定义模型中用户设定的默认模型 */
  defaultModel?: string;
  /** RunningHub 的工作流与实例配置 */
  runninghub?: RunningHubConfig;
>>>>>>> Stashed changes
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
export type WorkspaceMode = 'whiteboard';
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
