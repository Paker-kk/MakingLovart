/**
 * 内置 Provider 预设配置
 *
 * 每个预设对应一类第三方 API 的适配方案。
 * 用户可在 UI 上基于预设快速创建 Provider，然后自定义修改。
 *
 * ═══════════════════════════════════════════════════════════
 *  预设列表：
 *  1. RunningHub      — ComfyUI 工作流，异步轮询
 *  2. OpenAI DALL·E   — 同步 /v1/images/generations
 *  3. 通义万相 (Qwen) — 异步提交 + 轮询
 *  4. 自定义 Provider — 空白模板
 * ═══════════════════════════════════════════════════════════
 */

import type { ProviderConfig } from './types';

/**
 * RunningHub 预设
 *
 * 适配逻辑：
 * - submitRequest → POST /task/openapi/create (提交 ComfyUI 工作流)
 * - statusRequest → POST /task/openapi/status (轮询任务状态)
 * - 结果直接从 status 响应的 data.outputs 字段获取
 * - RunningHub 始终返回 HTTP 200，需要解析 body 中的 code 字段
 * - code:412 / TOKEN_INVALID → auth_expired
 */
export const PRESET_RUNNINGHUB: Omit<ProviderConfig, 'id' | 'apiKeys'> = {
  name: 'RunningHub',
  baseUrl: '/runninghub-api',
  enabled: true,
  imageEndpoint: {
    path: '/task/openapi/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {{provider.key}}',
    },
    bodyTemplate: {
      workflowId: '{{model}}',
      nodeInfoList: [],
    },
  },
  asyncConfig: {
    enabled: true,
    submitRequest: {
      endpoint: '/task/openapi/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{provider.key}}',
      },
      body: {
        workflowId: '{{model}}',
        nodeInfoList: [],
      },
    },
    requestIdPath: 'data.taskId',
    statusRequest: {
      endpoint: '/task/openapi/status',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{provider.key}}',
      },
      body: {
        taskId: '{{requestId}}',
      },
    },
    statusPath: 'data.taskStatus',
    successValues: ['COMPLETED', 'completed'],
    failureValues: ['FAILED', 'failed', 'ERROR', 'error'],
    errorPath: 'data.errorReason',
    pollIntervalMs: 3000,
    maxAttempts: 200,
    outputsPath: 'data.outputs',
    outputsUrlField: 'fileUrl',
  },
  errorCodeMapping: {
    '412': 'auth_expired',
    '1007': 'param_error',
  },
};

/**
 * OpenAI DALL-E 预设
 *
 * 适配逻辑：
 * - 同步请求 POST /v1/images/generations
 * - 直接返回 { data: [{ url: '...' }] }
 * - 不需要异步轮询
 * - 标准 HTTP 状态码错误处理（401/402/429）
 */
export const PRESET_OPENAI: Omit<ProviderConfig, 'id' | 'apiKeys'> = {
  name: 'OpenAI DALL·E',
  baseUrl: 'https://api.openai.com',
  enabled: true,
  imageEndpoint: {
    path: '/v1/images/generations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {{provider.key}}',
    },
    bodyTemplate: {
      model: '{{model}}',
      prompt: '{{prompt}}',
      n: 1,
      size: '{{width}}x{{height}}',
    },
  },
};

/**
 * 通义万相 (Qwen Image) 预设
 *
 * 适配逻辑：
 * - 异步模式：POST /v1/services/aigc/text2image/image-synthesis 提交
 * - 轮询：GET /v1/tasks/{{requestId}} 查状态
 * - 结果从 output.results 数组取 url 字段
 * - DashScope 特有 header: X-DashScope-Async: enable
 */
export const PRESET_QWEN: Omit<ProviderConfig, 'id' | 'apiKeys'> = {
  name: '通义万相',
  baseUrl: 'https://dashscope.aliyuncs.com/api',
  enabled: true,
  asyncConfig: {
    enabled: true,
    submitRequest: {
      endpoint: '/v1/services/aigc/text2image/image-synthesis',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{provider.key}}',
        'X-DashScope-Async': 'enable',
      },
      body: {
        model: '{{model}}',
        input: {
          prompt: '{{prompt}}',
        },
        parameters: {
          size: '{{width}}*{{height}}',
          n: 1,
        },
      },
    },
    requestIdPath: 'output.task_id',
    statusRequest: {
      endpoint: '/v1/tasks/{{requestId}}',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer {{provider.key}}',
      },
    },
    statusPath: 'output.task_status',
    successValues: ['SUCCEEDED'],
    failureValues: ['FAILED'],
    errorPath: 'output.message',
    pollIntervalMs: 5000,
    maxAttempts: 120,
    outputsPath: 'output.results',
    outputsUrlField: 'url',
  },
  errorCodeMapping: {
    'Throttling': 'throttled',
    'InvalidApiKey': 'auth_expired',
  },
};

/**
 * 自定义 Provider 空白模板
 */
export const PRESET_CUSTOM: Omit<ProviderConfig, 'id' | 'apiKeys'> = {
  name: '自定义 Provider',
  baseUrl: '',
  enabled: true,
  imageEndpoint: {
    path: '/v1/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {{provider.key}}',
    },
    bodyTemplate: {
      model: '{{model}}',
      prompt: '{{prompt}}',
    },
  },
};

/**
 * 所有可用预设
 */
export const PROVIDER_PRESETS = {
  runninghub: PRESET_RUNNINGHUB,
  openai: PRESET_OPENAI,
  qwen: PRESET_QWEN,
  custom: PRESET_CUSTOM,
} as const;

export type PresetKey = keyof typeof PROVIDER_PRESETS;
