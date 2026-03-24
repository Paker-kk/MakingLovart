/**
 * 节点工作流页面状态管理
 *
 * 管理：
 * 1. Provider 列表（含配置、Key、启用状态）
 * 2. 工作流画布状态（节点、连线、视口）
 * 3. 执行状态（各节点运行结果）
 * 4. Key Manager 状态查询
 *
 * 持久化到 localStorage（Provider 配置 + 工作流布局）。
 * API Key 加密存储复用现有 keyVault。
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ProviderConfig,
  WorkflowNodeData,
  WorkflowConnection,
  ExecutionResult,
  ExecutionStatus,
} from './types';
import { PROVIDER_PRESETS, type PresetKey } from './presets';
import { executeWorkflow } from './workflowEngine';
import { getKeyManagerStatus, resetKeyManager, type KeyManagerStatus } from '../../services/apiKeyManager';

// ── 常量 ──────────────────────────────────────────────

const PROVIDERS_STORAGE_KEY = 'makinglovart.workflow.providers';
const WORKFLOW_STORAGE_KEY = 'makinglovart.workflow.graph';
const DEFAULT_VIEWPORT = { x: 80, y: 90, scale: 1 };

// ── 持久化辅助 ──────────────────────────────────────

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeViewport(candidate: unknown) {
  if (!candidate || typeof candidate !== 'object') {
    return { ...DEFAULT_VIEWPORT };
  }

  const view = candidate as Partial<typeof DEFAULT_VIEWPORT>;
  return {
    x: Number.isFinite(view.x) ? Number(view.x) : DEFAULT_VIEWPORT.x,
    y: Number.isFinite(view.y) ? Number(view.y) : DEFAULT_VIEWPORT.y,
    scale: Number.isFinite(view.scale) && Number(view.scale) > 0 ? Number(view.scale) : DEFAULT_VIEWPORT.scale,
  };
}

function loadWorkflowGraph() {
  const stored = loadJson<{ nodes?: WorkflowNodeData[]; connections?: WorkflowConnection[]; viewport?: typeof DEFAULT_VIEWPORT }>(WORKFLOW_STORAGE_KEY);
  return {
    nodes: Array.isArray(stored?.nodes) ? stored.nodes : DEFAULT_NODES,
    connections: Array.isArray(stored?.connections) ? stored.connections : DEFAULT_CONNECTIONS,
    viewport: normalizeViewport(stored?.viewport),
  };
}

// ── 默认工作流（初始画布布局） ──────────────────────────

const DEFAULT_NODES: WorkflowNodeData[] = [
  {
    id: 'provider_1',
    type: 'provider',
    x: 100,
    y: 200,
    width: 260,
    height: 140,
    title: 'API Provider',
    settings: { providerId: '', model: '' },
  },
  {
    id: 'prompt_1',
    type: 'prompt',
    x: 100,
    y: 420,
    width: 260,
    height: 120,
    title: 'Prompt',
    settings: { text: '' },
  },
  {
    id: 'generate_1',
    type: 'generate',
    x: 500,
    y: 280,
    width: 280,
    height: 160,
    title: 'Generate',
    settings: { width: 1024, height: 1024, ratio: '1:1' },
  },
  {
    id: 'output_1',
    type: 'output',
    x: 900,
    y: 280,
    width: 260,
    height: 200,
    title: 'Output',
    settings: {},
  },
];

const DEFAULT_CONNECTIONS: WorkflowConnection[] = [
  { id: 'conn_1', fromNodeId: 'provider_1', fromPortId: 'out', toNodeId: 'generate_1', toPortId: 'provider' },
  { id: 'conn_2', fromNodeId: 'prompt_1', fromPortId: 'out', toNodeId: 'generate_1', toPortId: 'prompt' },
  { id: 'conn_3', fromNodeId: 'generate_1', fromPortId: 'out', toNodeId: 'output_1', toPortId: 'in' },
];

// ── Hook ──────────────────────────────────────────────

export function useWorkflowPageStore() {
  // ━━ Providers ━━
  const [providers, setProviders] = useState<ProviderConfig[]>(() => {
    return loadJson<ProviderConfig[]>(PROVIDERS_STORAGE_KEY) ?? [];
  });

  const saveProviders = useCallback((next: ProviderConfig[]) => {
    setProviders(next);
    saveJson(PROVIDERS_STORAGE_KEY, next);
  }, []);

  const addProvider = useCallback(
    (preset: PresetKey, apiKeys: string) => {
      const base = PROVIDER_PRESETS[preset];
      const newProvider: ProviderConfig = {
        ...base,
        id: `provider_${makeId()}`,
        apiKeys,
      };
      saveProviders([...providers, newProvider]);
      return newProvider.id;
    },
    [providers, saveProviders],
  );

  const updateProvider = useCallback(
    (id: string, patch: Partial<ProviderConfig>) => {
      saveProviders(
        providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    [providers, saveProviders],
  );

  const removeProvider = useCallback(
    (id: string) => {
      saveProviders(providers.filter((p) => p.id !== id));
    },
    [providers, saveProviders],
  );

  // ━━ Workflow (nodes + connections) ━━
  const initialGraph = loadWorkflowGraph();
  const [nodes, setNodes] = useState<WorkflowNodeData[]>(() => initialGraph.nodes);
  const [connections, setConnections] = useState<WorkflowConnection[]>(() => initialGraph.connections);
  const [viewport, setViewport] = useState(() => initialGraph.viewport);

  const saveWorkflow = useCallback(
    (nextNodes: WorkflowNodeData[], nextConns: WorkflowConnection[], nextViewport = viewport) => {
      saveJson(WORKFLOW_STORAGE_KEY, { nodes: nextNodes, connections: nextConns, viewport: nextViewport });
    },
    [viewport],
  );

  const updateViewport = useCallback((nextViewport: typeof DEFAULT_VIEWPORT) => {
    setViewport(nextViewport);
    saveWorkflow(nodes, connections, nextViewport);
  }, [connections, nodes, saveWorkflow]);

  const updateNode = useCallback(
    (nodeId: string, patch: Partial<WorkflowNodeData>) => {
      setNodes((prev) => {
        const next = prev.map((n) => (n.id === nodeId ? { ...n, ...patch } : n));
        saveWorkflow(next, connections, viewport);
        return next;
      });
    },
    [connections, saveWorkflow, viewport],
  );

  const updateNodeSettings = useCallback(
    (nodeId: string, settingsPatch: Record<string, unknown>) => {
      setNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId ? { ...n, settings: { ...n.settings, ...settingsPatch } } : n,
        );
        saveWorkflow(next, connections, viewport);
        return next;
      });
    },
    [connections, saveWorkflow, viewport],
  );

  const addNode = useCallback(
    (node: WorkflowNodeData) => {
      setNodes((prev) => {
        const next = [...prev, node];
        saveWorkflow(next, connections, viewport);
        return next;
      });
    },
    [connections, saveWorkflow, viewport],
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => {
        const nextNodes = prev.filter((n) => n.id !== nodeId);
        const nextConns = connections.filter(
          (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId,
        );
        setConnections(nextConns);
        saveWorkflow(nextNodes, nextConns, viewport);
        return nextNodes;
      });
    },
    [connections, saveWorkflow, viewport],
  );

  const addConnection = useCallback(
    (conn: WorkflowConnection) => {
      setConnections((prev) => {
        // 同一个输入端口只允许一条连线
        const filtered = prev.filter(
          (c) => !(c.toNodeId === conn.toNodeId && c.toPortId === conn.toPortId),
        );
        const next = [...filtered, conn];
        saveWorkflow(nodes, next, viewport);
        return next;
      });
    },
    [nodes, saveWorkflow, viewport],
  );

  const removeConnection = useCallback(
    (connId: string) => {
      setConnections((prev) => {
        const next = prev.filter((c) => c.id !== connId);
        saveWorkflow(nodes, next, viewport);
        return next;
      });
    },
    [nodes, saveWorkflow, viewport],
  );

  // ━━ 执行状态 ━━
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runWorkflow = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setExecutionResults([]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const results = await executeWorkflow(
        nodes,
        connections,
        providers,
        // onProgress
        (info) => {
          console.log(`[workflow] ${info.phase}: ${info.message ?? ''}`);
        },
        // onStatusChange
        (nodeId, status, detail) => {
          setExecutionResults((prev) => {
            const existing = prev.find((r) => r.nodeId === nodeId);
            if (existing) {
              return prev.map((r) =>
                r.nodeId === nodeId ? { ...r, status, error: detail } : r,
              );
            }
            return [...prev, { nodeId, status, startTime: Date.now(), error: detail }];
          });
        },
        controller.signal,
      );

      setExecutionResults(results);
    } finally {
      setIsExecuting(false);
      abortRef.current = null;
    }
  }, [isExecuting, nodes, connections, providers]);

  const cancelExecution = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ━━ Key Manager 状态查询 ━━
  const [keyStatus, setKeyStatus] = useState<KeyManagerStatus | null>(null);

  const refreshKeyStatus = useCallback(() => {
    setKeyStatus(getKeyManagerStatus());
  }, []);

  const resetKeys = useCallback(() => {
    resetKeyManager();
    setKeyStatus(getKeyManagerStatus());
  }, []);

  return {
    // providers
    providers,
    addProvider,
    updateProvider,
    removeProvider,

    // workflow
    nodes,
    connections,
    viewport,
    setViewport: updateViewport,
    updateNode,
    updateNodeSettings,
    addNode,
    removeNode,
    addConnection,
    removeConnection,

    // execution
    executionResults,
    isExecuting,
    runWorkflow,
    cancelExecution,

    // key manager
    keyStatus,
    refreshKeyStatus,
    resetKeys,
  };
}
