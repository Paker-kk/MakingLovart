/**
 * API 配置 Store — 增删改查 + localStorage 持久化
 *
 * 纯 React hooks 实现（不依赖 zustand），与项目其余状态管理方式一致。
 * API KEY 使用与 userApiKeys 相同的 AES-GCM 加密方案存储。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { APIConfig, APIConfigState, ModelItem } from '../types/api-config';
import { decryptKeys, encryptKeys } from '../../utils/keyVault';

// ─── localStorage Keys ──────────────────────────────────────────
const STORAGE_KEY = 'apiConfigs.v2';

const STORAGE_KEY_LEGACY = 'apiConfigs.v2.legacy';
const EMPTY_STATE: APIConfigState = { configs: [], activeConfigId: null, activeModelId: null };

function normalizeModelItem(model: unknown, index: number): ModelItem {
  if (model && typeof model === 'object') {
    const candidate = model as Partial<ModelItem>;
    const id = typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id.trim()
      : `model_${index + 1}`;
    const name = typeof candidate.name === 'string' && candidate.name.trim()
      ? candidate.name.trim()
      : id;
    return { id, name };
  }

  const fallbackId = typeof model === 'string' && model.trim()
    ? model.trim()
    : `model_${index + 1}`;
  return { id: fallbackId, name: fallbackId };
}

function normalizeConfig(raw: unknown, index: number): APIConfig {
  const candidate = (raw && typeof raw === 'object' ? raw : {}) as Partial<APIConfig>;
  const models = Array.isArray(candidate.models)
    ? candidate.models.map((model, modelIndex) => normalizeModelItem(model, modelIndex))
    : [];
  const defaultModel = typeof candidate.defaultModel === 'string' && candidate.defaultModel.trim()
    ? candidate.defaultModel.trim()
    : models[0]?.id ?? '';
  const provider = candidate.provider === 'banana' || candidate.provider === 'google_veo' || candidate.provider === 'openai_sora' || candidate.provider === 'custom'
    ? candidate.provider
    : 'custom';

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `cfg_legacy_${index + 1}`,
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : `未命名配置 ${index + 1}`,
    provider,
    apiKey: typeof candidate.apiKey === 'string' ? candidate.apiKey : '',
    apiBaseUrl: typeof candidate.apiBaseUrl === 'string' ? candidate.apiBaseUrl : '',
    models,
    defaultModel,
    extraConfig: candidate.extraConfig && typeof candidate.extraConfig === 'object' ? candidate.extraConfig : undefined,
    createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
  };
}

function normalizeState(raw: APIConfigState): APIConfigState {
  const configs = Array.isArray(raw.configs)
    ? raw.configs.map((config, index) => normalizeConfig(config, index))
    : [];
  const activeConfigId = configs.some(config => config.id === raw.activeConfigId)
    ? raw.activeConfigId
    : configs[0]?.id ?? null;
  const activeConfig = configs.find(config => config.id === activeConfigId) ?? null;
  const activeModelId = activeConfig?.models.some(model => model.id === raw.activeModelId)
    ? raw.activeModelId
    : activeConfig?.defaultModel || activeConfig?.models[0]?.id || null;

  return {
    configs,
    activeConfigId,
    activeModelId,
  };
}

function decodeLegacyBase64(encoded: string): string {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return encoded;
  }
}

function deserializeLegacy(raw: string): APIConfigState {
  const parsed = JSON.parse(raw) as APIConfigState;
  return normalizeState({
    configs: (parsed.configs || []).map(c => ({ ...c, apiKey: decodeLegacyBase64(c.apiKey) })),
    activeConfigId: parsed.activeConfigId || null,
    activeModelId: parsed.activeModelId || null,
  });
}

async function loadState(): Promise<APIConfigState> {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (encrypted) {
      const result = await decryptKeys<APIConfigState>(encrypted);
      if (result) {
        return normalizeState({
          configs: result.configs || [],
          activeConfigId: result.activeConfigId || null,
          activeModelId: result.activeModelId || null,
        });
      }
    }

    const legacy = localStorage.getItem(STORAGE_KEY_LEGACY) || localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const migrated = deserializeLegacy(legacy);
      const encryptedPayload = await encryptKeys(migrated);
      localStorage.setItem(STORAGE_KEY, encryptedPayload);
      if (localStorage.getItem(STORAGE_KEY_LEGACY)) {
        localStorage.removeItem(STORAGE_KEY_LEGACY);
      }
      return migrated;
    }

    return EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

// ─── UUID 生成 ──────────────────────────────────────────────────
function uuid(): string {
  return 'cfg_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Hook ───────────────────────────────────────────────────────
export function useAPIConfigStore() {
  const [state, setState] = useState<APIConfigState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const nextState = await loadState();
      if (!cancelled) {
        setState(nextState);
        setLoaded(true);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // 持久化
  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;
    const persist = async () => {
      const encrypted = await encryptKeys(state);
      if (!cancelled) {
        localStorage.setItem(STORAGE_KEY, encrypted);
      }
    };

    persist();
    return () => {
      cancelled = true;
    };
  }, [loaded, state]);

  // ── 查询 ──────────────────────────────────────────────────────
  const configs = state.configs;
  const activeConfigId = state.activeConfigId;
  const activeModelId = state.activeModelId;

  const activeConfig = useMemo(
    () => configs.find(c => c.id === activeConfigId) ?? null,
    [configs, activeConfigId],
  );

  const activeModels = useMemo<ModelItem[]>(
    () => activeConfig?.models ?? [],
    [activeConfig],
  );

  // ── 创建 ──────────────────────────────────────────────────────
  const addConfig = useCallback((draft: Omit<APIConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newConfig: APIConfig = {
      ...draft,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    };
    setState(prev => {
      const next: APIConfigState = {
        ...prev,
        configs: [...prev.configs, newConfig],
      };
      // 第一条自动激活
      if (!prev.activeConfigId) {
        next.activeConfigId = newConfig.id;
        next.activeModelId = newConfig.defaultModel || newConfig.models[0]?.id || null;
      }
      return next;
    });
    return newConfig.id;
  }, []);

  // ── 更新 ──────────────────────────────────────────────────────
  const updateConfig = useCallback((id: string, patch: Partial<Omit<APIConfig, 'id' | 'createdAt'>>) => {
    setState(prev => ({
      ...prev,
      configs: prev.configs.map(c =>
        c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c,
      ),
    }));
  }, []);

  // ── 删除 ──────────────────────────────────────────────────────
  const deleteConfig = useCallback((id: string) => {
    setState(prev => {
      const next = prev.configs.filter(c => c.id !== id);
      const wasActive = prev.activeConfigId === id;
      return {
        configs: next,
        activeConfigId: wasActive ? (next[0]?.id ?? null) : prev.activeConfigId,
        activeModelId: wasActive ? (next[0]?.defaultModel ?? next[0]?.models[0]?.id ?? null) : prev.activeModelId,
      };
    });
  }, []);

  // ── 激活配置 ──────────────────────────────────────────────────
  const setActiveConfig = useCallback((id: string) => {
    setState(prev => {
      const cfg = prev.configs.find(c => c.id === id);
      return {
        ...prev,
        activeConfigId: id,
        activeModelId: cfg?.defaultModel || cfg?.models[0]?.id || null,
      };
    });
  }, []);

  // ── 激活模型 ──────────────────────────────────────────────────
  const setActiveModel = useCallback((modelId: string) => {
    setState(prev => ({ ...prev, activeModelId: modelId }));
  }, []);

  return {
    configs,
    activeConfigId,
    activeModelId,
    activeConfig,
    activeModels,
    addConfig,
    updateConfig,
    deleteConfig,
    setActiveConfig,
    setActiveModel,
  } as const;
}

export type APIConfigStore = ReturnType<typeof useAPIConfigStore>;
