import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorkflowPageStore } from './useWorkflowPageStore';
import { useWorkspaceStore } from '../../src/store/workspace-store';
import type { PresetKey } from './presets';
import { PROVIDER_PRESETS } from './presets';
import type { ExecutionStatus, ProviderConfig, WorkflowNodeData, WorkflowNodeType } from './types';

const RIGHT_PANEL_W = 360;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const WORLD_CANVAS_W = 8000;
const WORLD_CANVAS_H = 6000;

const inputPortPos = (node: WorkflowNodeData) => ({ x: node.x, y: node.y + node.height / 2 });
const outputPortPos = (node: WorkflowNodeData) => ({ x: node.x + node.width, y: node.y + node.height / 2 });

const STATUS_LABEL: Record<ExecutionStatus, string> = {
  idle: '待命',
  running: '执行中…',
  success: '完成',
  error: '失败',
  cancelled: '取消',
};

const NODE_CATALOG: Record<WorkflowNodeType, { icon: string; label: string; accentClass: string; defaultW: number; defaultH: number; defaultSettings: Record<string, unknown> }> = {
  provider: { icon: '⚡', label: 'Provider', accentClass: 'tn-accent-amber', defaultW: 300, defaultH: 164, defaultSettings: { providerId: '', model: '' } },
  prompt: { icon: '✎', label: 'Prompt', accentClass: 'tn-accent-blue', defaultW: 340, defaultH: 220, defaultSettings: { text: '' } },
  imageInput: { icon: '🖼', label: 'Image Input', accentClass: 'tn-accent-emerald', defaultW: 300, defaultH: 220, defaultSettings: { url: '' } },
  generate: { icon: '◈', label: 'Generate', accentClass: 'tn-accent-violet', defaultW: 380, defaultH: 240, defaultSettings: { width: 1024, height: 1024, ratio: '1:1' } },
  output: { icon: '◉', label: 'Output', accentClass: 'tn-accent-cyan', defaultW: 300, defaultH: 220, defaultSettings: {} },
  condition: { icon: '◇', label: 'Condition', accentClass: 'tn-accent-yellow', defaultW: 240, defaultH: 150, defaultSettings: {} },
  merge: { icon: '⟗', label: 'Merge', accentClass: 'tn-accent-pink', defaultW: 240, defaultH: 150, defaultSettings: {} },
};

interface NodeWorkflowPageProps {
  onBack?: () => void;
  embedded?: boolean;
}

const ProviderSection: React.FC<{
  providers: ProviderConfig[];
  onAdd: (preset: PresetKey, keys: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ProviderConfig>) => void;
}> = ({ providers, onAdd, onRemove, onUpdate }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [presetKey, setPresetKey] = useState<PresetKey>('runninghub');
  const [apiKeys, setApiKeys] = useState('');

  const handleAdd = () => {
    if (!apiKeys.trim()) return;
    onAdd(presetKey, apiKeys.trim());
    setApiKeys('');
    setShowAdd(false);
  };

  return (
    <div className="tn-panel-section">
      <div className="tn-section-head">
        <span className="tn-section-label">Providers</span>
        <button type="button" onClick={() => setShowAdd(prev => !prev)} className="tn-chip-btn">
          {showAdd ? '收起' : '+ 添加'}
        </button>
      </div>

      {showAdd && (
        <div className="tn-add-form">
          <select
            className="tn-input"
            value={presetKey}
            onChange={event => setPresetKey(event.target.value as PresetKey)}
            title="选择 Provider 预设"
            aria-label="选择 Provider 预设"
          >
            {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.name}</option>
            ))}
          </select>
          <textarea
            className="tn-input tn-textarea"
            rows={3}
            value={apiKeys}
            onChange={event => setApiKeys(event.target.value)}
            placeholder="输入 API Key，多个用逗号分隔"
          />
          <div className="tn-form-actions">
            <button type="button" className="tn-btn-primary" onClick={handleAdd}>保存</button>
            <button type="button" className="tn-btn-secondary" onClick={() => setShowAdd(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="tn-provider-list">
        {providers.length === 0 ? (
          <p className="tn-empty-hint">暂无 Provider，点击上方添加</p>
        ) : providers.map(provider => (
          <div key={provider.id} className="tn-provider-card">
            <div className="tn-provider-head">
              <span className="tn-provider-name">{provider.name}</span>
              <button type="button" onClick={() => onRemove(provider.id)} className="tn-danger-link">删除</button>
            </div>
            <div className="tn-provider-meta">{provider.baseUrl || '—'} · {provider.apiKeys.split(',').filter(Boolean).length} Keys</div>
            <textarea
              className="tn-input tn-textarea tn-textarea-sm"
              rows={2}
              value={provider.apiKeys}
              onChange={event => onUpdate(provider.id, { apiKeys: event.target.value })}
              placeholder="多个 Key 用逗号分隔"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const KeyHealthSection: React.FC<{
  keyStatus: ReturnType<typeof useWorkflowPageStore>['keyStatus'];
  onRefresh: () => void;
  onReset: () => void;
}> = ({ keyStatus, onRefresh, onReset }) => {
  useEffect(() => {
    onRefresh();
    const timer = window.setInterval(onRefresh, 10000);
    return () => window.clearInterval(timer);
  }, [onRefresh]);

  return (
    <div className="tn-panel-section">
      <div className="tn-section-head">
        <span className="tn-section-label">Key Health</span>
        <div className="tn-section-actions">
          <button type="button" onClick={onRefresh} className="tn-chip-btn">刷新</button>
          <button type="button" onClick={onReset} className="tn-chip-btn">重置</button>
        </div>
      </div>
      {!keyStatus ? (
        <p className="tn-empty-hint">载入中…</p>
      ) : (
        <div className="tn-stat-grid">
          <div className={`tn-stat-card ${keyStatus.circuitBroken ? 'is-danger' : ''}`}>
            <span>熔断器</span>
            <strong className={keyStatus.circuitBroken ? 'tn-text-red' : 'tn-text-green'}>{keyStatus.circuitBroken ? '已触发' : '正常'}</strong>
          </div>
          <div className="tn-stat-card">
            <span>暂停 Key</span>
            <strong>{keyStatus.suspendedKeys.length}</strong>
          </div>
          <div className="tn-stat-card">
            <span>黑名单</span>
            <strong>{keyStatus.blacklistedKeys.length}</strong>
          </div>
          <div className="tn-stat-card">
            <span>配额异常</span>
            <strong>{keyStatus.recentQuotaErrors}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

const NodeCard: React.FC<{
  node: WorkflowNodeData;
  selected: boolean;
  providers: ProviderConfig[];
  status: ExecutionStatus;
  onUpdateSettings: (nodeId: string, patch: Record<string, unknown>) => void;
  onMouseDownNode: (event: React.PointerEvent, nodeId: string) => void;
  onMouseDownPort: (event: React.PointerEvent, nodeId: string, isOutput: boolean) => void;
  onDelete: (nodeId: string) => void;
}> = ({ node, selected, providers, status, onUpdateSettings, onMouseDownNode, onMouseDownPort, onDelete }) => {
  const catalog = NODE_CATALOG[node.type];

  return (
    <div
      className={`tn-node ${selected ? 'is-selected' : ''}`}
      style={{ left: node.x, top: node.y, width: node.width, minHeight: node.height, zIndex: selected ? 20 : 10 }}
      onPointerDown={event => {
        const target = event.target as HTMLElement;
        const tag = target.tagName;
        if (target.dataset.port || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
        onMouseDownNode(event, node.id);
      }}
    >
      <button type="button" className="tn-node-delete" onClick={() => onDelete(node.id)} title="删除节点">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div
        data-port="input"
        className="tn-port tn-port-input"
        onPointerDown={event => {
          event.preventDefault();
          event.stopPropagation();
          onMouseDownPort(event, node.id, false);
        }}
      />

      <div
        data-port="output"
        className="tn-port tn-port-output"
        onPointerDown={event => {
          event.preventDefault();
          event.stopPropagation();
          onMouseDownPort(event, node.id, true);
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>

      <div className="tn-node-head">
        <span className={`tn-node-icon ${catalog.accentClass}`}>{catalog.icon}</span>
        <span className="tn-node-title">{node.title}</span>
        <span className="tn-node-type-label">{catalog.label}</span>
      </div>

      <div className="tn-node-body">
        {node.type === 'prompt' && (
          <textarea
            className="tn-input tn-textarea tn-node-textarea"
            rows={5}
            value={String(node.settings.text ?? '')}
            onChange={event => onUpdateSettings(node.id, { text: event.target.value })}
            placeholder="写下提示词、镜头语言、风格要求…"
          />
        )}

        {node.type === 'provider' && (
          <select
            className="tn-input"
            value={String(node.settings.providerId ?? '')}
            onChange={event => onUpdateSettings(node.id, { providerId: event.target.value })}
            title="选择 Provider"
            aria-label="选择 Provider"
          >
            <option value="">选择 Provider...</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>{provider.name}</option>
            ))}
          </select>
        )}

        {node.type === 'imageInput' && (
          <textarea
            className="tn-input tn-textarea"
            rows={4}
            value={String(node.settings.url ?? '')}
            onChange={event => onUpdateSettings(node.id, { url: event.target.value })}
            placeholder="粘贴图片 URL 或 data URL"
          />
        )}

        {node.type === 'generate' && (
          <div className="tn-gen-stats">
            <div className="tn-gen-row">
              <span>尺寸</span>
              <span className="tn-gen-value">{String(node.settings.width ?? 1024)} × {String(node.settings.height ?? 1024)}</span>
            </div>
            <div className="tn-gen-row">
              <span>比例</span>
              <select
                className="tn-gen-select"
                value={String(node.settings.ratio ?? '1:1')}
                onChange={event => onUpdateSettings(node.id, { ratio: event.target.value })}
                title="比例"
                aria-label="比例"
              >
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
              </select>
            </div>
            <div className="tn-gen-row">
              <span>状态</span>
              <span className={`tn-status-dot ${status}`}>{STATUS_LABEL[status]}</span>
            </div>
          </div>
        )}

        {node.type === 'output' && (
          <div className="tn-preview-box">结果预览</div>
        )}

        {!['prompt', 'provider', 'generate', 'output', 'imageInput'].includes(node.type) && (
          <div className="tn-gen-row">
            <span>{catalog.label} 节点</span>
            <span className={`tn-status-dot ${status}`}>{STATUS_LABEL[status]}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const NodeWorkflowPage: React.FC<NodeWorkflowPageProps> = ({ onBack, embedded = false }) => {
  const store = useWorkflowPageStore();
  const setFocusedNodeId = useWorkspaceStore(state => state.setFocusedNodeId);
  const setPromptScope = useWorkspaceStore(state => state.setPromptScope);
  const setNodePromptDraft = useWorkspaceStore(state => state.setNodePromptDraft);

  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(store.viewport);
  const nodesRef = useRef(store.nodes);
  const selectionBoxRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const selectedNodeIdsRef = useRef<Set<string>>(new Set());
  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const pendingPanUpdate = useRef<{ dx: number; dy: number } | null>(null);
  const panRafRef = useRef<number | null>(null);
  const selectionRafRef = useRef<number | null>(null);
  const pendingSelectionUpdate = useRef<{ endX: number; endY: number; rect: DOMRect | null } | null>(null);
  const nodeUpdateRef = useRef<{ nodeId: string; updater: (node: WorkflowNodeData) => WorkflowNodeData } | null>(null);
  const multiNodeUpdateRef = useRef<Array<{ nodeId: string; updater: (node: WorkflowNodeData) => WorkflowNodeData }> | null>(null);
  const nodeUpdateRafRef = useRef<number | null>(null);
  const multiNodeDragStartPos = useRef<{ mouseX: number; mouseY: number; nodes: Map<string, { x: number; y: number }> } | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isCompactToolbar, setIsCompactToolbar] = useState(false);
  const [isMobileToolbar, setIsMobileToolbar] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [connectingTarget, setConnectingTarget] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const execMap = useMemo(() => new Map(store.executionResults.map(result => [result.nodeId, result.status])), [store.executionResults]);
  const selectedNode = useMemo(() => store.nodes.find(node => node.id === selectedNodeId) ?? null, [selectedNodeId, store.nodes]);
  const viewport = store.viewport;

  useEffect(() => {
    viewportRef.current = store.viewport;
  }, [store.viewport]);

  useEffect(() => {
    nodesRef.current = store.nodes;
  }, [store.nodes]);

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  useEffect(() => {
    selectionBoxRef.current = selectionBox;
  }, [selectionBox]);

  useEffect(() => {
    const updateLayoutMode = () => {
      const width = window.innerWidth;
      setIsCompactToolbar(width < 1280);
      setIsMobileToolbar(width < 900);
      if (width < 1100) {
        setRightPanelOpen(false);
      }
    };

    updateLayoutMode();
    window.addEventListener('resize', updateLayoutMode);
    return () => window.removeEventListener('resize', updateLayoutMode);
  }, []);

  const appendLog = useCallback((message: string) => {
    setLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const currentView = viewportRef.current;
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: (clientX - rect.left - currentView.x) / currentView.scale,
      y: (clientY - rect.top - currentView.y) / currentView.scale,
    };
  }, []);

  const flushNodeUpdate = useCallback(() => {
    if (multiNodeUpdateRef.current) {
      const updates = multiNodeUpdateRef.current;
      multiNodeUpdateRef.current = null;
      nodeUpdateRafRef.current = null;
      updates.forEach(({ nodeId, updater }) => {
        const current = nodesRef.current.find(node => node.id === nodeId);
        if (!current) return;
        store.updateNode(nodeId, updater(current));
      });
      return;
    }

    if (nodeUpdateRef.current) {
      const { nodeId, updater } = nodeUpdateRef.current;
      nodeUpdateRef.current = null;
      nodeUpdateRafRef.current = null;
      const current = nodesRef.current.find(node => node.id === nodeId);
      if (!current) return;
      store.updateNode(nodeId, updater(current));
      return;
    }

    nodeUpdateRafRef.current = null;
  }, [store]);

  const scheduleNodeUpdate = useCallback((nodeId: string, updater: (node: WorkflowNodeData) => WorkflowNodeData) => {
    nodeUpdateRef.current = { nodeId, updater };
    if (!nodeUpdateRafRef.current) {
      nodeUpdateRafRef.current = window.requestAnimationFrame(flushNodeUpdate);
    }
  }, [flushNodeUpdate]);

  const scheduleMultiNodeUpdate = useCallback((updates: Array<{ nodeId: string; updater: (node: WorkflowNodeData) => WorkflowNodeData }>) => {
    multiNodeUpdateRef.current = updates;
    if (!nodeUpdateRafRef.current) {
      nodeUpdateRafRef.current = window.requestAnimationFrame(flushNodeUpdate);
    }
  }, [flushNodeUpdate]);

  const visibleNodes = useMemo(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return store.nodes;
    const padding = 220;
    const currentView = viewportRef.current;
    const viewportLeft = (-currentView.x - padding) / currentView.scale;
    const viewportRight = (rect.width - currentView.x + padding) / currentView.scale;
    const viewportTop = (-currentView.y - padding) / currentView.scale;
    const viewportBottom = (rect.height - currentView.y + padding) / currentView.scale;

    return store.nodes.filter(node => {
      const right = node.x + node.width;
      const bottom = node.y + node.height;
      return node.x < viewportRight && right > viewportLeft && node.y < viewportBottom && bottom > viewportTop;
    });
  }, [store.nodes, viewport.x, viewport.y, viewport.scale]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentView = viewportRef.current;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentView.scale * zoomFactor));
    const ratio = scale / currentView.scale;
    store.setViewport({
      x: mouseX - (mouseX - currentView.x) * ratio,
      y: mouseY - (mouseY - currentView.y) * ratio,
      scale,
    });
  }, [store]);

  const handleCanvasPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.tn-node')) return;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;

    if (event.ctrlKey || event.metaKey) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const startX = event.clientX - (rect?.left || 0);
      const startY = event.clientY - (rect?.top || 0);
      setIsSelecting(true);
      isSelectingRef.current = true;
      setSelectionBox({ startX, startY, endX: startX, endY: startY });
      setSelectedNodeId(null);
      setSelectedNodeIds(new Set());
      return;
    }

    setSelectedNodeId(null);
    setSelectedNodeIds(new Set());
    setIsPanning(true);
    isPanningRef.current = true;
    setIsDragging(false);
    lastMousePos.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleNodePointerDown = useCallback((event: React.PointerEvent, nodeId: string) => {
    const node = nodesRef.current.find(item => item.id === nodeId);
    if (!node) return;

    if (event.ctrlKey || event.metaKey) {
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return next;
      });
    } else {
      setSelectedNodeIds(prev => (prev.size > 1 && prev.has(nodeId) ? prev : new Set([nodeId])));
    }

    setSelectedNodeId(nodeId);
    setDragNodeId(nodeId);
    setIsDragging(true);
    multiNodeDragStartPos.current = null;
    lastMousePos.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handlePortPointerDown = useCallback((event: React.PointerEvent, nodeId: string, isOutput: boolean) => {
    const world = toWorld(event.clientX, event.clientY);
    setMousePos(world);
    if (isOutput) {
      setConnectingSource(nodeId);
      setConnectingTarget(null);
    } else {
      setConnectingTarget(nodeId);
      setConnectingSource(null);
    }
  }, [toWorld]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    store.removeNode(nodeId);
    appendLog(`已删除节点 ${nodeId}`);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setSelectedNodeIds(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, [appendLog, selectedNodeId, store]);

  const handleUpdateNodeSettings = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    store.updateNodeSettings(nodeId, patch);
    const node = nodesRef.current.find(item => item.id === nodeId);
    if (node?.type === 'prompt' && typeof patch.text === 'string') {
      setFocusedNodeId(nodeId);
      setPromptScope('node');
      setNodePromptDraft(patch.text);
    }
  }, [setFocusedNodeId, setNodePromptDraft, setPromptScope, store]);

  useEffect(() => {
    if (!selectedNode) {
      setFocusedNodeId(null);
      setPromptScope('global');
      setNodePromptDraft('');
      return;
    }

    setFocusedNodeId(selectedNode.id);
    if (selectedNode.type === 'prompt') {
      setPromptScope('node');
      setNodePromptDraft(String(selectedNode.settings.text ?? ''));
    } else {
      setPromptScope('global');
      setNodePromptDraft('');
    }
  }, [selectedNode, setFocusedNodeId, setNodePromptDraft, setPromptScope]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const world = toWorld(event.clientX, event.clientY);
      setMousePos(world);

      if (isSelecting || isSelectingRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect() || null;
        const endX = event.clientX - (rect?.left || 0);
        const endY = event.clientY - (rect?.top || 0);
        setSelectionBox(prev => (prev ? { ...prev, endX, endY } : null));
        pendingSelectionUpdate.current = { endX, endY, rect };

        if (!selectionRafRef.current) {
          selectionRafRef.current = window.requestAnimationFrame(() => {
            const currentSelection = selectionBoxRef.current;
            const pending = pendingSelectionUpdate.current;
            if (!currentSelection || !pending) {
              selectionRafRef.current = null;
              return;
            }
            const startX = Math.min(currentSelection.startX, pending.endX);
            const startY = Math.min(currentSelection.startY, pending.endY);
            const endRectX = Math.max(currentSelection.startX, pending.endX);
            const endRectY = Math.max(currentSelection.startY, pending.endY);
            const worldStart = toWorld(startX + (pending.rect?.left || 0), startY + (pending.rect?.top || 0));
            const worldEnd = toWorld(endRectX + (pending.rect?.left || 0), endRectY + (pending.rect?.top || 0));
            const selected = new Set<string>();
            nodesRef.current.forEach(node => {
              const right = node.x + node.width;
              const bottom = node.y + node.height;
              if (node.x < worldEnd.x && right > worldStart.x && node.y < worldEnd.y && bottom > worldStart.y) {
                selected.add(node.id);
              }
            });
            setSelectedNodeIds(selected);
            selectionRafRef.current = null;
          });
        }
        return;
      }

      if (isPanning || isPanningRef.current) {
        const dx = event.clientX - lastMousePos.current.x;
        const dy = event.clientY - lastMousePos.current.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        if (pendingPanUpdate.current) {
          pendingPanUpdate.current.dx += dx;
          pendingPanUpdate.current.dy += dy;
        } else {
          pendingPanUpdate.current = { dx, dy };
        }

        if (!panRafRef.current) {
          panRafRef.current = window.requestAnimationFrame(() => {
            const pending = pendingPanUpdate.current;
            if (!pending) {
              panRafRef.current = null;
              return;
            }
            const currentView = viewportRef.current;
            store.setViewport({ x: currentView.x + pending.dx, y: currentView.y + pending.dy, scale: currentView.scale });
            pendingPanUpdate.current = null;
            panRafRef.current = null;
          });
        }

        lastMousePos.current = { x: event.clientX, y: event.clientY };
        return;
      }

      if (dragNodeId) {
        const currentView = viewportRef.current;
        const safeScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentView.scale));
        const deltaX = event.movementX / safeScale;
        const deltaY = event.movementY / safeScale;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

        const currentSelectedIds = selectedNodeIdsRef.current;
        if (currentSelectedIds.size > 1 && currentSelectedIds.has(dragNodeId)) {
          if (!multiNodeDragStartPos.current) {
            multiNodeDragStartPos.current = {
              mouseX: event.clientX,
              mouseY: event.clientY,
              nodes: new Map(Array.from(currentSelectedIds).map(nodeId => {
                const node = nodesRef.current.find(item => item.id === nodeId);
                return [nodeId, { x: node?.x || 0, y: node?.y || 0 }];
              })),
            };
          }

          const totalDeltaX = (event.clientX - multiNodeDragStartPos.current.mouseX) / safeScale;
          const totalDeltaY = (event.clientY - multiNodeDragStartPos.current.mouseY) / safeScale;
          const updates = Array.from(multiNodeDragStartPos.current.nodes.entries()).map(([nodeId, start]) => ({
            nodeId,
            updater: (node: WorkflowNodeData) => ({ ...node, x: start.x + totalDeltaX, y: start.y + totalDeltaY }),
          }));
          scheduleMultiNodeUpdate(updates);
        } else {
          scheduleNodeUpdate(dragNodeId, node => ({ ...node, x: node.x + deltaX, y: node.y + deltaY }));
        }
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (connectingSource || connectingTarget) {
        const world = toWorld(event.clientX, event.clientY);
        const target = nodesRef.current.find(node => {
          if (node.id === connectingSource || node.id === connectingTarget) return false;
          const input = inputPortPos(node);
          const output = outputPortPos(node);
          if (connectingSource) {
            return Math.hypot(world.x - input.x, world.y - input.y) < 22;
          }
          return Math.hypot(world.x - output.x, world.y - output.y) < 22;
        });

        if (target) {
          store.addConnection({
            id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            fromNodeId: connectingSource || target.id,
            fromPortId: 'out',
            toNodeId: connectingSource ? target.id : (connectingTarget || ''),
            toPortId: 'in',
          });
          appendLog(`已连接 ${connectingSource || target.id} → ${connectingSource ? target.id : connectingTarget}`);
        }
      }

      if (selectionRafRef.current) {
        window.cancelAnimationFrame(selectionRafRef.current);
        selectionRafRef.current = null;
      }
      if (panRafRef.current) {
        window.cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
      if (nodeUpdateRafRef.current) {
        window.cancelAnimationFrame(nodeUpdateRafRef.current);
        flushNodeUpdate();
      }

      if (isSelecting || isSelectingRef.current) {
        setIsSelecting(false);
        isSelectingRef.current = false;
        setSelectionBox(null);
        if (selectedNodeIdsRef.current.size === 1) {
          setSelectedNodeId(Array.from(selectedNodeIdsRef.current)[0] || null);
        }
      }

      setIsPanning(false);
      isPanningRef.current = false;
      setIsDragging(false);
      setDragNodeId(null);
      setConnectingSource(null);
      setConnectingTarget(null);
      multiNodeDragStartPos.current = null;
      pendingSelectionUpdate.current = null;
      pendingPanUpdate.current = null;
    };

    const isInteracting = isPanning || isPanningRef.current || isDragging || dragNodeId || isSelecting || isSelectingRef.current || connectingSource || connectingTarget;
    if (!isInteracting) return;

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [appendLog, connectingSource, connectingTarget, dragNodeId, flushNodeUpdate, isDragging, isPanning, isSelecting, scheduleMultiNodeUpdate, scheduleNodeUpdate, store, toWorld]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeIdsRef.current.size > 0) {
        Array.from(selectedNodeIdsRef.current).forEach(nodeId => handleDeleteNode(nodeId));
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedNodeIds(new Set(nodesRef.current.map(node => node.id)));
      }
      if (event.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedNodeIds(new Set());
        setConnectingSource(null);
        setConnectingTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteNode]);

  const addNode = useCallback((type: WorkflowNodeType) => {
    const catalog = NODE_CATALOG[type];
    const currentView = viewportRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - currentView.x) / currentView.scale : (320 - currentView.x) / currentView.scale;
    const centerY = rect ? (rect.height / 2 - currentView.y) / currentView.scale : (240 - currentView.y) / currentView.scale;
    const id = `${type}_${Date.now()}`;
    store.addNode({
      id,
      type,
      x: centerX - catalog.defaultW / 2,
      y: centerY - catalog.defaultH / 2,
      width: catalog.defaultW,
      height: catalog.defaultH,
      title: catalog.label,
      settings: { ...catalog.defaultSettings },
    });
    setSelectedNodeId(id);
    setSelectedNodeIds(new Set([id]));
    appendLog(`已添加 ${catalog.label} 节点`);
  }, [appendLog, store]);

  const handleRun = useCallback(async () => {
    setLogs([]);
    appendLog('开始执行工作流');
    await store.runWorkflow();
    appendLog('工作流执行结束');
    store.refreshKeyStatus();
  }, [appendLog, store]);

  const focusNodeInViewport = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(item => item.id === nodeId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!node || !rect) return;

    const nextViewport = {
      x: rect.width / 2 - (node.x + node.width / 2) * viewportRef.current.scale,
      y: rect.height / 2 - (node.y + node.height / 2) * viewportRef.current.scale,
      scale: viewportRef.current.scale,
    };

    setSelectedNodeId(nodeId);
    setSelectedNodeIds(new Set([nodeId]));
    store.setViewport(nextViewport);
  }, [store]);

  const duplicateNode = useCallback((nodeId: string) => {
    const source = nodesRef.current.find(item => item.id === nodeId);
    if (!source) return;

    const nextId = `${source.type}_${Date.now()}`;
    store.addNode({
      ...source,
      id: nextId,
      x: source.x + 36,
      y: source.y + 36,
      title: `${source.title} Copy`,
      settings: { ...source.settings },
    });
    setSelectedNodeId(nextId);
    setSelectedNodeIds(new Set([nextId]));
    appendLog(`已复制节点 ${source.title}`);
  }, [appendLog, store]);

  const renderConnections = () => {
    const elements: React.ReactNode[] = [];

    store.connections.forEach(connection => {
      const fromNode = nodesRef.current.find(node => node.id === connection.fromNodeId);
      const toNode = nodesRef.current.find(node => node.id === connection.toNodeId);
      if (!fromNode || !toNode) return;

      const from = outputPortPos(fromNode);
      const to = inputPortPos(toNode);
      const distance = Math.abs(to.x - from.x);
      const cp = distance * 0.5;
      const d = `M ${from.x} ${from.y} C ${from.x + cp} ${from.y}, ${to.x - cp} ${to.y}, ${to.x} ${to.y}`;

      elements.push(
        <g key={connection.id} className="tn-conn-group">
          <path
            d={d}
            stroke="transparent"
            strokeWidth="20"
            fill="none"
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onClick={() => {
              store.removeConnection(connection.id);
              appendLog(`已删除连线 ${connection.id}`);
            }}
          />
          <path d={d} stroke="#18181b" strokeWidth="4" fill="none" />
          <path d={d} stroke="#71717a" strokeWidth="2" fill="none" />
          <circle cx={from.x} cy={from.y} r="2.5" fill="#71717a" />
          <circle cx={to.x} cy={to.y} r="2.5" fill="#71717a" />
        </g>,
      );
    });

    if (connectingSource || connectingTarget) {
      const startNode = nodesRef.current.find(node => node.id === (connectingSource || connectingTarget));
      if (startNode) {
        const from = connectingSource ? outputPortPos(startNode) : inputPortPos(startNode);
        const to = { x: mousePos.x, y: mousePos.y };
        const d = `M ${from.x} ${from.y} C ${from.x + 80} ${from.y}, ${to.x - 80} ${to.y}, ${to.x} ${to.y}`;
        elements.push(
          <g key="pending-connection">
            <path d={d} stroke="#18181b" strokeWidth="4" fill="none" />
            <path d={d} stroke="#d4d4d8" strokeWidth="2" fill="none" strokeDasharray="6 4" />
          </g>,
        );
      }
    }

    return elements;
  };

  const resultSummary = useMemo(() => {
    const successCount = store.executionResults.filter(result => result.status === 'success').length;
    const failureCount = store.executionResults.filter(result => result.status === 'error').length;
    return { successCount, failureCount };
  }, [store.executionResults]);

  const orderedNodes = useMemo(() => [...store.nodes].sort((first, second) => first.y - second.y || first.x - second.x), [store.nodes]);

  return (
    <div className={`tn-shell ${embedded ? 'tn-embedded' : ''}`}>
      <div
        ref={canvasRef}
        className="tn-canvas"
        style={{ right: rightPanelOpen ? `${RIGHT_PANEL_W}px` : 0 }}
        onPointerDown={handleCanvasPointerDown}
        onWheel={handleWheel}
      >
        <div className="tn-viewport" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, transformOrigin: '0 0' }}>
          <svg className="tn-edges-svg" style={{ width: WORLD_CANVAS_W, height: WORLD_CANVAS_H }}>
            {renderConnections()}
          </svg>

          {visibleNodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id || selectedNodeIds.has(node.id)}
              providers={store.providers}
              status={execMap.get(node.id) ?? 'idle'}
              onUpdateSettings={handleUpdateNodeSettings}
              onMouseDownNode={handleNodePointerDown}
              onMouseDownPort={handlePortPointerDown}
              onDelete={handleDeleteNode}
            />
          ))}
        </div>

        <div className={`tn-toolbar ${isCompactToolbar ? 'tn-toolbar--compact' : ''} ${isMobileToolbar ? 'tn-toolbar--mobile' : ''}`}>
          <div className="tn-toolbar-left">
            {onBack && (
              <button type="button" onClick={onBack} className="tn-btn-secondary tn-btn-icon" title="返回画布">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
              </button>
            )}
            <div>
              <div className="tn-toolbar-kicker">Workflow Studio</div>
              <div className="tn-toolbar-title">节点式生成工作台</div>
            </div>
          </div>

          <div className="tn-toolbar-center">
            {(['provider', 'prompt', 'imageInput', 'generate', 'output'] as WorkflowNodeType[]).map(type => {
              const catalog = NODE_CATALOG[type];
              return (
                <button key={type} type="button" onClick={() => addNode(type)} title={`添加 ${catalog.label}`} className="tn-add-node-btn">
                  <span className={catalog.accentClass}>{catalog.icon}</span>
                  {!isCompactToolbar && <span className="tn-add-node-label">{catalog.label}</span>}
                </button>
              );
            })}
          </div>

          <div className="tn-toolbar-right">
            <span className="tn-zoom-label">{Math.round(viewport.scale * 100)}%</span>
            <button type="button" onClick={() => store.setViewport({ ...viewport, scale: Math.min(MAX_SCALE, viewport.scale * 1.2) })} className="tn-btn-secondary tn-btn-icon tn-toolbar-icon-btn" title="放大">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" /></svg>
            </button>
            <button type="button" onClick={() => store.setViewport({ ...viewport, scale: Math.max(MIN_SCALE, viewport.scale * 0.8) })} className="tn-btn-secondary tn-btn-icon tn-toolbar-icon-btn" title="缩小">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M8 11h6" /></svg>
            </button>
            <div className="tn-divider" />
            {store.isExecuting ? (
              <button type="button" onClick={store.cancelExecution} className="tn-btn-danger">停止</button>
            ) : (
              <button type="button" onClick={handleRun} className="tn-btn-primary">运行</button>
            )}
            <button type="button" onClick={() => setRightPanelOpen(prev => !prev)} className="tn-btn-secondary tn-btn-icon tn-toolbar-icon-btn" title={rightPanelOpen ? '收起面板' : '展开面板'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18" /></svg>
            </button>
          </div>
        </div>

        <div className="tn-hint-bar">缩放 {Math.round(viewport.scale * 100)}% · 滚轮缩放 · 空白拖动 · Ctrl 多选 · Del 删除</div>

        {selectionBox && (
          <div
            className="tn-selection-box"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
            }}
          />
        )}
      </div>

      <div className="tn-right-panel" style={{ width: `${RIGHT_PANEL_W}px`, transform: rightPanelOpen ? 'translateX(0)' : `translateX(${RIGHT_PANEL_W}px)` }}>
        <div className="tn-panel-header">
          <div>
            <div className="tn-toolbar-kicker">Control Panel</div>
            <div className="tn-toolbar-title">流程控制</div>
          </div>
          <div className="tn-panel-meta">
            <span>{store.nodes.length} 节点</span>
            <span>{store.connections.length} 连线</span>
          </div>
        </div>

        <div className="tn-panel-scroll">
          <div className="tn-panel-section">
            <div className="tn-section-head">
              <span className="tn-section-label">Nodes</span>
              <div className="tn-section-actions">
                <button type="button" onClick={() => addNode('prompt')} className="tn-chip-btn">+ Prompt</button>
                <button type="button" onClick={() => addNode('generate')} className="tn-chip-btn">+ Generate</button>
              </div>
            </div>

            <div className="tn-node-list">
              {orderedNodes.map(node => (
                <div key={node.id} className={`tn-node-row ${selectedNodeId === node.id ? 'is-selected' : ''}`}>
                  <button type="button" className="tn-node-row-main" onClick={() => focusNodeInViewport(node.id)}>
                    <span className={`tn-node-row-icon ${NODE_CATALOG[node.type].accentClass}`}>{NODE_CATALOG[node.type].icon}</span>
                    <span className="tn-node-row-copy">
                      <strong>{node.title}</strong>
                      <span>{NODE_CATALOG[node.type].label}</span>
                    </span>
                  </button>
                  <div className="tn-node-row-actions">
                    <button type="button" className="tn-chip-btn" onClick={() => duplicateNode(node.id)}>复制</button>
                    <button type="button" className="tn-chip-btn" onClick={() => handleDeleteNode(node.id)}>删</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedNode && (
            <div className="tn-panel-section">
              <div className="tn-section-head">
                <span className="tn-section-label">Inspector</span>
                <div className="tn-section-actions">
                  <button type="button" onClick={() => duplicateNode(selectedNode.id)} className="tn-chip-btn">复制</button>
                  <button type="button" onClick={() => handleDeleteNode(selectedNode.id)} className="tn-chip-btn">删除</button>
                </div>
              </div>

              <div className="tn-inspector-card">
                <label className="tn-field-stack">
                  <span className="tn-field-label">标题</span>
                  <input
                    className="tn-input"
                    value={selectedNode.title}
                    onChange={event => store.updateNode(selectedNode.id, { title: event.target.value })}
                    placeholder="节点标题"
                  />
                </label>

                {selectedNode.type === 'prompt' && (
                  <label className="tn-field-stack">
                    <span className="tn-field-label">Prompt</span>
                    <textarea
                      className="tn-input tn-textarea"
                      rows={5}
                      value={String(selectedNode.settings.text ?? '')}
                      onChange={event => handleUpdateNodeSettings(selectedNode.id, { text: event.target.value })}
                    />
                  </label>
                )}

                {selectedNode.type === 'provider' && (
                  <div className="tn-field-grid">
                    <label className="tn-field-stack">
                      <span className="tn-field-label">Provider</span>
                      <select
                        className="tn-input"
                        value={String(selectedNode.settings.providerId ?? '')}
                        onChange={event => handleUpdateNodeSettings(selectedNode.id, { providerId: event.target.value })}
                        title="选择 Provider"
                        aria-label="选择 Provider"
                      >
                        <option value="">选择 Provider...</option>
                        {store.providers.map(provider => (
                          <option key={provider.id} value={provider.id}>{provider.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="tn-field-stack">
                      <span className="tn-field-label">Model</span>
                      <input
                        className="tn-input"
                        value={String(selectedNode.settings.model ?? '')}
                        onChange={event => handleUpdateNodeSettings(selectedNode.id, { model: event.target.value })}
                        placeholder="模型名"
                      />
                    </label>
                  </div>
                )}

                {selectedNode.type === 'imageInput' && (
                  <label className="tn-field-stack">
                    <span className="tn-field-label">Image URL</span>
                    <textarea
                      className="tn-input tn-textarea"
                      rows={4}
                      value={String(selectedNode.settings.url ?? '')}
                      onChange={event => handleUpdateNodeSettings(selectedNode.id, { url: event.target.value })}
                    />
                  </label>
                )}

                {selectedNode.type === 'generate' && (
                  <div className="tn-field-grid">
                    <label className="tn-field-stack">
                      <span className="tn-field-label">宽度</span>
                      <input
                        type="number"
                        className="tn-input"
                        value={Number(selectedNode.settings.width ?? 1024)}
                        onChange={event => handleUpdateNodeSettings(selectedNode.id, { width: Number(event.target.value) || 1024 })}
                      />
                    </label>
                    <label className="tn-field-stack">
                      <span className="tn-field-label">高度</span>
                      <input
                        type="number"
                        className="tn-input"
                        value={Number(selectedNode.settings.height ?? 1024)}
                        onChange={event => handleUpdateNodeSettings(selectedNode.id, { height: Number(event.target.value) || 1024 })}
                      />
                    </label>
                    <label className="tn-field-stack tn-field-span-2">
                      <span className="tn-field-label">比例</span>
                      <select
                        className="tn-input"
                        value={String(selectedNode.settings.ratio ?? '1:1')}
                        onChange={event => handleUpdateNodeSettings(selectedNode.id, { ratio: event.target.value })}
                        title="比例"
                        aria-label="比例"
                      >
                        <option value="1:1">1:1</option>
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          <ProviderSection providers={store.providers} onAdd={store.addProvider} onRemove={store.removeProvider} onUpdate={store.updateProvider} />
          <KeyHealthSection keyStatus={store.keyStatus} onRefresh={store.refreshKeyStatus} onReset={store.resetKeys} />

          <div className="tn-panel-section">
            <div className="tn-section-head">
              <span className="tn-section-label">Execution</span>
              <div className="tn-section-actions">
                <span className="tn-text-green">成功 {resultSummary.successCount}</span>
                <span className="tn-text-red">失败 {resultSummary.failureCount}</span>
              </div>
            </div>
            <div className="tn-log-list">
              {logs.length === 0 ? (
                <p className="tn-empty-hint">暂无日志</p>
              ) : logs.map((log, index) => (
                <div key={index} className="tn-log-item">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeWorkflowPage;
