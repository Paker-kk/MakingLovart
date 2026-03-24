/**
 * 节点工作流执行引擎
 *
 * 实现思路：
 * ═══════════════════════════════════════════════════════════
 *
 * 将 Tapnow 的 三级 Key 容错 + 异步轮询 + 模板引擎 串联起来，
 * 形成一个完整的"节点 → 执行 → 轮询 → 结果"管线。
 *
 * 执行流程（每个 generate 节点触发）：
 * ┌──────────────────────────────────────────────────────┐
 * │ 1. 收集上游输入（prompt、imageUrl、provider 等）    │
 * │ 2. selectKey: 多 Key 轮转 + 过滤暂停/黑名单       │
 * │ 3. buildStandardVars: 构建模板变量字典             │
 * │ 4. 判断走哪条路径：                                 │
 * │    a. requestChain → executeRequestChain            │
 * │    b. asyncConfig  → pollAsyncTask                  │
 * │    c. 直接同步请求                                   │
 * │ 5. 成功 → 输出结果到下游                             │
 * │    失败 → classifyError → handleKeyError            │
 * │           → shouldRetry? → 换 Key 重试步骤 2        │
 * │           → circuitBroken? → 向 UI 报熔断           │
 * └──────────────────────────────────────────────────────┘
 *
 * 重试策略：
 * - 最多重试 3 次（每次都会 selectKey 选新 Key）
 * - 遇到 param_error 立即停止不重试
 * - 熔断触发后停止所有重试
 */

import {
  selectKey,
  classifyError,
  handleKeyError,
  checkCircuitBreaker,
  type ErrorCategory,
} from '../../services/apiKeyManager';
import {
  pollAsyncTask,
  executeRequestChain,
  type PollProgressCallback,
} from '../../services/asyncPoller';
import {
  buildStandardVars,
  resolveTemplateObject,
  resolveTemplateVars,
  type TemplateVars,
} from '../../services/templateEngine';
import type {
  ProviderConfig,
  WorkflowNodeData,
  WorkflowConnection,
  ExecutionResult,
  ExecutionStatus,
} from './types';

// ── 常量 ──────────────────────────────────────────────

const MAX_RETRY = 3;

function parseCsvValues(raw: string | undefined): string[] {
  return String(raw ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function pickRandomItem<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

// ── 辅助：收集上游输入 ──────────────────────────────────

interface UpstreamInputs {
  prompt: string;
  imageUrls: string[];
  provider: ProviderConfig | null;
  model: string;
  width: number;
  height: number;
  ratio: string;
}

/**
 * 从工作流画布中收集指定节点的上游输入。
 * 沿着 connections 反向追溯：
 * - prompt 节点 → 取 settings.text
 * - imageInput 节点 → 取 settings.url
 * - provider 节点 → 取对应的 ProviderConfig
 */
export function collectUpstreamInputs(
  nodeId: string,
  nodes: WorkflowNodeData[],
  connections: WorkflowConnection[],
  providers: ProviderConfig[],
): UpstreamInputs {
  const result: UpstreamInputs = {
    prompt: '',
    imageUrls: [],
    provider: null,
    model: '',
    width: 1024,
    height: 1024,
    ratio: '1:1',
  };

  // 找到所有连入此节点的 connection
  const incoming = connections.filter((c) => c.toNodeId === nodeId);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const conn of incoming) {
    const sourceNode = nodeMap.get(conn.fromNodeId);
    if (!sourceNode) continue;

    switch (sourceNode.type) {
      case 'prompt':
        result.prompt = String(sourceNode.settings.text ?? '');
        break;

      case 'imageInput':
        if (sourceNode.settings.url) {
          result.imageUrls.push(String(sourceNode.settings.url));
        }
        break;

      case 'provider': {
        const providerId = String(sourceNode.settings.providerId ?? '');
        result.provider = providers.find((p) => p.id === providerId) ?? null;
        result.model = String(sourceNode.settings.model ?? '');
        break;
      }
    }
  }

  // 从生成节点自身的 settings 取宽高比等
  const genNode = nodeMap.get(nodeId);
  if (genNode) {
    result.width = Number(genNode.settings.width ?? 1024);
    result.height = Number(genNode.settings.height ?? 1024);
    result.ratio = String(genNode.settings.ratio ?? '1:1');
  }

  return result;
}

// ── 核心：执行单个生成节点 ──────────────────────────────

export interface ExecuteNodeOptions {
  nodeId: string;
  nodes: WorkflowNodeData[];
  connections: WorkflowConnection[];
  providers: ProviderConfig[];
  onProgress?: PollProgressCallback;
  onStatusChange?: (nodeId: string, status: ExecutionStatus, detail?: string) => void;
  signal?: AbortSignal;
}

/**
 * 执行单个 generate 节点的完整管线：
 * 收集输入 → Key 选择 → 模板构建 → 请求链/异步轮询/同步请求 → 容错重试
 */
export async function executeGenerateNode(
  options: ExecuteNodeOptions,
): Promise<ExecutionResult> {
  const { nodeId, nodes, connections, providers, onProgress, onStatusChange, signal } = options;
  const startTime = Date.now();

  onStatusChange?.(nodeId, 'running');

  // 1. 收集上游输入
  const inputs = collectUpstreamInputs(nodeId, nodes, connections, providers);

  if (!inputs.provider) {
    onStatusChange?.(nodeId, 'error', '未连接 Provider 节点');
    return { nodeId, status: 'error', error: '未连接 Provider 节点', startTime, endTime: Date.now() };
  }

  if (!inputs.provider.apiKeys) {
    onStatusChange?.(nodeId, 'error', 'Provider 未配置 API Key');
    return { nodeId, status: 'error', error: 'Provider 未配置 API Key', startTime, endTime: Date.now() };
  }

  // 2. 带重试的执行循环
  let lastError = '';
  const triedKeys = new Set<string>();

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    // 检查取消
    if (signal?.aborted) {
      onStatusChange?.(nodeId, 'cancelled');
      return { nodeId, status: 'cancelled', error: '已取消', startTime, endTime: Date.now() };
    }

    // 检查熔断
    if (checkCircuitBreaker()) {
      onStatusChange?.(nodeId, 'error', '熔断器已触发：短时间内大量配额耗尽错误');
      return {
        nodeId,
        status: 'error',
        error: '熔断器已触发：短时间内大量配额耗尽错误，请稍后再试',
        startTime,
        endTime: Date.now(),
      };
    }

    // 2a. 选择 Key（多 Key 轮转 + 过滤暂停/黑名单）
    const allKeys = parseCsvValues(inputs.provider.apiKeys);
    const untriedKeys = allKeys.filter(key => !triedKeys.has(key));
    const keySource = untriedKeys.length > 0 ? untriedKeys.join(',') : inputs.provider.apiKeys;
    const { key: selectedKey, degraded } = selectKey(keySource);
    triedKeys.add(selectedKey);

    const selectedBaseUrl = pickRandomItem(parseCsvValues(inputs.provider.baseUrl)) ?? inputs.provider.baseUrl;
    if (degraded) {
      console.warn(`[workflowEngine] 所有 Key 已不可用，降级使用: ${selectedKey.slice(0, 8)}...`);
    }

    // 2b. 构建模板变量
    const vars = buildStandardVars({
      providerKey: selectedKey,
      providerUrl: selectedBaseUrl,
      model: inputs.model,
      prompt: inputs.prompt,
      width: inputs.width,
      height: inputs.height,
      ratio: inputs.ratio,
      imageUrls: inputs.imageUrls,
    });

    try {
      // 2c. 选择执行路径
      const result = await executeWithProvider(inputs.provider, selectedBaseUrl, vars, onProgress, signal);

      if (result.success) {
        onStatusChange?.(nodeId, 'success');
        return {
          nodeId,
          status: 'success',
          urls: result.urls,
          startTime,
          endTime: Date.now(),
        };
      }

      // 执行失败 → 错误分类 + 容错
      lastError = result.error ?? '未知错误';
      const category = classifyErrorFromProvider(inputs.provider, result);
      const { shouldRetry, circuitBroken } = handleKeyError(selectedKey, category, lastError);

      if (circuitBroken) {
        onStatusChange?.(nodeId, 'error', '熔断器触发');
        return {
          nodeId,
          status: 'error',
          error: '熔断器触发：短时间内大量配额耗尽错误',
          startTime,
          endTime: Date.now(),
        };
      }

      if (!shouldRetry) {
        break; // 不可重试（如参数错误）
      }

      // 可重试 → 下一轮循环会选新 Key
      console.warn(
        `[workflowEngine] 第 ${attempt + 1} 次尝试失败 (${category}), 将换 Key 重试`,
      );
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // 网络错误等不可分类 → 直接重试
      console.warn(`[workflowEngine] 第 ${attempt + 1} 次尝试异常: ${lastError}`);
    }
  }

  // 所有重试用尽
  onStatusChange?.(nodeId, 'error', lastError);
  return {
    nodeId,
    status: 'error',
    error: lastError || '所有重试均失败',
    startTime,
    endTime: Date.now(),
  };
}

// ── 选择执行路径 ──────────────────────────────────────

interface ProviderResult {
  success: boolean;
  urls: string[];
  error?: string;
  httpStatus?: number;
  errorCode?: number | string;
  errorMessage?: string;
}

/**
 * 根据 Provider 配置选择执行路径：
 * 1. 请求链 (chainConfig) → 多步骤顺序执行
 * 2. 异步轮询 (asyncConfig) → 提交 + 轮询
 * 3. 同步请求 → 直接发 imageEndpoint
 */
async function executeWithProvider(
  provider: ProviderConfig,
  baseUrl: string,
  vars: TemplateVars,
  onProgress?: PollProgressCallback,
  signal?: AbortSignal,
): Promise<ProviderResult> {
  // 路径1: 请求链
  if (provider.chainConfig?.enabled && provider.chainConfig.steps.length > 0) {
    const chainResult = await executeRequestChain(provider.chainConfig, vars, baseUrl);

    if (!chainResult.success) {
      // 从最后一个响应中提取错误信息
      const lastResp = chainResult.responses[chainResult.responses.length - 1];
      return {
        success: false,
        urls: [],
        error: chainResult.error,
        httpStatus: lastResp?.status,
      };
    }

    // 链成功后，检查是否需要异步轮询
    if (provider.asyncConfig?.enabled) {
      // 将链的提取变量合并到 vars
      const mergedVars = { ...vars, ...chainResult.vars };
      return await executeAsyncPoll(provider, baseUrl, mergedVars, onProgress, signal);
    }

    // 链的最终结果直接是输出
    return { success: true, urls: [] };
  }

  // 路径2: 异步轮询
  if (provider.asyncConfig?.enabled) {
    return await executeAsyncPoll(provider, baseUrl, vars, onProgress, signal);
  }

  // 路径3: 同步请求
  return await executeSyncRequest(provider, baseUrl, vars);
}

/**
 * 异步轮询路径
 */
async function executeAsyncPoll(
  provider: ProviderConfig,
  baseUrl: string,
  vars: TemplateVars,
  onProgress?: PollProgressCallback,
  signal?: AbortSignal,
): Promise<ProviderResult> {
  const config = provider.asyncConfig!;
  const result = await pollAsyncTask(config, vars, baseUrl, onProgress, signal);

  return {
    success: result.success,
    urls: result.urls,
    error: result.error,
  };
}

/**
 * 同步请求路径 —— 一次 HTTP 调用直接返回结果。
 */
async function executeSyncRequest(
  provider: ProviderConfig,
  baseUrl: string,
  vars: TemplateVars,
): Promise<ProviderResult> {
  const endpoint = provider.imageEndpoint;
  if (!endpoint) {
    return { success: false, urls: [], error: '未配置图片生成端点' };
  }

  const url = resolveTemplateVars(endpoint.path, vars);
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const headers = endpoint.headers
    ? resolveTemplateObject(endpoint.headers, vars)
    : { 'Content-Type': 'application/json' };
  const body = endpoint.bodyTemplate
    ? resolveTemplateObject(endpoint.bodyTemplate, vars)
    : undefined;

  const response = await fetch(fullUrl, {
    method: endpoint.method,
    headers,
    body: endpoint.method !== 'GET' && body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();

  if (!response.ok) {
    return {
      success: false,
      urls: [],
      httpStatus: response.status,
      error: `HTTP ${response.status}`,
    };
  }

  // 尝试从 data.url / data.images / data.output 中提取 URL
  const urls = extractUrlsFromResponse(json);
  return { success: true, urls };
}

/**
 * 从各种格式的 JSON 响应中尽力提取图片 URL
 */
function extractUrlsFromResponse(json: unknown): string[] {
  if (!json || typeof json !== 'object') return [];
  const obj = json as Record<string, unknown>;
  const urls: string[] = [];

  // 常见格式: { data: [{ url: '...' }] }
  if (Array.isArray(obj.data)) {
    for (const item of obj.data) {
      if (typeof item === 'string') urls.push(item);
      else if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).url === 'string') {
        urls.push((item as Record<string, unknown>).url as string);
      }
    }
  }

  // 常见格式: { images: ['...'] }
  if (Array.isArray(obj.images)) {
    for (const item of obj.images) {
      if (typeof item === 'string') urls.push(item);
    }
  }

  // 常见格式: { output: { image_url: '...' } }
  if (obj.output && typeof obj.output === 'object') {
    const out = obj.output as Record<string, unknown>;
    if (typeof out.image_url === 'string') urls.push(out.image_url);
    if (typeof out.url === 'string') urls.push(out.url);
  }

  // 直接是 URL
  if (typeof obj.url === 'string') urls.push(obj.url);

  return urls;
}

// ── Provider 错误分类 ──────────────────────────────────

/**
 * 结合 Provider 自定义错误码映射 + 通用分类逻辑做错误分类
 */
function classifyErrorFromProvider(
  provider: ProviderConfig,
  result: ProviderResult,
): ErrorCategory {
  // 先检查自定义映射
  if (provider.errorCodeMapping && result.errorCode) {
    const mapped = provider.errorCodeMapping[String(result.errorCode)];
    if (mapped) return mapped;
  }

  // 回退到通用分类
  return classifyError(result.httpStatus, result.errorCode, result.errorMessage);
}

// ── 批量执行工作流 ──────────────────────────────────────

/**
 * 按拓扑序执行工作流中所有 generate 节点。
 * 简化版：目前仅找出所有 generate 节点顺序执行。
 */
export async function executeWorkflow(
  nodes: WorkflowNodeData[],
  connections: WorkflowConnection[],
  providers: ProviderConfig[],
  onProgress?: PollProgressCallback,
  onStatusChange?: (nodeId: string, status: ExecutionStatus, detail?: string) => void,
  signal?: AbortSignal,
): Promise<ExecutionResult[]> {
  const generateNodes = nodes.filter((n) => n.type === 'generate');
  const results: ExecutionResult[] = [];

  for (const node of generateNodes) {
    if (signal?.aborted) break;

    const result = await executeGenerateNode({
      nodeId: node.id,
      nodes,
      connections,
      providers,
      onProgress,
      onStatusChange,
      signal,
    });

    results.push(result);

    // 如果某个节点失败，不影响其余节点（允许部分成功）
    if (result.status === 'error') {
      console.warn(`[workflowEngine] Node ${node.id} failed: ${result.error}`);
    }
  }

  return results;
}
