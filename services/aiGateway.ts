import type { AIProvider, PromptEnhanceRequest, PromptEnhanceResult, UserApiKey } from '../types';
import { enhancePromptWithGemini, generateImageFromText } from './geminiService';

const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    stability: 'https://api.stability.ai/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    banana: 'https://api.banana.dev/v1/vision',
    custom: '',
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
    if (/^(gemini|imagen|veo)/i.test(model)) return 'google';
    if (/^(dall-e|gpt-image|gpt-4o)/i.test(model)) return 'openai';
    if (/^claude/i.test(model)) return 'anthropic';
    if (/^qwen/i.test(model)) return 'qwen';
    if (/^(sdxl|stable-diffusion)/i.test(model)) return 'stability';
    if (/^banana/i.test(model)) return 'banana';
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

export async function enhancePromptWithProvider(
    request: PromptEnhanceRequest,
    model: string,
    key?: UserApiKey
): Promise<PromptEnhanceResult> {
    const provider = inferProviderFromModel(model);

    if (provider === 'google') {
        return enhancePromptWithGemini(request);
    }

    if (provider === 'anthropic') {
        return enhancePromptWithAnthropic(request, model, key);
    }

    return enhancePromptWithOpenAICompatible(request, model, provider, key);
}

export async function generateImageWithProvider(
    prompt: string,
    model: string,
    key?: UserApiKey
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null }> {
    const provider = inferProviderFromModel(model);

    if (provider === 'google') {
        return generateImageFromText(prompt);
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
