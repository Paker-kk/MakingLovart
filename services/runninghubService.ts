import type { RunningHubAspectRatio, RunningHubConfig, UserApiKey } from '../types';

/**
 * RunningHub API 基础路径
 * 开发与生产环境统一走同源反向代理 /runninghub-api/，
 * 由 vite dev-server proxy 或 nginx 转发到 https://www.runninghub.cn/openapi/v2。
 * 这样浏览器不会触发跨域（CORS）限制。
 */
export const RUNNINGHUB_BASE_URL = '/runninghub-api';
export const RUNNINGHUB_QUERY_URL = `${RUNNINGHUB_BASE_URL}/query`;
export const RUNNINGHUB_UPLOAD_URL = `${RUNNINGHUB_BASE_URL}/media/upload/binary`;

export const RUNNINGHUB_MODEL_OPTIONS = [
  'Midjourney V7',
  'Midjourney V6.1',
  'Midjourney V6',
  'Midjourney V5.2',
  'Midjourney V5.1',
  'Niji V5',
  'Niji V6',
] as const;

export const RUNNINGHUB_ASPECT_RATIO_OPTIONS: RunningHubAspectRatio[] = [
  'auto',
  '1:1',
  '16:9',
  '16:10',
  '4:3',
  '3:2',
  '9:16',
  '10:16',
  '3:4',
  '2:3',
];

const RUNNINGHUB_MODEL_FIELD_DATA = JSON.stringify([
  { name: 'Midjourney V7', index: 'Midjourney V7', description: 'MJ V7', fastIndex: 1.0, descriptionEn: 'MJ V7' },
  { name: 'Midjourney V6.1', index: 'Midjourney V6.1', description: 'MJ V6.1', fastIndex: 2.0, descriptionEn: 'MJ V6.1' },
  { name: 'Midjourney V6', index: 'Midjourney V6', description: 'MJ V6', fastIndex: 3.0, descriptionEn: 'MJ V6' },
  { name: 'Midjourney V5.2', index: 'Midjourney V5.2', description: 'MJ V5.2', fastIndex: 4.0, descriptionEn: 'MJ V5.2' },
  { name: 'Midjourney V5.1', index: 'Midjourney V5.1', description: 'MJ V5.1', fastIndex: 5.0, descriptionEn: 'MJ V5.1' },
  { name: 'Niji V5', index: 'Niji V5', description: 'Njji V5', fastIndex: 6.0, descriptionEn: 'Njji V5' },
  { name: 'Niji V6', index: 'Niji V6', description: 'Njji V6', fastIndex: 7.0, descriptionEn: 'Njji V6' },
]);

const RUNNINGHUB_ASPECT_FIELD_DATA = JSON.stringify([
  { name: 'auto', index: 'auto', description: '自动', fastIndex: 1.0, descriptionEn: 'Automatic' },
  { name: '1:1', index: '1:1', description: '1:1', fastIndex: 2.0, descriptionEn: '1:1' },
  { name: '16:9', index: '16:9', description: '16:9', fastIndex: 3.0, descriptionEn: '16:9' },
  { name: '16:10', index: '16:10', description: '16:10', fastIndex: 4.0, descriptionEn: '16:10' },
  { name: '4:3', index: '4:3', description: '4:3', fastIndex: 5.0, descriptionEn: '4:3' },
  { name: '3:2', index: '3:2', description: '3:2', fastIndex: 6.0, descriptionEn: '3:2' },
  { name: '9:16', index: '9:16', description: '9:16', fastIndex: 7.0, descriptionEn: '9:16' },
  { name: '10:16', index: '10:16', description: '10:16', fastIndex: 8.0, descriptionEn: '10:16' },
  { name: '3:4', index: '3:4', description: '3:4', fastIndex: 9.0, descriptionEn: '3:4' },
  { name: '2:3', index: '2:3', description: '2:3', fastIndex: 10.0, descriptionEn: '2:3' },
]);

interface RunningHubRunResponse {
  taskId?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  /** 无 auth 时返回的顶层错误格式 */
  code?: number;
  msg?: string;
}

interface RunningHubQueryResponse {
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  results?: Array<{ url?: string; download_url?: string }>;
  code?: number;
  msg?: string;
}

type ImageInput = {
  href: string;
  mimeType: string;
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** App ID 安全校验 — 仅允许字母数字下划线短横线，防止路径注入 */
const APP_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
function sanitizeAppId(appId: string | undefined, label: string): string {
  const trimmed = (appId || '').trim();
  if (!trimmed) throw new Error(`未配置 RunningHub ${label} App ID。请先在设置中填写。`);
  if (!APP_ID_PATTERN.test(trimmed)) throw new Error(`RunningHub ${label} App ID 包含非法字符，仅允许字母、数字、下划线和短横线。`);
  return trimmed;
}

function ensureRunningHubConfig(key?: UserApiKey): RunningHubConfig {
  if (!key?.key) {
    throw new Error('未配置 RunningHub API Key。请先在设置中保存。');
  }

  const config = key.runninghub;
  if (!config?.textToImageAppId?.trim()) {
    throw new Error('未配置 RunningHub 文生图 App ID。请先在设置中填写。');
  }
  // 校验 appId 格式（防止路径注入）
  sanitizeAppId(config.textToImageAppId, '文生图');

  return config;
}

function normalizeRetainSeconds(retainSeconds?: number) {
  if (!retainSeconds || Number.isNaN(retainSeconds)) return undefined;
  return Math.min(180, Math.max(10, Math.round(retainSeconds)));
}

function buildTextToImagePayload(prompt: string, config: RunningHubConfig) {
  const promptNodeId = config.promptNodeId?.trim() || '1';
  const promptFieldName = config.promptFieldName?.trim() || 'text';
  const modelNodeId = config.modelNodeId?.trim() || '4';
  const modelFieldName = config.modelFieldName?.trim() || 'model_selected';
  const aspectNodeId = config.aspectNodeId?.trim() || '4';
  const aspectFieldName = config.aspectFieldName?.trim() || 'aspect_rate';
  const promptTypeNodeId = config.promptTypeNodeId?.trim() || '17';
  const promptTypeFieldName = config.promptTypeFieldName?.trim() || 'select';

  return {
    nodeInfoList: [
      {
        nodeId: modelNodeId,
        fieldName: modelFieldName,
        fieldData: config.modelFieldDataJson?.trim() || RUNNINGHUB_MODEL_FIELD_DATA,
        fieldValue: config.model || 'Midjourney V7',
        description: '模型选择',
      },
      {
        nodeId: aspectNodeId,
        fieldName: aspectFieldName,
        fieldData: config.aspectFieldDataJson?.trim() || RUNNINGHUB_ASPECT_FIELD_DATA,
        fieldValue: config.aspectRatio || '16:9',
        description: '图片比例',
      },
      {
        nodeId: promptTypeNodeId,
        fieldName: promptTypeFieldName,
        fieldValue: config.promptTypeValue?.trim() || '1',
        description: '提示词类型',
      },
      {
        nodeId: promptNodeId,
        fieldName: promptFieldName,
        fieldValue: prompt,
        description: '提示词',
      },
    ],
    instanceType: config.instanceType || 'default',
    usePersonalQueue: config.usePersonalQueue ?? false,
    ...(normalizeRetainSeconds(config.retainSeconds) ? { retainSeconds: normalizeRetainSeconds(config.retainSeconds) } : {}),
    ...(config.webhookUrl ? { webhookUrl: config.webhookUrl } : {}),
  };
}

/**
 * 图生图 payload 构造
 * 将参考图作为 nodeInfoList 节点条目注入，nodeId/fieldName 来自用户配置。
 * RunningHub ComfyUI 工作流要求所有参数通过 nodeInfoList 传递。
 */
function buildImageToImagePayload(prompt: string, config: RunningHubConfig, images: string[]) {
  const imageNodeId = config.imageNodeId?.trim() || '2';
  const fieldName = config.imageInputFieldName?.trim() || 'images';
  const base = buildTextToImagePayload(prompt, config);
  return {
    ...base,
    nodeInfoList: [
      ...base.nodeInfoList,
      {
        nodeId: imageNodeId,
        fieldName,
        fieldValue: images.length === 1 ? images[0] : JSON.stringify(images),
        description: '参考图输入',
      },
    ],
  };
}

/**
 * 局部重绘 payload 构造
 * 将参考图和遮罩分别作为独立的 nodeInfoList 节点条目注入。
 */
function buildInpaintPayload(prompt: string, config: RunningHubConfig, images: string[], mask: string) {
  const imageNodeId = config.imageNodeId?.trim() || '2';
  const imageFieldName = config.imageInputFieldName?.trim() || 'images';
  const maskNodeId = config.maskNodeId?.trim() || imageNodeId;
  const maskFieldName = config.maskFieldName?.trim() || 'mask';
  const base = buildTextToImagePayload(prompt, config);
  return {
    ...base,
    nodeInfoList: [
      ...base.nodeInfoList,
      {
        nodeId: imageNodeId,
        fieldName: imageFieldName,
        fieldValue: images.length === 1 ? images[0] : JSON.stringify(images),
        description: '参考图输入',
      },
      {
        nodeId: maskNodeId,
        fieldName: maskFieldName,
        fieldValue: mask,
        description: '遮罩输入',
      },
    ],
  };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('无法读取 RunningHub 返回的图片数据。'));
    };
    reader.onerror = () => reject(new Error('读取 RunningHub 图片时失败。'));
    reader.readAsDataURL(blob);
  });
}

async function fetchResultAsBase64(resultUrl: string) {
  const response = await fetch(resultUrl);
  if (!response.ok) {
    throw new Error(`下载 RunningHub 结果失败 (${response.status})`);
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  const [, base64 = ''] = dataUrl.split(',');

  return {
    newImageBase64: base64,
    newImageMimeType: blob.type || 'image/png',
    textResponse: null,
  };
}

async function normalizeImageReference(image: ImageInput): Promise<string> {
  if (image.href.startsWith('data:')) {
    return image.href;
  }

  if (/^https?:\/\//i.test(image.href)) {
    return image.href;
  }

  const response = await fetch(image.href);
  if (!response.ok) {
    throw new Error(`读取参考图失败 (${response.status})`);
  }

  const blob = await response.blob();
  return blobToDataUrl(blob);
}

async function submitAndPollTask(apiKey: string, runUrl: string, payload: unknown) {
  const submitResponse = await fetch(runUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const submitJson = await submitResponse.json().catch(() => ({})) as RunningHubRunResponse;

  // RunningHub 总是返回 HTTP 200；认证失败体现在 body 中的 code/msg
  if (submitJson.code === 412 || submitJson.msg === 'TOKEN_INVALID') {
    throw new Error('RunningHub API Key 无效或权限不足，请在设置中检查。');
  }
  if (!submitResponse.ok || !submitJson.taskId) {
    throw new Error(submitJson.errorMessage || submitJson.msg || `RunningHub 提交任务失败 (${submitResponse.status})`);
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(5000);

    const queryResponse = await fetch(RUNNINGHUB_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ taskId: submitJson.taskId }),
    });

    const queryJson = await queryResponse.json().catch(() => ({})) as RunningHubQueryResponse;

    // 查询阶段的认证失败同样检查 body
    if (queryJson.code === 412 || queryJson.msg === 'TOKEN_INVALID') {
      throw new Error('RunningHub API Key 在轮询阶段失效，请检查 Key 状态。');
    }
    if (!queryResponse.ok) {
      throw new Error(queryJson.errorMessage || queryJson.msg || `RunningHub 查询任务失败 (${queryResponse.status})`);
    }

    if (queryJson.status === 'SUCCESS') {
      const resultUrl = queryJson.results?.[0]?.url || queryJson.results?.[0]?.download_url;
      if (!resultUrl) {
        throw new Error('RunningHub 任务已成功，但未返回结果图片地址。');
      }
      return fetchResultAsBase64(resultUrl);
    }

    if (queryJson.status === 'FAILED') {
      throw new Error(queryJson.errorMessage || 'RunningHub 任务执行失败。');
    }
  }

  throw new Error('RunningHub 任务超时，请稍后重试。');
}

/**
 * 验证 RunningHub API Key 有效性
 *
 * 策略：
 * 1. 先做格式校验（32 位字母数字字符串）
 * 2. 如果提供了 appId，向 /query 发送探测请求：
 *    - RunningHub API 总是返回 HTTP 200，认证结果在 body 里
 *    - 无 Authorization header → body {"code":412,"msg":"TOKEN_INVALID"}
 *    - 有 Authorization 但 key 无效 → body 里可能有 errorCode
 *    - 有效 key + 无效 taskId → body 里有 errorCode（正常，任务不存在）
 *    - 通过判断是否返回 TOKEN_INVALID 来区分 key 是否被接受
 */
export async function validateRunningHubApiKey(apiKey: string, appId?: string): Promise<{ ok: boolean; message?: string }> {
  const normalized = apiKey.trim();
  if (!/^[a-zA-Z0-9]{32}$/.test(normalized)) {
    return { ok: false, message: 'RunningHub API Key 应为 32 位字母数字字符串。' };
  }

  if (!appId?.trim()) {
    return { ok: true, message: 'API Key 格式已通过，请补充文生图 App ID 后开始使用。' };
  }

  try {
    const response = await fetch(RUNNINGHUB_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${normalized}`,
      },
      body: JSON.stringify({ taskId: '__validation_probe__' }),
    });

    // RunningHub 总是返回 200；如果意外返回非 200 也按鉴权失败处理
    if (!response.ok) {
      return { ok: false, message: `RunningHub 返回异常状态码 ${response.status}` };
    }

    const body = await response.json().catch(() => ({})) as Record<string, unknown>;

    // 无 Authorization header 或 key 格式不被接受时返回 code:412 + "TOKEN_INVALID"
    if (body.code === 412 || body.msg === 'TOKEN_INVALID') {
      return { ok: false, message: 'RunningHub API Key 无效或权限不足。' };
    }

    // 有 Authorization 且被服务器接受后，body 中会有 errorCode（因为探测 taskId 不存在，这是正常的）
    // 只要不是 TOKEN_INVALID，就认为 key 被接受
    return { ok: true, message: 'RunningHub 连接校验通过，可开始使用。' };
  } catch (error) {
    return { ok: false, message: `无法连接到 RunningHub：${error instanceof Error ? error.message : '网络错误'}` };
  }
}

export async function uploadRunningHubBinary(apiKey: string, file: Blob, fileName = 'upload.png') {
  const formData = new FormData();
  formData.append('file', file, fileName);

  const response = await fetch(RUNNINGHUB_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`上传文件到 RunningHub 失败 (${response.status}): ${text || response.statusText}`);
  }

  return response.json();
}

export async function generateImageWithRunningHub(
  prompt: string,
  key?: UserApiKey,
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null }> {
  if (!key?.key) {
    throw new Error('未配置 RunningHub API Key。请先在设置中保存。');
  }

  const config = ensureRunningHubConfig(key);
  const safeAppId = sanitizeAppId(config.textToImageAppId, '文生图');
  const runUrl = `${RUNNINGHUB_BASE_URL}/run/ai-app/${safeAppId}`;
  return submitAndPollTask(key.key, runUrl, buildTextToImagePayload(prompt, config));
}

export async function editImageWithRunningHub(
  images: ImageInput[],
  prompt: string,
  mask?: ImageInput,
  key?: UserApiKey,
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null }> {
  if (!key?.key) {
    throw new Error('未配置 RunningHub API Key。请先在设置中保存。');
  }

  const config = key.runninghub;
  const normalizedImages = await Promise.all(images.map(normalizeImageReference));
  if (mask) {
    const safeInpaintId = sanitizeAppId(config?.inpaintAppId, '局部重绘');
    const normalizedMask = await normalizeImageReference(mask);
    const runUrl = `${RUNNINGHUB_BASE_URL}/run/ai-app/${safeInpaintId}`;
    return submitAndPollTask(key.key, runUrl, buildInpaintPayload(prompt, config!, normalizedImages, normalizedMask));
  }

  const safeI2IId = sanitizeAppId(config?.imageToImageAppId, '图生图');
  const runUrl = `${RUNNINGHUB_BASE_URL}/run/ai-app/${safeI2IId}`;
  return submitAndPollTask(key.key, runUrl, buildImageToImagePayload(prompt, config!, normalizedImages));
}