/**
 * 通用异步轮询引擎
 *
 * 照搬 Tapnow Studio 的 pollAsyncTask 模式，实现一个与具体 API 解耦的
 * 通用异步任务提交 + 轮询 + 结果获取框架。
 *
 * ═══════════════════════════════════════════════════════════
 *  核心流程
 * ═══════════════════════════════════════════════════════════
 *
 *  ┌───────────┐     ┌───────────────┐     ┌───────────────┐
 *  │ 1. Submit │ ──▷ │ 2. Poll Loop  │ ──▷ │ 3. Fetch Result│
 *  │  (POST)   │     │  (GET/POST)   │     │   (GET)       │
 *  └───────────┘     └───────────────┘     └───────────────┘
 *       │                    │                     │
 *       ▼                    ▼                     ▼
 *   requestId          statusPath 取值       outputsPath 取值
 *                  → successValues → 步骤3   → outputsUrlField
 *                  → failureValues → 报错         → urls[]
 *                  → 其他 → sleep → 再轮询
 *
 * 每个步骤的请求都支持：
 *   - 模板变量替换（{{requestId}}、{{provider.key}} 等）
 *   - 自定义 headers
 *   - 自定义 body
 *
 * ═══════════════════════════════════════════════════════════
 *  与 Key 管理层联动
 * ═══════════════════════════════════════════════════════════
 *
 *  轮询过程中如遇到 401/402/403 → 立即终止，触发 Key 容错。
 *  配额耗尽 / 鉴权失效由调用方通过 onError 回调决定是否换 Key 重试。
 */

import {
  type TemplateVars,
  resolveTemplateObject,
  resolveTemplateVars,
  getValueByPath,
} from './templateEngine';

// ── 类型：请求配置 ──────────────────────────────────────

export interface AsyncRequestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

// ── 类型：异步轮询配置 ──────────────────────────────────

export interface AsyncPollingConfig {
  /** 是否启用异步模式 */
  enabled: boolean;

  /** 提交请求配置（获取 requestId） */
  submitRequest: AsyncRequestConfig;

  /** 从提交响应中提取 requestId 的 JSON 路径 */
  requestIdPath: string;

  /** 状态查询请求配置 */
  statusRequest: AsyncRequestConfig;

  /** 状态字段的 JSON 路径，如 'data.status' */
  statusPath: string;

  /** 成功状态值列表 */
  successValues: string[];

  /** 失败状态值列表 */
  failureValues: string[];

  /** 错误消息的 JSON 路径，如 'data.error_message' */
  errorPath?: string;

  /** 轮询间隔（毫秒），默认 3000 */
  pollIntervalMs: number;

  /** 最大轮询次数，默认 300（约 15 分钟） */
  maxAttempts: number;

  /** 结果获取请求配置（可选，不提供则从最后一次 status 响应取） */
  outputsRequest?: AsyncRequestConfig;

  /** 结果数组的 JSON 路径，如 'data.outputs' */
  outputsPath: string;

  /** 结果数组中每个元素的 URL 字段名，如 'url' */
  outputsUrlField: string;
}

// ── 类型：轮询结果 ──────────────────────────────────────

export interface PollResult {
  success: boolean;
  urls: string[];
  requestId: string;
  rawResponse?: unknown;
  error?: string;
}

// ── 类型：进度回调 ──────────────────────────────────────

export interface PollProgressCallback {
  (info: {
    phase: 'submit' | 'polling' | 'fetching_result' | 'done' | 'error';
    attempt?: number;
    maxAttempts?: number;
    status?: string;
    message?: string;
  }): void;
}

// ── 默认配置模板 ──────────────────────────────────────

export const DEFAULT_ASYNC_CONFIG: AsyncPollingConfig = {
  enabled: false,
  submitRequest: {
    endpoint: '/v1/generations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer {{provider.key}}',
    },
    body: {
      model: '{{model}}',
      prompt: '{{prompt}}',
      width: '{{width}}',
      height: '{{height}}',
    },
  },
  requestIdPath: 'data.id',
  statusRequest: {
    endpoint: '/v1/status?requestId={{requestId}}',
    method: 'GET',
    headers: {
      Authorization: 'Bearer {{provider.key}}',
    },
  },
  statusPath: 'data.status',
  successValues: ['completed', 'done', 'success'],
  failureValues: ['failed', 'error', 'cancelled'],
  errorPath: 'data.error_message',
  pollIntervalMs: 3000,
  maxAttempts: 300,
  outputsRequest: {
    endpoint: '/v1/outputs?requestId={{requestId}}',
    method: 'GET',
    headers: {
      Authorization: 'Bearer {{provider.key}}',
    },
  },
  outputsPath: 'data.outputs',
  outputsUrlField: 'url',
};

// ── 工具函数 ──────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 执行 HTTP 请求，根据 AsyncRequestConfig + 模板变量。
 * 返回解析后的 JSON 和 HTTP 状态码。
 */
async function executeRequest(
  config: AsyncRequestConfig,
  vars: TemplateVars,
  baseUrl: string,
): Promise<{ json: unknown; status: number }> {
  // 模板替换
  const resolvedEndpoint = resolveTemplateVars(config.endpoint, vars);
  const resolvedHeaders = config.headers
    ? resolveTemplateObject(config.headers, vars)
    : undefined;
  const resolvedBody = config.body
    ? resolveTemplateObject(config.body, vars)
    : undefined;

  const url = resolvedEndpoint.startsWith('http')
    ? resolvedEndpoint
    : `${baseUrl}${resolvedEndpoint}`;

  const fetchOptions: RequestInit = {
    method: config.method,
    headers: resolvedHeaders,
  };

  if (config.method !== 'GET' && resolvedBody) {
    fetchOptions.body = JSON.stringify(resolvedBody);
  }

  const response = await fetch(url, fetchOptions);
  const json = await response.json();
  return { json, status: response.status };
}

// ── 核心：异步轮询执行器 ──────────────────────────────────

/**
 * 执行完整的 异步提交 → 轮询等待 → 获取结果 流程。
 *
 * @param config     异步轮询配置
 * @param vars       模板变量（含 provider.key, prompt, model 等）
 * @param baseUrl    API 的基础 URL（如 'https://api.example.com'）
 * @param onProgress 可选的进度回调
 * @param signal     可选的 AbortSignal，用于取消轮询
 */
export async function pollAsyncTask(
  config: AsyncPollingConfig,
  vars: TemplateVars,
  baseUrl: string,
  onProgress?: PollProgressCallback,
  signal?: AbortSignal,
): Promise<PollResult> {
  // ── Step 1: 提交任务 ──
  onProgress?.({ phase: 'submit', message: '正在提交任务...' });

  const submitResult = await executeRequest(config.submitRequest, vars, baseUrl);

  // 检查 HTTP 级别错误
  if (submitResult.status === 401 || submitResult.status === 402 || submitResult.status === 403) {
    return {
      success: false,
      urls: [],
      requestId: '',
      rawResponse: submitResult.json,
      error: `认证失败 (HTTP ${submitResult.status})`,
    };
  }

  // 提取 requestId
  const requestId = getValueByPath(submitResult.json, config.requestIdPath);
  if (!requestId) {
    return {
      success: false,
      urls: [],
      requestId: '',
      rawResponse: submitResult.json,
      error: `提交成功但未获取到任务 ID (path: ${config.requestIdPath})`,
    };
  }

  const requestIdStr = String(requestId);

  // 将 requestId 注入模板变量，后续请求可用 {{requestId}}
  const pollVars: TemplateVars = { ...vars, requestId: requestIdStr };

  // ── Step 2: 轮询状态 ──
  let lastStatusResponse: unknown = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    // 检查取消信号
    if (signal?.aborted) {
      return {
        success: false,
        urls: [],
        requestId: requestIdStr,
        error: '任务已取消',
      };
    }

    onProgress?.({
      phase: 'polling',
      attempt,
      maxAttempts: config.maxAttempts,
      message: `轮询中 (${attempt}/${config.maxAttempts})...`,
    });

    await sleep(config.pollIntervalMs);

    const statusResult = await executeRequest(config.statusRequest, pollVars, baseUrl);
    lastStatusResponse = statusResult.json;

    // HTTP 认证错误 → 立即终止
    if (statusResult.status === 401 || statusResult.status === 402 || statusResult.status === 403) {
      return {
        success: false,
        urls: [],
        requestId: requestIdStr,
        rawResponse: statusResult.json,
        error: `轮询中认证失败 (HTTP ${statusResult.status})`,
      };
    }

    // 提取状态值
    const statusValue = String(getValueByPath(statusResult.json, config.statusPath) ?? '');

    // 检查失败
    if (config.failureValues.some((v) => v.toLowerCase() === statusValue.toLowerCase())) {
      const errorMsg = config.errorPath
        ? String(getValueByPath(statusResult.json, config.errorPath) ?? '未知错误')
        : '任务执行失败';
      return {
        success: false,
        urls: [],
        requestId: requestIdStr,
        rawResponse: statusResult.json,
        error: errorMsg,
      };
    }

    // 检查成功
    if (config.successValues.some((v) => v.toLowerCase() === statusValue.toLowerCase())) {
      break; // 跳出循环 → 步骤 3
    }

    // 其他状态 → 继续等待
    onProgress?.({
      phase: 'polling',
      attempt,
      maxAttempts: config.maxAttempts,
      status: statusValue,
      message: `状态: ${statusValue}`,
    });
  }

  // 超时检查
  // 如果循环正常结束（达到 maxAttempts），检查最后状态
  const lastStatus = String(
    getValueByPath(lastStatusResponse, config.statusPath) ?? '',
  );
  if (!config.successValues.some((v) => v.toLowerCase() === lastStatus.toLowerCase())) {
    return {
      success: false,
      urls: [],
      requestId: requestIdStr,
      rawResponse: lastStatusResponse,
      error: `轮询超时 (${config.maxAttempts} 次)，最后状态: ${lastStatus}`,
    };
  }

  // ── Step 3: 获取结果 ──
  onProgress?.({ phase: 'fetching_result', message: '正在获取结果...' });

  let outputResponse: unknown;

  if (config.outputsRequest) {
    // 有独立的结果获取请求
    const outputResult = await executeRequest(config.outputsRequest, pollVars, baseUrl);
    outputResponse = outputResult.json;
  } else {
    // 从最后一次状态响应中提取
    outputResponse = lastStatusResponse;
  }

  // 提取结果 URL 数组
  const outputs = getValueByPath(outputResponse, config.outputsPath);
  const urls: string[] = [];

  if (Array.isArray(outputs)) {
    for (const item of outputs) {
      if (typeof item === 'string') {
        urls.push(item);
      } else if (item && typeof item === 'object') {
        const url = (item as Record<string, unknown>)[config.outputsUrlField];
        if (typeof url === 'string') {
          urls.push(url);
        }
      }
    }
  } else if (typeof outputs === 'string') {
    urls.push(outputs);
  }

  onProgress?.({ phase: 'done', message: `完成，获取到 ${urls.length} 个结果` });

  return {
    success: true,
    urls,
    requestId: requestIdStr,
    rawResponse: outputResponse,
  };
}

// ── 请求链执行器 ──────────────────────────────────────

/**
 * 请求链步骤定义
 *
 * 每个步骤可以：
 * 1. 发起一个 HTTP 请求
 * 2. 从响应中 extract 变量
 * 3. 将变量注入后续步骤
 */
export interface RequestChainStep {
  id: string;
  type: 'http';
  onError: 'stop' | 'continue';
  request: AsyncRequestConfig;
  /** 从响应中提取变量：{ varName: 'json.path' } */
  extract?: Record<string, string>;
}

export interface RequestChainConfig {
  enabled: boolean;
  steps: RequestChainStep[];
}

export interface ChainResult {
  success: boolean;
  vars: TemplateVars;
  error?: string;
  /** 每一步的原始响应 */
  responses: Array<{ stepId: string; json: unknown; status: number }>;
}

/**
 * 执行请求链 —— 多步骤依次执行，前一步的提取变量注入后一步。
 *
 * 流程：
 * 1. 初始 vars = 调用方提供的变量集合
 * 2. 遍历 steps：
 *    a. 模板替换 → 发起请求
 *    b. 提取 extract 中定义的变量
 *    c. 合并到 vars
 * 3. 返回最终 vars + 所有响应
 *
 * @param chain    请求链配置
 * @param vars     初始模板变量
 * @param baseUrl  API 基础 URL
 */
export async function executeRequestChain(
  chain: RequestChainConfig,
  vars: TemplateVars,
  baseUrl: string,
): Promise<ChainResult> {
  const currentVars = { ...vars };
  const responses: ChainResult['responses'] = [];

  for (const step of chain.steps) {
    try {
      const result = await executeRequest(step.request, currentVars, baseUrl);
      responses.push({ stepId: step.id, json: result.json, status: result.status });

      // 提取变量
      if (step.extract) {
        for (const [varName, jsonPath] of Object.entries(step.extract)) {
          const value = getValueByPath(result.json, jsonPath);
          if (value !== undefined) {
            currentVars[varName] = value as string;
          }
        }
      }

      // HTTP 错误检查
      if (result.status >= 400) {
        if (step.onError === 'stop') {
          return {
            success: false,
            vars: currentVars,
            error: `步骤 "${step.id}" 失败 (HTTP ${result.status})`,
            responses,
          };
        }
        // onError === 'continue' → 记录但继续
        console.warn(`[requestChain] Step "${step.id}" failed with HTTP ${result.status}, continuing...`);
      }
    } catch (err) {
      if (step.onError === 'stop') {
        return {
          success: false,
          vars: currentVars,
          error: `步骤 "${step.id}" 异常: ${err instanceof Error ? err.message : String(err)}`,
          responses,
        };
      }
      console.warn(`[requestChain] Step "${step.id}" threw error, continuing...`, err);
      responses.push({ stepId: step.id, json: null, status: 0 });
    }
  }

  return { success: true, vars: currentVars, responses };
}
