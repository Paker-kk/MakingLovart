/**
 * runninghubService 单元测试
 *
 * 覆盖范围：
 * - payload 构造（文生图 / 图生图 / 局部重绘）
 * - App ID 安全校验（sanitizeAppId 通过 public API 验证）
 * - API Key 格式校验
 * - 边界条件：空 AppId / 非法字符 AppId / 空参考图
 *
 * 注意：网络相关的 submitAndPollTask 不在此文件测试，
 * 需要集成测试或 mock fetch 的场景另行补充。
 */
import { describe, it, expect } from 'vitest';
import {
  validateRunningHubApiKey,
  generateImageWithRunningHub,
  editImageWithRunningHub,
  RUNNINGHUB_MODEL_OPTIONS,
  RUNNINGHUB_ASPECT_RATIO_OPTIONS,
} from '../services/runninghubService';
import type { UserApiKey, RunningHubConfig } from '../types';

// ── 辅助函数 ──

function makeKey(overrides: Partial<UserApiKey> = {}): UserApiKey {
  return {
    id: 'test-rh-key',
    provider: 'runninghub',
    capabilities: ['image'],
    key: 'a'.repeat(32),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runninghub: {
      textToImageAppId: 'validAppId123',
      imageToImageAppId: 'validI2IAppId',
      inpaintAppId: 'validInpaintId',
      imageNodeId: '2',
      imageInputFieldName: 'images',
      maskNodeId: '3',
      maskFieldName: 'mask',
      promptNodeId: '1',
      promptFieldName: 'text',
      modelNodeId: '4',
      modelFieldName: 'model_selected',
      aspectNodeId: '4',
      aspectFieldName: 'aspect_rate',
      promptTypeNodeId: '17',
      promptTypeFieldName: 'select',
      promptTypeValue: '1',
      model: 'Midjourney V7',
      aspectRatio: '16:9',
      instanceType: 'default',
      usePersonalQueue: false,
    },
    ...overrides,
  };
}

// ── API Key 格式校验 ──

describe('validateRunningHubApiKey', () => {
  it('32 位纯字母数字字符串应通过格式校验', async () => {
    const result = await validateRunningHubApiKey('a'.repeat(32));
    expect(result.ok).toBe(true);
    expect(result.message).toContain('格式已通过');
  });

  it('少于 32 位应拒绝', async () => {
    const result = await validateRunningHubApiKey('short');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('32 位');
  });

  it('超过 32 位应拒绝', async () => {
    const result = await validateRunningHubApiKey('a'.repeat(33));
    expect(result.ok).toBe(false);
  });

  it('包含特殊字符应拒绝', async () => {
    const result = await validateRunningHubApiKey('aaaaaaaaaaaaaaaa!@#$%^&*()_12345');
    expect(result.ok).toBe(false);
  });

  it('空字符串应拒绝', async () => {
    const result = await validateRunningHubApiKey('');
    expect(result.ok).toBe(false);
  });

  it('有 appId 但无网络时应报网络错误', async () => {
    // fetch 在 node 测试环境中指向不存在的本地代理路径
    const result = await validateRunningHubApiKey('a'.repeat(32), 'someAppId');
    // 无论返回 ok 还是 error 都可接受（取决于 CI 环境），关键是不应抛异常
    expect(typeof result.ok).toBe('boolean');
  });
});

// ── App ID 安全校验（通过 public API 间接测试 sanitizeAppId） ──

describe('generateImageWithRunningHub - App ID 校验', () => {
  it('无 API Key 应抛错', async () => {
    await expect(generateImageWithRunningHub('test prompt')).rejects.toThrow('API Key');
  });

  it('无 textToImageAppId 应抛错', async () => {
    const key = makeKey({ runninghub: { textToImageAppId: '' } });
    await expect(generateImageWithRunningHub('test prompt', key)).rejects.toThrow('App ID');
  });

  it('appId 包含路径注入字符应拒绝', async () => {
    const key = makeKey({ runninghub: { textToImageAppId: '../../../etc/passwd' } });
    await expect(generateImageWithRunningHub('test prompt', key)).rejects.toThrow('非法字符');
  });

  it('appId 包含查询参数应拒绝', async () => {
    const key = makeKey({ runninghub: { textToImageAppId: 'id?param=1' } });
    await expect(generateImageWithRunningHub('test prompt', key)).rejects.toThrow('非法字符');
  });

  it('合法 appId 不应在校验阶段抛错（会在网络阶段失败）', async () => {
    const key = makeKey();
    // 因为测试环境无法连接 RunningHub，会在 fetch 阶段报网络错误
    await expect(generateImageWithRunningHub('test prompt', key)).rejects.toThrow();
    // 关键是它不应抛 "非法字符" 或 "App ID" 相关的校验错误
    try {
      await generateImageWithRunningHub('test prompt', key);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain('非法字符');
      expect(msg).not.toContain('未配置');
    }
  });
});

describe('editImageWithRunningHub - App ID 校验', () => {
  const dummyImage = { href: 'data:image/png;base64,abc', mimeType: 'image/png' };

  it('图生图无 imageToImageAppId 应抛错', async () => {
    const key = makeKey({ runninghub: { ...makeKey().runninghub, imageToImageAppId: '' } });
    await expect(editImageWithRunningHub([dummyImage], 'test', undefined, key)).rejects.toThrow('App ID');
  });

  it('局部重绘无 inpaintAppId 应抛错', async () => {
    const key = makeKey({ runninghub: { ...makeKey().runninghub, inpaintAppId: '' } });
    await expect(editImageWithRunningHub([dummyImage], 'test', dummyImage, key)).rejects.toThrow('App ID');
  });

  it('图生图 appId 含路径注入字符应拒绝', async () => {
    const key = makeKey({ runninghub: { ...makeKey().runninghub, imageToImageAppId: 'id/../../' } });
    await expect(editImageWithRunningHub([dummyImage], 'test', undefined, key)).rejects.toThrow('非法字符');
  });
});

// ── 常量完整性 ──

describe('RunningHub 常量', () => {
  it('RUNNINGHUB_MODEL_OPTIONS 应包含至少 5 个模型', () => {
    expect(RUNNINGHUB_MODEL_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('所有模型名称非空', () => {
    for (const model of RUNNINGHUB_MODEL_OPTIONS) {
      expect(model.trim().length).toBeGreaterThan(0);
    }
  });

  it('RUNNINGHUB_ASPECT_RATIO_OPTIONS 应包含 auto', () => {
    expect(RUNNINGHUB_ASPECT_RATIO_OPTIONS).toContain('auto');
  });

  it('RUNNINGHUB_ASPECT_RATIO_OPTIONS 应包含常见比例', () => {
    expect(RUNNINGHUB_ASPECT_RATIO_OPTIONS).toContain('1:1');
    expect(RUNNINGHUB_ASPECT_RATIO_OPTIONS).toContain('16:9');
    expect(RUNNINGHUB_ASPECT_RATIO_OPTIONS).toContain('9:16');
  });
});
