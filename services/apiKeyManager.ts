/**
 * API Key 管理层 —— 三级容错 + 多 Key 轮转
 *
 * 完整照搬 Tapnow Studio v3.8.8-rc7 的多 Key 负载均衡与故障降级策略。
 *
 * ═══════════════════════════════════════════════════════════
 *  架构总览  (三级容错)
 * ═══════════════════════════════════════════════════════════
 *
 *  L1 暂停列表 (Suspend List)
 *  ─────────────────────────
 *  - 触发条件：登录失效 / 鉴权临时故障（对应 Tapnow code 34010105）
 *  - 存储：localStorage['makinglovart_api_suspend']
 *  - TTL：60 分钟，过期后自动恢复可用
 *  - 恢复机制：查询时 now - timestamp < TTL 则仍处暂停，否则自动剔除
 *
 *  L2 黑名单 (Blacklist)
 *  ─────────────────────
 *  - 触发条件：积分 / 配额耗尽（对应 Tapnow code 1006）
 *  - 存储：localStorage['makinglovart_api_blacklist']
 *  - 重置：按自然日清零（日期字符串对比），第二天自动重置
 *  - JSON 格式：{ date: string, blacklist: { [key]: { reason, time } } }
 *
 *  L3 熔断器 (Circuit Breaker)
 *  ───────────────────────────
 *  - 触发条件：2分钟滑动窗口内累计 >= 10 次配额耗尽错误
 *  - 存储：内存 (ref / 数组)
 *  - 效果：触发后所有 Key 暂停，向用户展示熔断提示
 *  - 自动恢复：超过窗口期后旧时间戳被清理
 *
 * ═══════════════════════════════════════════════════════════
 *  多 Key 选择流程
 * ═══════════════════════════════════════════════════════════
 *
 *  1. 原始 Key 字符串（逗号分隔）拆分为 Key 数组
 *  2. 过滤掉暂停列表 + 黑名单中的 Key
 *  3. 从剩余可用 Key 中随机选一个
 *  4. 若全部不可用 → 降级：从全部 Key 随机选（附警告日志）
 */

// ── 常量 ──────────────────────────────────────────────

const SUSPEND_STORAGE_KEY = 'makinglovart_api_suspend';
const BLACKLIST_STORAGE_KEY = 'makinglovart_api_blacklist';

/** 暂停列表 TTL：60 分钟 */
const SUSPEND_TTL_MS = 60 * 60 * 1000;

/** 熔断器滑动窗口：2 分钟 */
const CIRCUIT_BREAKER_WINDOW_MS = 2 * 60 * 1000;

/** 熔断器阈值：窗口内 10 次配额耗尽 */
const CIRCUIT_BREAKER_THRESHOLD = 10;

// ── 类型 ──────────────────────────────────────────────

interface SuspendEntry {
  reason: string;
  timestamp: number;
  ttlMs: number;
}

interface BlacklistEntry {
  reason: string;
  time: number;
}

interface BlacklistStore {
  date: string;
  blacklist: Record<string, BlacklistEntry>;
}

/**
 * selectKey 返回的结果：
 * - key: 选中的 API Key
 * - degraded: 是否降级模式（所有 Key 都不可用时为 true）
 */
export interface KeySelectionResult {
  key: string;
  degraded: boolean;
}

/**
 * 错误分类枚举 —— 决定将 Key 送入哪一级容错
 */
export type ErrorCategory =
  | 'auth_expired'     // → L1 暂停列表 (Tapnow: 34010105)
  | 'quota_exhausted'  // → L2 黑名单 + L3 熔断检测 (Tapnow: 1006)
  | 'param_error'      // → 不重试，直接抛错 (Tapnow: 1000)
  | 'throttled'        // → 429 限流，可稍后重试
  | 'unknown';         // → 不做特殊处理

// ── L3 熔断器（内存态） ──────────────────────────────────

/**
 * 配额耗尽时间戳数组 —— 用于滑动窗口计算。
 * 模块级变量，在整个应用生命周期内共享。
 */
let quotaErrorTimestamps: number[] = [];

// ── 读写辅助 ──────────────────────────────────────────

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── L1 暂停列表 ──────────────────────────────────────

function loadSuspendList(): Record<string, SuspendEntry> {
  return readJson<Record<string, SuspendEntry>>(SUSPEND_STORAGE_KEY) ?? {};
}

function saveSuspendList(list: Record<string, SuspendEntry>): void {
  writeJson(SUSPEND_STORAGE_KEY, list);
}

/**
 * 返回当前仍在暂停期内的 Key 集合。
 * 同时自动清理已过期的条目。
 */
function getActiveSuspendedKeys(): Set<string> {
  const list = loadSuspendList();
  const now = Date.now();
  const active = new Set<string>();
  let dirty = false;

  for (const [key, entry] of Object.entries(list)) {
    if (now - entry.timestamp < (entry.ttlMs || SUSPEND_TTL_MS)) {
      active.add(key);
    } else {
      delete list[key];
      dirty = true;
    }
  }

  if (dirty) saveSuspendList(list);
  return active;
}

/**
 * 将 Key 加入暂停列表（L1）。
 * 用于鉴权临时失效时（如 token 过期）。
 */
export function addToSuspendList(apiKey: string, reason: string): void {
  const list = loadSuspendList();
  list[apiKey] = { reason, timestamp: Date.now(), ttlMs: SUSPEND_TTL_MS };
  saveSuspendList(list);
}

// ── L2 黑名单 ──────────────────────────────────────

function loadBlacklist(): BlacklistStore {
  const today = new Date().toDateString();
  const stored = readJson<BlacklistStore>(BLACKLIST_STORAGE_KEY);

  // 日期不匹配 → 自然日重置
  if (!stored || stored.date !== today) {
    const fresh: BlacklistStore = { date: today, blacklist: {} };
    writeJson(BLACKLIST_STORAGE_KEY, fresh);
    return fresh;
  }
  return stored;
}

function saveBlacklist(store: BlacklistStore): void {
  writeJson(BLACKLIST_STORAGE_KEY, store);
}

/**
 * 返回当前黑名单中的 Key 集合。
 * 黑名单按自然日自动重置。
 */
function getBlacklistedKeys(): Set<string> {
  const store = loadBlacklist();
  return new Set(Object.keys(store.blacklist));
}

/**
 * 将 Key 加入黑名单（L2）。
 * 用于配额 / 积分耗尽时。
 */
export function addToBlacklist(apiKey: string, reason: string): void {
  const store = loadBlacklist();
  store.blacklist[apiKey] = { reason, time: Date.now() };
  saveBlacklist(store);
}

// ── L3 熔断器 ──────────────────────────────────────

/**
 * 记录一次配额耗尽错误（用于熔断计算）。
 */
export function recordQuotaError(): void {
  quotaErrorTimestamps.push(Date.now());
}

/**
 * 检查熔断器是否已触发。
 * 逻辑：2分钟滑动窗口内 >= 10 次配额耗尽 → 熔断。
 */
export function checkCircuitBreaker(): boolean {
  const now = Date.now();
  // 滑动窗口：丢弃超时的时间戳
  quotaErrorTimestamps = quotaErrorTimestamps.filter(
    (t) => now - t < CIRCUIT_BREAKER_WINDOW_MS,
  );
  return quotaErrorTimestamps.length >= CIRCUIT_BREAKER_THRESHOLD;
}

/** 重置熔断器（用于测试或手动恢复） */
export function resetCircuitBreaker(): void {
  quotaErrorTimestamps = [];
}

// ── 多 Key 选择 ──────────────────────────────────────

/**
 * 从逗号分隔的 Key 字符串中选出一个可用 Key。
 *
 * 流程：
 * 1. 拆分 → 2. 过滤暂停 + 黑名单 → 3. 随机选 → 4. 降级兜底
 *
 * @param rawKeys  逗号分隔的 API Key 字符串
 * @returns 选中的 Key 及是否降级
 * @throws 如果输入为空
 */
export function selectKey(rawKeys: string): KeySelectionResult {
  const allKeys = rawKeys
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (allKeys.length === 0) {
    throw new Error('No API key provided');
  }

  // 单 Key 快速通道
  if (allKeys.length === 1) {
    return { key: allKeys[0], degraded: false };
  }

  // 获取不可用 Key 集合
  const suspended = getActiveSuspendedKeys();
  const blacklisted = getBlacklistedKeys();

  const availableKeys = allKeys.filter(
    (k) => !suspended.has(k) && !blacklisted.has(k),
  );

  if (availableKeys.length > 0) {
    const idx = Math.floor(Math.random() * availableKeys.length);
    return { key: availableKeys[idx], degraded: false };
  }

  // 所有 Key 不可用 → 降级：随机选全量
  console.warn(
    `[apiKeyManager] All ${allKeys.length} keys are suspended/blacklisted, ` +
      `falling back to random selection`,
  );
  const idx = Math.floor(Math.random() * allKeys.length);
  return { key: allKeys[idx], degraded: true };
}

// ── 错误分类 ──────────────────────────────────────

/**
 * 根据 HTTP 状态码和响应体错误码 / 消息进行错误分类。
 *
 * 分类规则（对齐 Tapnow 的错误码体系）：
 * - 401/403/34010105 → auth_expired
 * - 1006/402/quota/insufficient → quota_exhausted
 * - 429 → throttled
 * - 1000/参数错误 → param_error
 * - 其他 → unknown
 */
export function classifyError(
  httpStatus?: number,
  errorCode?: number | string,
  errorMessage?: string,
): ErrorCategory {
  // HTTP 级别判断
  if (httpStatus === 401 || httpStatus === 403) return 'auth_expired';
  if (httpStatus === 402) return 'quota_exhausted';
  if (httpStatus === 429) return 'throttled';

  // 响应体错误码（数字或字符串）
  const code = typeof errorCode === 'string' ? parseInt(errorCode, 10) : errorCode;
  if (code === 34010105) return 'auth_expired';
  if (code === 1006) return 'quota_exhausted';
  if (code === 1000) return 'param_error';

  // 错误消息中的关键词
  const msg = (errorMessage ?? '').toLowerCase();
  if (msg.includes('token_invalid') || msg.includes('unauthorized')) return 'auth_expired';
  if (msg.includes('quota') || msg.includes('insufficient') || msg.includes('积分')) return 'quota_exhausted';

  return 'unknown';
}

// ── 统一错误处理 ──────────────────────────────────────

/**
 * 根据错误分类执行相应容错动作。
 * 调用方在 catch 到 API 错误后调用此函数，将 Key 送入对应容错层级。
 *
 * @param apiKey    出错的 API Key
 * @param category  classifyError 的返回值
 * @param detail    可选的错误详情（存入暂停/黑名单 reason）
 * @returns 是否应该换 Key 重试
 */
export function handleKeyError(
  apiKey: string,
  category: ErrorCategory,
  detail?: string,
): { shouldRetry: boolean; circuitBroken: boolean } {
  const reason = detail ?? category;

  switch (category) {
    case 'auth_expired':
      // L1：暂停 60 分钟
      addToSuspendList(apiKey, reason);
      return { shouldRetry: true, circuitBroken: false };

    case 'quota_exhausted':
      // L2：加入黑名单
      addToBlacklist(apiKey, reason);
      // L3：记录并检查熔断
      recordQuotaError();
      return { shouldRetry: true, circuitBroken: checkCircuitBreaker() };

    case 'param_error':
      // 参数错误不重试
      return { shouldRetry: false, circuitBroken: false };

    case 'throttled':
      // 限流可以换 Key 重试
      return { shouldRetry: true, circuitBroken: false };

    default:
      return { shouldRetry: false, circuitBroken: false };
  }
}

// ── 状态查询（供 UI 展示） ──────────────────────────────

export interface KeyManagerStatus {
  suspendedKeys: Array<{ key: string; reason: string; expiresAt: number }>;
  blacklistedKeys: Array<{ key: string; reason: string }>;
  circuitBroken: boolean;
  recentQuotaErrors: number;
}

/**
 * 查询当前 Key 管理器的完整状态，供 UI 面板展示。
 */
export function getKeyManagerStatus(): KeyManagerStatus {
  const now = Date.now();
  const suspendList = loadSuspendList();
  const blacklistStore = loadBlacklist();

  const suspendedKeys = Object.entries(suspendList)
    .filter(([, entry]) => now - entry.timestamp < (entry.ttlMs || SUSPEND_TTL_MS))
    .map(([key, entry]) => ({
      key,
      reason: entry.reason,
      expiresAt: entry.timestamp + (entry.ttlMs || SUSPEND_TTL_MS),
    }));

  const blacklistedKeys = Object.entries(blacklistStore.blacklist).map(
    ([key, entry]) => ({ key, reason: entry.reason }),
  );

  // 清理过期的熔断时间戳
  quotaErrorTimestamps = quotaErrorTimestamps.filter(
    (t) => now - t < CIRCUIT_BREAKER_WINDOW_MS,
  );

  return {
    suspendedKeys,
    blacklistedKeys,
    circuitBroken: quotaErrorTimestamps.length >= CIRCUIT_BREAKER_THRESHOLD,
    recentQuotaErrors: quotaErrorTimestamps.length,
  };
}

// ── 清理（供用户手动重置） ──────────────────────────────

/** 清除所有暂停列表 */
export function clearSuspendList(): void {
  localStorage.removeItem(SUSPEND_STORAGE_KEY);
}

/** 清除黑名单 */
export function clearBlacklist(): void {
  localStorage.removeItem(BLACKLIST_STORAGE_KEY);
}

/** 完全重置 Key 管理器 */
export function resetKeyManager(): void {
  clearSuspendList();
  clearBlacklist();
  resetCircuitBreaker();
}
