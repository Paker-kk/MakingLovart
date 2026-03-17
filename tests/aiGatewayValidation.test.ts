/**
 * aiGateway 验证测试 — 测试 validateApiKey 对各 provider 的验证逻辑
 * 包括 Google (models.list)、OpenAI (/models)、Anthropic (/messages)、Stability (格式校验)
 * 以及 generateImageWithProvider 对不支持 provider 的报错行为
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateApiKey, inferProviderFromModel, generateImageWithProvider } from '../services/aiGateway';

describe('aiGateway - validateApiKey', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('Google provider 调用 models.list 接口验证', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
        });
        const result = await validateApiKey('google', 'test-google-key');
        expect(result.ok).toBe(true);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('generativelanguage.googleapis.com')
        );
    });

    it('OpenAI provider 调用 /models 接口验证', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
        });
        const result = await validateApiKey('openai', 'sk-test-key');
        expect(result.ok).toBe(true);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('api.openai.com/v1/models'),
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
            })
        );
    });

    it('Stability 短 key 格式校验失败', async () => {
        const result = await validateApiKey('stability', 'short');
        expect(result.ok).toBe(false);
        expect(result.message).toContain('太短');
    });

    it('Anthropic provider 验证逻辑', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
        });
        const result = await validateApiKey('anthropic', 'sk-ant-test-key');
        expect(result.ok).toBe(true);
    });
});

describe('aiGateway - generateImageWithProvider', () => {
    it('不支持的 provider 抛出错误', async () => {
        await expect(
            generateImageWithProvider('test prompt', 'claude-3-haiku', { id: '1', provider: 'anthropic', capabilities: ['text'], key: 'test', createdAt: 0, updatedAt: 0 })
        ).rejects.toThrow('暂不支持');
    });
});
