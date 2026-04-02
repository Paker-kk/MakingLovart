/**
 * RunningHub API Service
 * Docs: https://www.runninghub.cn/ (ComfyUI-based API)
 */

const RH_BASE = 'https://www.runninghub.cn/openapi/v2';
const POLL_INTERVAL = 5000; // 5s
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

export interface RHTaskResult {
  url: string;
  nodeId: string;
  outputType: string; // png, mp4, txt, etc.
  text: string | null;
}

export interface RHTaskResponse {
  taskId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  errorCode: string;
  errorMessage: string;
  results: RHTaskResult[] | null;
  clientId: string;
  usage?: {
    consumeMoney: string | null;
    consumeCoins: string | null;
    taskCostTime: string;
    thirdPartyConsumeMoney: string | null;
  };
}

export interface RHSubmitPayload {
  imageUrls?: string[];
  prompt: string;
  resolution?: '1k' | '2k' | '4k';
  aspectRatio?: string;
  webhookUrl?: string;
  [key: string]: unknown; // allow extra params for custom models
}

function rhHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

/** Submit a task to a RunningHub model endpoint */
export async function rhSubmitTask(
  apiKey: string,
  modelEndpoint: string,
  payload: RHSubmitPayload,
): Promise<RHTaskResponse> {
  const url = modelEndpoint.startsWith('http')
    ? modelEndpoint
    : `${RH_BASE}/${modelEndpoint}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: rhHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RunningHub submit failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** Query task status */
export async function rhQueryTask(
  apiKey: string,
  taskId: string,
): Promise<RHTaskResponse> {
  const res = await fetch(`${RH_BASE}/query`, {
    method: 'POST',
    headers: rhHeaders(apiKey),
    body: JSON.stringify({ taskId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RunningHub query failed (${res.status}): ${text}`);
  }
  return res.json();
}

/** Upload a file and get a temporary URL (valid 24h) */
export async function rhUploadFile(
  apiKey: string,
  file: File | Blob,
  fileName?: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, fileName || 'upload.png');

  const res = await fetch(`${RH_BASE}/media/upload/binary`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RunningHub upload failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.data?.download_url || '';
}

/** Convert a data URL to a Blob for upload */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Upload a data URL image and get a temporary URL */
export async function rhUploadDataUrl(
  apiKey: string,
  dataUrl: string,
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type.split('/')[1] || 'png';
  return rhUploadFile(apiKey, blob, `upload.${ext}`);
}

/**
 * Submit a task and poll until completion.
 * Returns the final task response with results.
 */
export async function rhRunTask(
  apiKey: string,
  modelEndpoint: string,
  payload: RHSubmitPayload,
  onProgress?: (status: string, attempt: number) => void,
): Promise<RHTaskResponse> {
  const submitResult = await rhSubmitTask(apiKey, modelEndpoint, payload);
  const taskId = submitResult.taskId;

  if (!taskId) {
    throw new Error('RunningHub: No taskId returned');
  }

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const result = await rhQueryTask(apiKey, taskId);
    onProgress?.(result.status, i + 1);

    if (result.status === 'SUCCESS') return result;
    if (result.status === 'FAILED') {
      throw new Error(
        `RunningHub task failed: ${result.errorMessage || 'Unknown error'}`,
      );
    }
    // QUEUED or RUNNING — continue polling
  }

  throw new Error('RunningHub task timed out after polling');
}

/** Quick test: verify API key validity */
export async function rhTestApiKey(apiKey: string): Promise<boolean> {
  try {
    // Use a lightweight query with a dummy task ID to test auth
    const res = await fetch(`${RH_BASE}/query`, {
      method: 'POST',
      headers: rhHeaders(apiKey),
      body: JSON.stringify({ taskId: 'test-0000' }),
    });
    // If 401/403 → bad key; any other response (including 404 for bad taskId) → key works
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}
