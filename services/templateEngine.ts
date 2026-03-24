/**
 * 模板变量替换引擎
 *
 * 实现思路（照搬 Tapnow Studio 的模板引擎）：
 * ────────────────────────────────────────────
 * 1. 变量格式：{{path.to.value}}，支持点号(.)分隔的嵌套路径
 * 2. 替换范围：
 *    - 字符串值 → 正则匹配 {{...}} 并替换
 *    - 对象/数组 → 递归深度遍历每个叶节点做替换
 * 3. 如果路径查不到值，保留原始 {{...}} 占位符不替换
 *
 * 内置变量表（与 Tapnow 一致）：
 * ┌─────────────────────┬─────────────────────────────┐
 * │ {{provider.key}}    │ 当前选中的 API Key          │
 * │ {{provider.url}}    │ 供应商 Base URL             │
 * │ {{model}}           │ 模型 ID                     │
 * │ {{prompt}}          │ 用户输入的提示词            │
 * │ {{width}}           │ 输出宽度                    │
 * │ {{height}}          │ 输出高度                    │
 * │ {{ratio}}           │ 输出比例                    │
 * │ {{duration}}        │ 视频时长                    │
 * │ {{imageUrl1~4}}     │ 参考图 URL                  │
 * │ {{requestId}}       │ 异步任务 ID（轮询时注入）   │
 * └─────────────────────┴─────────────────────────────┘
 */

// ── 类型 ──────────────────────────────────────────────

/** 模板变量字典：支持嵌套对象如 { provider: { key: 'xxx', url: 'yyy' } } */
export type TemplateVars = Record<string, unknown>;

// ── 核心：路径取值 ──────────────────────────────────────

/**
 * 通过点号分隔路径从嵌套对象中取值
 * @example getValueByPath({ a: { b: 'hello' } }, 'a.b') → 'hello'
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (obj == null || !path) return undefined;
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

// ── 核心：字符串模板替换 ──────────────────────────────────

/**
 * 替换单个字符串中的 {{path}} 占位符。
 * 未匹配到的变量保留原始占位符。
 */
export function resolveTemplateVars(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path: string) => {
    const value = getValueByPath(vars, path);
    return value !== undefined ? String(value) : match;
  });
}

// ── 核心：深度递归替换 ──────────────────────────────────

/**
 * 递归遍历对象/数组/字符串，对所有字符串叶节点做模板替换。
 * - string → resolveTemplateVars
 * - array  → 逐元素递归
 * - object → 逐 value 递归（key 不替换）
 * - 其他   → 原样返回
 */
export function resolveTemplateObject<T>(obj: T, vars: TemplateVars): T {
  if (typeof obj === 'string') {
    return resolveTemplateVars(obj, vars) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveTemplateObject(item, vars)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        resolveTemplateObject(v, vars),
      ]),
    ) as unknown as T;
  }
  return obj;
}

// ── 辅助：构建标准变量集合 ──────────────────────────────

export interface StandardVarInput {
  providerKey?: string;
  providerUrl?: string;
  model?: string;
  prompt?: string;
  width?: number;
  height?: number;
  ratio?: string;
  duration?: string;
  imageUrls?: string[];
  requestId?: string;
}

/**
 * 将标准输入转为 TemplateVars 字典，可直接传给 resolveTemplateObject。
 */
export function buildStandardVars(input: StandardVarInput): TemplateVars {
  const vars: TemplateVars = {
    provider: {
      key: input.providerKey ?? '',
      url: input.providerUrl ?? '',
    },
    model: input.model ?? '',
    prompt: input.prompt ?? '',
    width: input.width ?? 1024,
    height: input.height ?? 1024,
    ratio: input.ratio ?? '1:1',
    duration: input.duration ?? '5s',
  };

  // imageUrl1 ~ imageUrl4
  const urls = input.imageUrls ?? [];
  for (let i = 0; i < 4; i++) {
    vars[`imageUrl${i + 1}`] = urls[i] ?? '';
  }

  if (input.requestId) {
    vars.requestId = input.requestId;
  }

  return vars;
}
