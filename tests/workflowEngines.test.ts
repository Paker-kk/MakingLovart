/**
 * 模板变量引擎 + API Key 管理器 + 异步轮询引擎 测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ── 模拟 localStorage（node 环境没有）──
const store: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── Template Engine ──
import {
  getValueByPath,
  resolveTemplateVars,
  resolveTemplateObject,
  buildStandardVars,
} from '../services/templateEngine';

// ── API Key Manager ──
import {
  selectKey,
  classifyError,
  handleKeyError,
  checkCircuitBreaker,
  resetCircuitBreaker,
  recordQuotaError,
  addToSuspendList,
  addToBlacklist,
  resetKeyManager,
  getKeyManagerStatus,
} from '../services/apiKeyManager';

// ── Async Poller (types only, no real fetch) ──
import type { AsyncPollingConfig } from '../services/asyncPoller';

// ══════════════════════════════════════
//  模板变量引擎
// ══════════════════════════════════════
describe('templateEngine', () => {
  describe('getValueByPath', () => {
    it('取平级属性', () => {
      expect(getValueByPath({ name: 'Alice' }, 'name')).toBe('Alice');
    });
    it('取嵌套属性', () => {
      expect(getValueByPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
    });
    it('路径不存在返回 undefined', () => {
      expect(getValueByPath({ a: 1 }, 'b.c')).toBeUndefined();
    });
    it('null 输入返回 undefined', () => {
      expect(getValueByPath(null, 'a')).toBeUndefined();
    });
    it('空路径返回 undefined', () => {
      expect(getValueByPath({ a: 1 }, '')).toBeUndefined();
    });
  });

  describe('resolveTemplateVars', () => {
    it('替换单个变量', () => {
      expect(resolveTemplateVars('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
    });
    it('替换嵌套路径变量', () => {
      expect(
        resolveTemplateVars('Key: {{provider.key}}', { provider: { key: 'sk-123' } }),
      ).toBe('Key: sk-123');
    });
    it('未匹配变量保留原样', () => {
      expect(resolveTemplateVars('{{unknown}}', {})).toBe('{{unknown}}');
    });
    it('多个变量混合替换', () => {
      const result = resolveTemplateVars('{{model}} - {{width}}x{{height}}', {
        model: 'dalle3',
        width: 1024,
        height: 768,
      });
      expect(result).toBe('dalle3 - 1024x768');
    });
  });

  describe('resolveTemplateObject', () => {
    it('递归替换对象中的字符串', () => {
      const obj = {
        url: '/api/{{model}}',
        headers: { auth: 'Bearer {{provider.key}}' },
        tags: ['{{prompt}}', 'fixed'],
      };
      const vars = { model: 'gpt4', provider: { key: 'sk-abc' }, prompt: 'hello' };
      const result = resolveTemplateObject(obj, vars);
      expect(result.url).toBe('/api/gpt4');
      expect(result.headers.auth).toBe('Bearer sk-abc');
      expect(result.tags[0]).toBe('hello');
      expect(result.tags[1]).toBe('fixed');
    });
    it('非字符串值原样保留', () => {
      expect(resolveTemplateObject(42, {})).toBe(42);
      expect(resolveTemplateObject(null, {})).toBe(null);
      expect(resolveTemplateObject(true, {})).toBe(true);
    });
  });

  describe('buildStandardVars', () => {
    it('构建包含 provider 嵌套路径的变量', () => {
      const vars = buildStandardVars({
        providerKey: 'key123',
        providerUrl: 'https://api.example.com',
        model: 'dalle3',
        prompt: 'a cat',
      });
      expect(vars.provider).toEqual({ key: 'key123', url: 'https://api.example.com' });
      expect(vars.model).toBe('dalle3');
      expect(vars.prompt).toBe('a cat');
      expect(vars.imageUrl1).toBe('');
      expect(vars.width).toBe(1024);
    });
    it('imageUrls 正确映射到 imageUrl1~4', () => {
      const vars = buildStandardVars({
        imageUrls: ['url1', 'url2', 'url3'],
      });
      expect(vars.imageUrl1).toBe('url1');
      expect(vars.imageUrl2).toBe('url2');
      expect(vars.imageUrl3).toBe('url3');
      expect(vars.imageUrl4).toBe('');
    });
    it('requestId 存在时注入', () => {
      const vars = buildStandardVars({ requestId: 'req-abc' });
      expect(vars.requestId).toBe('req-abc');
    });
    it('requestId 缺失时不注入', () => {
      const vars = buildStandardVars({});
      expect(vars.requestId).toBeUndefined();
    });
  });
});

// ══════════════════════════════════════
//  API Key 管理器
// ══════════════════════════════════════
describe('apiKeyManager', () => {
  beforeEach(() => {
    // 清理 localStorage 和内存
    resetKeyManager();
    localStorage.clear();
  });

  describe('selectKey', () => {
    it('单 Key 直接返回', () => {
      const result = selectKey('sk-123');
      expect(result.key).toBe('sk-123');
      expect(result.degraded).toBe(false);
    });

    it('多 Key 随机返回其中之一', () => {
      const keys = 'key-a,key-b,key-c';
      const result = selectKey(keys);
      expect(['key-a', 'key-b', 'key-c']).toContain(result.key);
    });

    it('空字符串抛错', () => {
      expect(() => selectKey('')).toThrow('No API key provided');
    });

    it('空格和逗号清理', () => {
      const result = selectKey('  key-a , , key-b  ');
      expect(['key-a', 'key-b']).toContain(result.key);
    });

    it('过滤暂停列表中的 Key', () => {
      addToSuspendList('key-a', 'test');
      const result = selectKey('key-a,key-b');
      expect(result.key).toBe('key-b');
      expect(result.degraded).toBe(false);
    });

    it('过滤黑名单中的 Key', () => {
      addToBlacklist('key-a', 'test');
      const result = selectKey('key-a,key-b');
      expect(result.key).toBe('key-b');
    });

    it('所有 Key 不可用时降级', () => {
      addToBlacklist('key-a', 'test');
      addToSuspendList('key-b', 'test');
      const result = selectKey('key-a,key-b');
      expect(result.degraded).toBe(true);
      expect(['key-a', 'key-b']).toContain(result.key);
    });
  });

  describe('classifyError', () => {
    it('401 → auth_expired', () => {
      expect(classifyError(401)).toBe('auth_expired');
    });
    it('403 → auth_expired', () => {
      expect(classifyError(403)).toBe('auth_expired');
    });
    it('402 → quota_exhausted', () => {
      expect(classifyError(402)).toBe('quota_exhausted');
    });
    it('429 → throttled', () => {
      expect(classifyError(429)).toBe('throttled');
    });
    it('code 34010105 → auth_expired', () => {
      expect(classifyError(200, 34010105)).toBe('auth_expired');
    });
    it('code 1006 → quota_exhausted', () => {
      expect(classifyError(200, 1006)).toBe('quota_exhausted');
    });
    it('code 1000 → param_error', () => {
      expect(classifyError(200, 1000)).toBe('param_error');
    });
    it('TOKEN_INVALID 消息 → auth_expired', () => {
      expect(classifyError(200, undefined, 'TOKEN_INVALID')).toBe('auth_expired');
    });
    it('quota 相关消息 → quota_exhausted', () => {
      expect(classifyError(200, undefined, 'Insufficient quota')).toBe('quota_exhausted');
    });
    it('未知错误 → unknown', () => {
      expect(classifyError(500)).toBe('unknown');
    });
  });

  describe('handleKeyError', () => {
    it('auth_expired → 暂停列表 + 可重试', () => {
      const result = handleKeyError('key-a', 'auth_expired', '登录失效');
      expect(result.shouldRetry).toBe(true);
      expect(result.circuitBroken).toBe(false);
      // 验证 key-a 被加入暂停列表
      const status = getKeyManagerStatus();
      expect(status.suspendedKeys.some(k => k.key === 'key-a')).toBe(true);
    });

    it('quota_exhausted → 黑名单 + 可重试', () => {
      const result = handleKeyError('key-b', 'quota_exhausted', '积分耗尽');
      expect(result.shouldRetry).toBe(true);
      const status = getKeyManagerStatus();
      expect(status.blacklistedKeys.some(k => k.key === 'key-b')).toBe(true);
    });

    it('param_error → 不可重试', () => {
      const result = handleKeyError('key-c', 'param_error');
      expect(result.shouldRetry).toBe(false);
    });
  });

  describe('circuitBreaker', () => {
    it('默认不熔断', () => {
      expect(checkCircuitBreaker()).toBe(false);
    });

    it('10次错误触发熔断', () => {
      for (let i = 0; i < 10; i++) {
        recordQuotaError();
      }
      expect(checkCircuitBreaker()).toBe(true);
    });

    it('9次不触发', () => {
      for (let i = 0; i < 9; i++) {
        recordQuotaError();
      }
      expect(checkCircuitBreaker()).toBe(false);
    });

    it('重置后不熔断', () => {
      for (let i = 0; i < 15; i++) {
        recordQuotaError();
      }
      expect(checkCircuitBreaker()).toBe(true);
      resetCircuitBreaker();
      expect(checkCircuitBreaker()).toBe(false);
    });

    it('handleKeyError quota_exhausted 连续触发熔断', () => {
      for (let i = 0; i < 9; i++) {
        recordQuotaError();
      }
      // 第 10 次通过 handleKeyError 触发
      const result = handleKeyError('key-x', 'quota_exhausted');
      expect(result.circuitBroken).toBe(true);
    });
  });

  describe('getKeyManagerStatus', () => {
    it('初始状态全部为空', () => {
      const status = getKeyManagerStatus();
      expect(status.suspendedKeys).toEqual([]);
      expect(status.blacklistedKeys).toEqual([]);
      expect(status.circuitBroken).toBe(false);
      expect(status.recentQuotaErrors).toBe(0);
    });
  });
});
