/**
 * Workflow Agent Templates — pre-built node graphs
 * Each template defines a set of nodes, edges, and optional groups
 * that auto-populate the workflow editor for common AI production tasks.
 */
import type { WorkflowEdge, WorkflowGroup, WorkflowNode } from './types';

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string; // emoji
  category: 'drama' | 'design' | 'utility';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  groups?: WorkflowGroup[];
}

// ──── Helper to create unique IDs for templates ────
let _tid = 0;
const tid = (prefix: string) => `tpl_${prefix}_${++_tid}`;
const resetTid = () => { _tid = 0; };

// ════════════════════════════════════════════════════
// Template 1: Short Drama Storyboard (短剧分镜)
// ════════════════════════════════════════════════════
function makeShortDramaTemplate(): WorkflowTemplate {
  resetTid();
  const scriptLLM   = tid('llm');
  const splitLLM    = tid('llm');
  const charLLM     = tid('llm');
  const tplScene    = tid('tpl');
  const imgGen1     = tid('img');
  const imgGen2     = tid('img');
  const imgGen3     = tid('img');
  const merge       = tid('merge');
  const save        = tid('save');

  const nodes: WorkflowNode[] = [
    // Step 1: LLM generates full script from concept
    { id: scriptLLM, kind: 'llm', x: 80, y: 200, config: {
      label: '剧本生成',
      systemPrompt: '你是专业的短剧编剧。根据用户给出的概念/主题，生成一个3-5场的短剧剧本。每场包含：场号、场景描述、角色动作、对白。输出格式为 Markdown。',
      temperature: 0.8,
    }},
    // Step 2: LLM splits script → per-scene visual descriptions
    { id: splitLLM, kind: 'llm', x: 560, y: 100, config: {
      label: '分镜描述',
      systemPrompt: '你是分镜师。将输入的剧本拆解成逐场画面描述（英文），每条描述适合用于 AI 绘画 prompt。格式: Scene 1: ...\nScene 2: ...\nScene 3: ...',
      temperature: 0.6,
    }},
    // Step 3: LLM extracts character design prompts
    { id: charLLM, kind: 'llm', x: 560, y: 380, config: {
      label: '角色设计',
      systemPrompt: '从剧本中提取主要角色，为每个角色输出一段英文外貌描述 prompt（适用于 AI 绘画），包含发型、服装、体型、配色等视觉细节。',
      temperature: 0.7,
    }},
    // Step 4: Template combines scene + character info
    { id: tplScene, kind: 'template', x: 1020, y: 200, config: {
      label: '组合 Prompt',
      templateText: '{{var1}}\n\nCharacter reference:\n{{var2}}',
    }},
    // Step 5: Generate key scene images
    { id: imgGen1, kind: 'imageGen', x: 1480, y: 60, config: { label: '场景 1' } },
    { id: imgGen2, kind: 'imageGen', x: 1480, y: 280, config: { label: '场景 2' } },
    { id: imgGen3, kind: 'imageGen', x: 1480, y: 500, config: { label: '场景 3' } },
    // Step 6: Merge + save
    { id: merge, kind: 'merge', x: 1920, y: 240 },
    { id: save, kind: 'saveToCanvas', x: 2300, y: 260 },
  ];

  const edges: WorkflowEdge[] = [
    { id: tid('e'), fromNode: scriptLLM, fromPort: 'text', toNode: splitLLM, toPort: 'text' },
    { id: tid('e'), fromNode: scriptLLM, fromPort: 'text', toNode: charLLM, toPort: 'text' },
    { id: tid('e'), fromNode: splitLLM, fromPort: 'text', toNode: tplScene, toPort: 'var1' },
    { id: tid('e'), fromNode: charLLM, fromPort: 'text', toNode: tplScene, toPort: 'var2' },
    { id: tid('e'), fromNode: tplScene, fromPort: 'text', toNode: imgGen1, toPort: 'text' },
    { id: tid('e'), fromNode: tplScene, fromPort: 'text', toNode: imgGen2, toPort: 'text' },
    { id: tid('e'), fromNode: tplScene, fromPort: 'text', toNode: imgGen3, toPort: 'text' },
    { id: tid('e'), fromNode: imgGen1, fromPort: 'image', toNode: merge, toPort: 'a' },
    { id: tid('e'), fromNode: imgGen2, fromPort: 'image', toNode: merge, toPort: 'b' },
    { id: tid('e'), fromNode: merge, fromPort: 'output', toNode: save, toPort: 'result' },
  ];

  const groups: WorkflowGroup[] = [
    { id: tid('g'), title: '剧本 & 分镜', x: 50, y: 60, width: 920, height: 460, nodeIds: [scriptLLM, splitLLM, charLLM] },
    { id: tid('g'), title: '图片生成', x: 1440, y: 20, width: 500, height: 560, nodeIds: [imgGen1, imgGen2, imgGen3] },
  ];

  return {
    id: 'short-drama-storyboard',
    name: '短剧分镜工作流',
    nameEn: 'Short Drama Storyboard',
    description: '输入主题 → LLM 生成剧本 → 分镜描述 → 角色设计 → AIGC 生成场景图',
    descriptionEn: 'Concept → Script → Storyboard → Character → Scene Images',
    icon: '🎬',
    category: 'drama',
    nodes,
    edges,
    groups,
  };
}

// ════════════════════════════════════════════════════
// Template 2: Character Design Sheet (角色设计)
// ════════════════════════════════════════════════════
function makeCharacterDesignTemplate(): WorkflowTemplate {
  resetTid();
  const promptNode = tid('prompt');
  const llmDesign  = tid('llm');
  const tplFront   = tid('tpl');
  const tplSide    = tid('tpl');
  const tplExpr    = tid('tpl');
  const imgFront   = tid('img');
  const imgSide    = tid('img');
  const imgExpr    = tid('img');
  const save       = tid('save');

  const nodes: WorkflowNode[] = [
    { id: promptNode, kind: 'prompt', x: 80, y: 200 },
    { id: llmDesign, kind: 'llm', x: 520, y: 200, config: {
      label: '角色设定',
      systemPrompt: '你是角色设计师。根据用户描述的角色信息，生成三个视角的英文绘画 prompt:\n1. 正面全身\n2. 侧面半身\n3. 表情特写\n\n格式:\nFRONT: ...\nSIDE: ...\nEXPR: ...',
      temperature: 0.7,
    }},
    { id: tplFront, kind: 'template', x: 960, y: 60, config: {
      label: '正面 Prompt',
      templateText: 'character design sheet, front view, full body, white background, {{var1}}',
    }},
    { id: tplSide, kind: 'template', x: 960, y: 260, config: {
      label: '侧面 Prompt',
      templateText: 'character design sheet, side view, half body, white background, {{var1}}',
    }},
    { id: tplExpr, kind: 'template', x: 960, y: 460, config: {
      label: '表情 Prompt',
      templateText: 'character expression sheet, face close-up, multiple expressions, white background, {{var1}}',
    }},
    { id: imgFront, kind: 'imageGen', x: 1400, y: 60, config: { label: '正面图' } },
    { id: imgSide, kind: 'imageGen', x: 1400, y: 260, config: { label: '侧面图' } },
    { id: imgExpr, kind: 'imageGen', x: 1400, y: 460, config: { label: '表情图' } },
    { id: save, kind: 'saveToCanvas', x: 1820, y: 260 },
  ];

  const edges: WorkflowEdge[] = [
    { id: tid('e'), fromNode: promptNode, fromPort: 'text', toNode: llmDesign, toPort: 'text' },
    { id: tid('e'), fromNode: llmDesign, fromPort: 'text', toNode: tplFront, toPort: 'var1' },
    { id: tid('e'), fromNode: llmDesign, fromPort: 'text', toNode: tplSide, toPort: 'var1' },
    { id: tid('e'), fromNode: llmDesign, fromPort: 'text', toNode: tplExpr, toPort: 'var1' },
    { id: tid('e'), fromNode: tplFront, fromPort: 'text', toNode: imgFront, toPort: 'text' },
    { id: tid('e'), fromNode: tplSide, fromPort: 'text', toNode: imgSide, toPort: 'text' },
    { id: tid('e'), fromNode: tplExpr, fromPort: 'text', toNode: imgExpr, toPort: 'text' },
    { id: tid('e'), fromNode: imgFront, fromPort: 'image', toNode: save, toPort: 'result' },
    { id: tid('e'), fromNode: imgSide, fromPort: 'image', toNode: save, toPort: 'result' },
    { id: tid('e'), fromNode: imgExpr, fromPort: 'image', toNode: save, toPort: 'result' },
  ];

  return {
    id: 'character-design-sheet',
    name: '角色设计表',
    nameEn: 'Character Design Sheet',
    description: '描述角色 → LLM 拆解多视角 → 生成正面/侧面/表情图',
    descriptionEn: 'Describe character → LLM decomposes views → Generate front/side/expression images',
    icon: '🧑‍🎨',
    category: 'design',
    nodes,
    edges,
  };
}

// ════════════════════════════════════════════════════
// Template 3: Style Transfer (风格迁移)
// ════════════════════════════════════════════════════
function makeStyleTransferTemplate(): WorkflowTemplate {
  resetTid();
  const loadImg  = tid('load');
  const promptN  = tid('prompt');
  const llmStyle = tid('llm');
  const imgGen   = tid('img');
  const save     = tid('save');

  const nodes: WorkflowNode[] = [
    { id: loadImg, kind: 'loadImage', x: 80, y: 120 },
    { id: promptN, kind: 'prompt', x: 80, y: 340 },
    { id: llmStyle, kind: 'llm', x: 520, y: 240, config: {
      label: '风格分析',
      systemPrompt: '你是 AI 绘画风格专家。用户会给出想要的风格描述。请输出一段英文 prompt，描述该风格的视觉特征（色调、笔触、光影、质感），适合用于图生图的风格迁移。',
      temperature: 0.6,
    }},
    { id: imgGen, kind: 'imageGen', x: 960, y: 200, config: { label: '风格生成' } },
    { id: save, kind: 'saveToCanvas', x: 1380, y: 220 },
  ];

  const edges: WorkflowEdge[] = [
    { id: tid('e'), fromNode: promptN, fromPort: 'text', toNode: llmStyle, toPort: 'text' },
    { id: tid('e'), fromNode: llmStyle, fromPort: 'text', toNode: imgGen, toPort: 'text' },
    { id: tid('e'), fromNode: loadImg, fromPort: 'image', toNode: imgGen, toPort: 'image' },
    { id: tid('e'), fromNode: imgGen, fromPort: 'image', toNode: save, toPort: 'result' },
  ];

  return {
    id: 'style-transfer',
    name: '风格迁移',
    nameEn: 'Style Transfer',
    description: '上传图片 + 描述风格 → LLM 生成风格 prompt → 图生图迁移',
    descriptionEn: 'Upload image + describe style → LLM generates style prompt → Image-to-image transfer',
    icon: '🎨',
    category: 'design',
    nodes,
    edges,
  };
}

// ════════════════════════════════════════════════════
// Template 4: RunningHub ComfyUI Pipeline
// ════════════════════════════════════════════════════
function makeRunningHubPipelineTemplate(): WorkflowTemplate {
  resetTid();
  const promptN   = tid('prompt');
  const enhancer  = tid('enh');
  const rhNode    = tid('rh');
  const save      = tid('save');

  const nodes: WorkflowNode[] = [
    { id: promptN, kind: 'prompt', x: 80, y: 200 },
    { id: enhancer, kind: 'enhancer', x: 520, y: 200 },
    { id: rhNode, kind: 'runningHub', x: 960, y: 200, config: {
      label: 'RunningHub 任务',
      rhResolution: '2k',
    }},
    { id: save, kind: 'saveToCanvas', x: 1400, y: 220 },
  ];

  const edges: WorkflowEdge[] = [
    { id: tid('e'), fromNode: promptN, fromPort: 'text', toNode: enhancer, toPort: 'text' },
    { id: tid('e'), fromNode: enhancer, fromPort: 'text', toNode: rhNode, toPort: 'text' },
    { id: tid('e'), fromNode: rhNode, fromPort: 'result', toNode: save, toPort: 'result' },
  ];

  return {
    id: 'runninghub-pipeline',
    name: 'RunningHub 流水线',
    nameEn: 'RunningHub Pipeline',
    description: 'Prompt → 增强 → RunningHub ComfyUI 执行 → 保存到画布',
    descriptionEn: 'Prompt → Enhance → RunningHub ComfyUI execution → Save to canvas',
    icon: '⚡',
    category: 'utility',
    nodes,
    edges,
  };
}

// ════════════════════════════════════════════════════
// Template 5: Multi-scene Batch Generation (批量场景生成)
// ════════════════════════════════════════════════════
function makeMultiSceneBatchTemplate(): WorkflowTemplate {
  resetTid();
  const promptN   = tid('prompt');
  const llmSplit  = tid('llm');
  const tpl1      = tid('tpl');
  const tpl2      = tid('tpl');
  const tpl3      = tid('tpl');
  const tpl4      = tid('tpl');
  const img1      = tid('img');
  const img2      = tid('img');
  const img3      = tid('img');
  const img4      = tid('img');
  const save      = tid('save');

  const nodes: WorkflowNode[] = [
    { id: promptN, kind: 'prompt', x: 80, y: 280 },
    { id: llmSplit, kind: 'llm', x: 520, y: 280, config: {
      label: '场景拆分',
      systemPrompt: '将用户的故事概念拆成4个关键场景，每个场景用一段英文 AI 绘画 prompt 描述。格式:\nSCENE1: ...\nSCENE2: ...\nSCENE3: ...\nSCENE4: ...',
      temperature: 0.7,
    }},
    { id: tpl1, kind: 'template', x: 960, y: 40, config: { label: '场景 1', templateText: 'cinematic shot, {{var1}}' } },
    { id: tpl2, kind: 'template', x: 960, y: 200, config: { label: '场景 2', templateText: 'cinematic shot, {{var1}}' } },
    { id: tpl3, kind: 'template', x: 960, y: 360, config: { label: '场景 3', templateText: 'cinematic shot, {{var1}}' } },
    { id: tpl4, kind: 'template', x: 960, y: 520, config: { label: '场景 4', templateText: 'cinematic shot, {{var1}}' } },
    { id: img1, kind: 'imageGen', x: 1400, y: 40, config: { label: '生成 1' } },
    { id: img2, kind: 'imageGen', x: 1400, y: 200, config: { label: '生成 2' } },
    { id: img3, kind: 'imageGen', x: 1400, y: 360, config: { label: '生成 3' } },
    { id: img4, kind: 'imageGen', x: 1400, y: 520, config: { label: '生成 4' } },
    { id: save, kind: 'saveToCanvas', x: 1840, y: 280 },
  ];

  const edges: WorkflowEdge[] = [
    { id: tid('e'), fromNode: promptN, fromPort: 'text', toNode: llmSplit, toPort: 'text' },
    { id: tid('e'), fromNode: llmSplit, fromPort: 'text', toNode: tpl1, toPort: 'var1' },
    { id: tid('e'), fromNode: llmSplit, fromPort: 'text', toNode: tpl2, toPort: 'var1' },
    { id: tid('e'), fromNode: llmSplit, fromPort: 'text', toNode: tpl3, toPort: 'var1' },
    { id: tid('e'), fromNode: llmSplit, fromPort: 'text', toNode: tpl4, toPort: 'var1' },
    { id: tid('e'), fromNode: tpl1, fromPort: 'text', toNode: img1, toPort: 'text' },
    { id: tid('e'), fromNode: tpl2, fromPort: 'text', toNode: img2, toPort: 'text' },
    { id: tid('e'), fromNode: tpl3, fromPort: 'text', toNode: img3, toPort: 'text' },
    { id: tid('e'), fromNode: tpl4, fromPort: 'text', toNode: img4, toPort: 'text' },
    { id: tid('e'), fromNode: img1, fromPort: 'image', toNode: save, toPort: 'result' },
    { id: tid('e'), fromNode: img2, fromPort: 'image', toNode: save, toPort: 'result' },
    { id: tid('e'), fromNode: img3, fromPort: 'image', toNode: save, toPort: 'result' },
    { id: tid('e'), fromNode: img4, fromPort: 'image', toNode: save, toPort: 'result' },
  ];

  const groups: WorkflowGroup[] = [
    { id: tid('g'), title: '场景模板', x: 920, y: 0, width: 440, height: 600, nodeIds: [tpl1, tpl2, tpl3, tpl4] },
    { id: tid('g'), title: '图片生成', x: 1360, y: 0, width: 440, height: 600, nodeIds: [img1, img2, img3, img4] },
  ];

  return {
    id: 'multi-scene-batch',
    name: '批量场景生成',
    nameEn: 'Multi-scene Batch',
    description: '输入故事概念 → LLM 拆分4个场景 → 批量生成场景图',
    descriptionEn: 'Story concept → LLM splits 4 scenes → Batch generate scene images',
    icon: '🖼️',
    category: 'drama',
    nodes,
    edges,
    groups,
  };
}

// ──── Export all templates ────
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  makeShortDramaTemplate(),
  makeCharacterDesignTemplate(),
  makeStyleTransferTemplate(),
  makeRunningHubPipelineTemplate(),
  makeMultiSceneBatchTemplate(),
];
