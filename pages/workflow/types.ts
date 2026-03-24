/**
 * 节点工作流独立页面 —— Provider 配置类型
 *
 * 对齐 Tapnow Studio 的 Provider 配置模型，
 * 每个 Provider 定义了：
 * 1. 基础信息（名称、baseUrl、API Key）
 * 2. 同步/异步轮询配置
 * 3. 请求链配置（多步骤 API 调用）
 * 4. 节点映射（图片/视频/文本分别走哪个端点）
 */

import type { AsyncPollingConfig, RequestChainConfig } from '../../services/asyncPoller';

// ── Provider 定义 ──────────────────────────────────────

export interface ProviderEndpoint {
  /** 端点路径 (支持模板变量) */
  path: string;
  /** HTTP 方法 */
  method: 'GET' | 'POST' | 'PUT';
  /** 自定义 headers (支持模板变量) */
  headers?: Record<string, string>;
  /** 请求体模板 (支持模板变量) */
  bodyTemplate?: Record<string, unknown>;
}

export interface ProviderConfig {
  id: string;
  name: string;
  /** API Key（逗号分隔支持多 Key） */
  apiKeys: string;
  /** 基础 URL */
  baseUrl: string;
  /** 是否启用 */
  enabled: boolean;

  /** 图片生成端点 */
  imageEndpoint?: ProviderEndpoint;
  /** 视频生成端点 */
  videoEndpoint?: ProviderEndpoint;
  /** 文本生成端点 */
  textEndpoint?: ProviderEndpoint;

  /** 异步轮询配置 */
  asyncConfig?: AsyncPollingConfig;
  /** 请求链配置 */
  chainConfig?: RequestChainConfig;

  /** 供应商的错误码映射表 */
  errorCodeMapping?: Record<string, 'auth_expired' | 'quota_exhausted' | 'param_error' | 'throttled'>;
}

// ── 节点定义 ──────────────────────────────────────────

export type WorkflowNodeType =
  | 'provider'      // API 供应商节点
  | 'prompt'        // 提示词输入
  | 'imageInput'    // 图片输入（上传/URL）
  | 'generate'      // 生成执行节点
  | 'output'        // 输出预览
  | 'condition'     // 条件分支
  | 'merge';        // 合并节点

export interface WorkflowNodeData {
  id: string;
  type: WorkflowNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 节点标题 */
  title: string;
  /** 节点特有配置 */
  settings: Record<string, unknown>;
}

export interface WorkflowConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface WorkflowState {
  nodes: WorkflowNodeData[];
  connections: WorkflowConnection[];
  viewport: { x: number; y: number; scale: number };
}

// ── 执行状态 ──────────────────────────────────────────

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled';

export interface ExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  urls?: string[];
  error?: string;
  startTime: number;
  endTime?: number;
}
