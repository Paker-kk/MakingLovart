import type { AICapability, AIProvider, PromptEnhanceRequest, PromptEnhanceResult, UserApiKey } from '../types';
import { enhancePromptWithGemini, generateImageFromText, validateGeminiApiKey } from './geminiService';

type ProviderModelMap = { text: string[]; image: string[]; video: string[]; agent?: string[] };

export const DEFAULT_PROVIDER_MODELS: Partial<Record<AIProvider, ProviderModelMap>> = {
    google: {
        text: ['gemini-2.5-pro', 'gemini-2.5-flash'],
        image: ['gemini-2.5-flash-image', 'imagen-4.0-generate-001'],
        video: ['veo-2.0-generate-001'],
    },
    openai: {
        text: ['gpt-4o-mini'],
        image: ['dall-e-3'],
        video: [],
    },
    anthropic: {
        text: ['claude-3-5-sonnet'],
        image: [],
        video: [],
    },
    qwen: {
        text: ['qwen-max'],
        image: [],
        video: [],
    },
    stability: {
        text: [],
        image: ['sdxl'],
        video: [],
    },
    banana: {
        text: [],
        image: [],
        video: [],
        agent: ['banana-vision-v1'],
    },
    deepseek: {
        text: ['deepseek-chat', 'deepseek-reasoner'],
        image: [],
        video: [],
    },
    siliconflow: {
        text: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'],
        image: ['stabilityai/stable-diffusion-3-5-large'],
        video: [],
    },
    keling: {
        text: [],
        image: ['kling-v1'],
        video: ['kling-video-v1'],
    },
    flux: {
        text: [],
        image: ['flux-1.1-pro', 'flux-1-schnell'],
        video: [],
    },
    midjourney: {
        text: [],
        image: ['midjourney-v6.1'],
        video: [],
    },
    runningHub: {
        text: [],
        image: ['rhart-image-n-pro-official'],
        video: [],
    },
};

/**
 * 通用 API Key 验证 — 根据 provider 调用对应的验证逻辑
 */
export async function validateApiKey(provider: AIProvider, apiKey: string, baseUrl?: string): Promise<{ ok: boolean; message?: string }> {
    if (provider === 'google') {
        return validateGeminiApiKey(apiKey);
    }

    // OpenAI-compatible: 调用 /models 接口
    if (provider === 'openai' || provider === 'qwen' || provider === 'deepseek' || provider === 'siliconflow' || provider === 'custom') {
        try {
            const url = (baseUrl || DEFAULT_BASE_URLS[provider]).replace(/\/$/, '');
            const res = await fetch(`${url}/models`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (res.ok) return { ok: true };
            const body = await res.json().catch(() => ({}));
            return { ok: false, message: body?.error?.message || `HTTP ${res.status}` };
        } catch (err) {
            return { ok: false, message: err instanceof Error ? err.message : '网络错误' };
        }
    }

    // Anthropic: 调用 /messages 会返回 401 如果 key 无效
    if (provider === 'anthropic') {
        try {
            const url = (baseUrl || DEFAULT_BASE_URLS.anthropic).replace(/\/$/, '');
            const res = await fetch(`${url}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
            });
            if (res.ok || res.status === 200) return { ok: true };
            if (res.status === 401 || res.status === 403) return { ok: false, message: 'API Key 无效或权限不足' };
            return { ok: true }; // 其他错误可能是模型不存在，但 key 是对的
        } catch (err) {
            return { ok: false, message: err instanceof Error ? err.message : '网络错误' };
        }
    }

    // Keling / Flux / Midjourney: OpenAI-compatible 验证
    if (provider === 'keling' || provider === 'flux' || provider === 'midjourney') {
        try {
            const url = (baseUrl || DEFAULT_BASE_URLS[provider]).replace(/\/$/, '');
            const res = await fetch(`${url}/models`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (res.ok) return { ok: true };
            if (res.status === 401 || res.status === 403) return { ok: false, message: 'API Key 无效或权限不足' };
            return { ok: true, message: '已保存（无法确认在线状态，但格式正确）' };
        } catch (err) {
            return { ok: false, message: err instanceof Error ? err.message : '网络错误' };
        }
    }

    // RunningHub: 32位 hex key 验证
    if (provider === 'runningHub') {
        try {
            const { rhTestApiKey } = await import('./runningHubService');
            const valid = await rhTestApiKey(apiKey);
            return valid ? { ok: true } : { ok: false, message: 'API Key 无效' };
        } catch (err) {
            return { ok: false, message: err instanceof Error ? err.message : '网络错误' };
        }
    }

    // Stability / Banana / 其他: 简单格式校验
    if (apiKey.length < 10) return { ok: false, message: 'API Key 太短' };
    return { ok: true, message: '已保存（格式校验通过，未做在线验证）' };
}

const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    stability: 'https://api.stability.ai/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    banana: 'https://api.banana.dev/v1/vision',
    deepseek: 'https://api.deepseek.com/v1',
    siliconflow: 'https://api.siliconflow.cn/v1',
    keling: 'https://api.klingai.com/v1',
    flux: 'https://api.bfl.ml/v1',
    midjourney: 'https://api.midjourney.com/v1',
    runningHub: 'https://www.runninghub.cn/openapi/v2',
    custom: '',
};

/**
 * 根据 API Key 格式自动推断 Provider（用于粘贴时自动识别）
 */
export function inferProviderFromKey(apiKey: string): AIProvider | null {
    const trimmed = apiKey.trim();
    if (/^AIzaSy/i.test(trimmed)) return 'google';
    if (/^sk-ant-/i.test(trimmed)) return 'anthropic';
    if (/^sk-proj-/i.test(trimmed) || /^sk-[a-zA-Z0-9]{20,}$/.test(trimmed)) return 'openai';
    if (/^sk-[a-f0-9]{32,}$/i.test(trimmed)) return 'deepseek';
    if (/^sa-/i.test(trimmed)) return 'stability';
    if (/^sk-sf/i.test(trimmed)) return 'siliconflow';
    if (/^[a-f0-9]{32}$/i.test(trimmed)) return 'runningHub'; // 32-char hex
    return null;
}

/**
 * Provider 默认 capabilities 推断
 */
export function inferCapabilitiesByProvider(provider: AIProvider): import('../types').AICapability[] {
    const caps = DEFAULT_PROVIDER_MODELS[provider];
    if (!caps) return ['text', 'image'];
    const result: import('../types').AICapability[] = [];
    if (caps.text?.length) result.push('text');
    if (caps.image?.length) result.push('image');
    if (caps.video?.length) result.push('video');
    if (caps.agent?.length) result.push('agent');
    return result.length ? result : ['text'];
}

/** Provider 可读标签 */
export const PROVIDER_LABELS: Record<AIProvider, string> = {
    google: 'Google Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic Claude',
    stability: 'Stability AI',
    qwen: 'Qwen 通义千问',
    banana: 'Banana',
    deepseek: 'DeepSeek 深度求索',
    siliconflow: 'SiliconFlow 硅基流动',
    keling: 'Keling 可灵',
    flux: 'Flux (BFL)',
    midjourney: 'Midjourney',
    runningHub: 'RunningHub',
    custom: '自定义',
};

function getBaseUrl(provider: AIProvider, key?: UserApiKey) {
    return (key?.baseUrl || DEFAULT_BASE_URLS[provider]).replace(/\/$/, '');
}

function requireApiKey(provider: AIProvider, key?: UserApiKey) {
    if (!key?.key) {
        throw new Error(`未配置 ${provider} 的 API Key。请先在设置中保存。`);
    }
    return key.key;
}

function normalizeModelName(model: string): string {
    return model.trim().toLowerCase();
}

export function inferCapabilityFromModel(model: string): AICapability | undefined {
    const normalized = normalizeModelName(model);
    if (!normalized) return undefined;
    if (/^veo([-.\d]|$)/.test(normalized)) return 'video';
    if (/^banana/.test(normalized)) return 'agent';
    if (/^(imagen|dall-e|gpt-image|sdxl|stable-diffusion)/.test(normalized)) return 'image';
    if (/^gemini/.test(normalized)) return normalized.includes('image') ? 'image' : 'text';
    if (/^(gpt|o\d|claude|qwen)/.test(normalized)) return 'text';
    return undefined;
}

export function isGoogleImageEditModel(model: string): boolean {
    const normalized = normalizeModelName(model);
    return inferProviderFromModel(model) === 'google' && /^gemini/.test(normalized) && normalized.includes('image');
}

export function isGoogleTextToImageModel(model: string): boolean {
    return inferProviderFromModel(model) === 'google' && /^imagen/.test(normalizeModelName(model));
}

function inferPromptModeHint(request: PromptEnhanceRequest) {
    const modeHintMap: Record<PromptEnhanceRequest['mode'], string> = {
        smart: 'Do intelligent enhancement with richer cinematic details, composition, and lighting.',
        style: `Rewrite with strong style intent. Preferred style preset: ${request.stylePreset || 'cinematic'}.`,
        precise: 'Preserve user intent strictly; only optimize clarity and structure.',
        translate: 'Translate and optimize prompt for model friendliness while preserving semantics.',
    };

    return [
        'You are a professional prompt engineer for image and video generation.',
        'Return ONLY valid JSON with keys: enhancedPrompt, negativePrompt, suggestions, notes.',
        'Keep enhancedPrompt concise but vivid. Do not use markdown.',
        'negativePrompt should be a comma-separated phrase list.',
        'suggestions should be short keyword phrases.',
        modeHintMap[request.mode],
    ].join('\n');
}

function safeParsePromptResult(raw: string, fallbackPrompt: string): PromptEnhanceResult {
    const clean = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```/i, '')
        .replace(/```$/i, '')
        .trim();

    try {
        const parsed = JSON.parse(clean) as Partial<PromptEnhanceResult>;
        return {
            enhancedPrompt: parsed.enhancedPrompt?.trim() || fallbackPrompt,
            negativePrompt: parsed.negativePrompt?.trim() || '',
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(Boolean).slice(0, 8) : [],
            notes: parsed.notes?.trim() || '',
        };
    } catch {
        return {
            enhancedPrompt: fallbackPrompt,
            negativePrompt: '',
            suggestions: [],
            notes: raw || 'No response content returned by model.',
        };
    }
}

export function inferProviderFromModel(model: string): AIProvider {
    const normalized = normalizeModelName(model);
    if (/^(gemini|imagen|veo)/.test(normalized)) return 'google';
    if (/^(dall-e|gpt-image|gpt-4o|gpt-4\.1|o\d)/.test(normalized)) return 'openai';
    if (/^claude/i.test(model)) return 'anthropic';
    if (/^qwen/i.test(model)) return 'qwen';
    if (/^(sdxl|stable-diffusion)/i.test(model)) return 'stability';
    if (/^banana/i.test(model)) return 'banana';
    if (/^deepseek/i.test(model)) return 'deepseek';
    if (/^(siliconflow|deepseek-ai|Qwen)/i.test(model)) return 'siliconflow';
    if (/^(kling|keling)/i.test(model)) return 'keling';
    if (/^flux/i.test(model)) return 'flux';
    if (/^midjourney/i.test(model)) return 'midjourney';
    return 'custom';
}

async function enhancePromptWithOpenAICompatible(
    request: PromptEnhanceRequest,
    model: string,
    provider: AIProvider,
    key?: UserApiKey
): Promise<PromptEnhanceResult> {
    const apiKey = requireApiKey(provider, key);
    const baseUrl = getBaseUrl(provider, key);
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.6,
            messages: [
                { role: 'system', content: inferPromptModeHint(request) },
                { role: 'user', content: request.prompt },
            ],
        }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`${provider} LLM 请求失败 (${response.status}): ${text || response.statusText}`);
    }

    const json = await response.json();
    const raw = json?.choices?.[0]?.message?.content || '';
    return safeParsePromptResult(raw, request.prompt);
}

async function enhancePromptWithAnthropic(
    request: PromptEnhanceRequest,
    model: string,
    key?: UserApiKey
): Promise<PromptEnhanceResult> {
    const apiKey = requireApiKey('anthropic', key);
    const baseUrl = getBaseUrl('anthropic', key);
    const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 1024,
            system: inferPromptModeHint(request),
            messages: [{ role: 'user', content: request.prompt }],
        }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Anthropic 请求失败 (${response.status}): ${text || response.statusText}`);
    }

    const json = await response.json();
    const raw = Array.isArray(json?.content)
        ? json.content.map((item: { text?: string }) => item.text || '').join('\n')
        : '';
    return safeParsePromptResult(raw, request.prompt);
}

/**
 * 【函数】统一的提示词润色入口
 *
 * 根据模型名称自动推断 provider，路由到对应的润色实现。
 * 所有 provider 都通过 key 参数即时传入 API Key，避免依赖全局状态。
 *
 * @param request  - 润色请求（原始提示词 + 模式）
 * @param model    - 模型名称（用于推断 provider）
 * @param key      - 用户配置的 API Key（可选，从 App.tsx state 传入）
 */
export async function enhancePromptWithProvider(
    request: PromptEnhanceRequest,
    model: string,
    key?: UserApiKey
): Promise<PromptEnhanceResult> {
    const provider = inferProviderFromModel(model);

    if (provider === 'google') {
        // 传入 key?.key 确保使用用户配置的 API Key，而非仅依赖全局 runtimeConfig
        return enhancePromptWithGemini(request, key?.key);
    }

    if (provider === 'anthropic') {
        return enhancePromptWithAnthropic(request, model, key);
    }

    return enhancePromptWithOpenAICompatible(request, model, provider, key);
}

/**
 * 【函数】统一的图片生成入口
 *
 * 根据模型名称路由到 Google Imagen / OpenAI DALL-E / Stability SDXL 等。
 * 当前支持：google、openai、stability、custom。
 * Anthropic / Qwen / Banana 暂不支持图片生成，会抛出错误。
 *
 * @param prompt - 图片描述提示词
 * @param model  - 模型名称
 * @param key    - 用户 API Key
 */
export async function generateImageWithProvider(
    prompt: string,
    model: string,
    key?: UserApiKey
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null }> {
    const provider = inferProviderFromModel(model);

    if (provider === 'google') {
        // 传入 key?.key 确保使用用户 UI 中配置的 API Key
        return generateImageFromText(prompt, key?.key);
    }

    if (provider === 'openai' || provider === 'custom') {
        const apiKey = requireApiKey(provider, key);
        const baseUrl = getBaseUrl(provider, key);
        const response = await fetch(`${baseUrl}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                prompt,
                size: '1024x1024',
                response_format: 'b64_json',
            }),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`${provider} 图片生成失败 (${response.status}): ${text || response.statusText}`);
        }

        const json = await response.json();
        return {
            newImageBase64: json?.data?.[0]?.b64_json || null,
            newImageMimeType: 'image/png',
            textResponse: null,
        };
    }

    if (provider === 'stability') {
        const apiKey = requireApiKey('stability', key);
        const baseUrl = getBaseUrl('stability', key);
        const response = await fetch(`${baseUrl}/generation/stable-diffusion-xl-1024-v1-0/text-to-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                clip_guidance_preset: 'FAST_BLUE',
                height: 1024,
                width: 1024,
                samples: 1,
                steps: 30,
            }),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Stability 图片生成失败 (${response.status}): ${text || response.statusText}`);
        }

        const json = await response.json();
        return {
            newImageBase64: json?.artifacts?.[0]?.base64 || null,
            newImageMimeType: 'image/png',
            textResponse: null,
        };
    }

    throw new Error(`当前暂不支持使用 ${provider} 进行图片生成。`);
}
