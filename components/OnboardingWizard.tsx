/**
 * ============================================
 * 新用户 API Key 引导向导 (Onboarding Wizard)
 * ============================================
 *
 * 【功能】
 * 当用户首次使用（没有任何 API Key 配置）时，自动弹出引导弹窗，
 * 用最简单的 3 步流程帮助小白用户完成 API Key 的配置。
 *
 * 【步骤】
 * Step 1: 欢迎页 — 介绍 MakingLovart 并引导用户获取 API Key
 * Step 2: 输入 API Key — 一个输入框 + 自动验证
 * Step 3: 完成 — 确认配置成功，可以开始创作
 *
 * 【设计原则】
 * - 小白友好：默认 Google Gemini，只需粘贴一个 Key
 * - 自动推断 capabilities
 * - 验证通过才允许继续
 * - 可随时跳过（点击"稍后再说"）
 */

import React, { useState } from 'react';
import type { AIProvider, AICapability, UserApiKey } from '../types';
import { validateApiKey } from '../services/aiGateway';

interface OnboardingWizardProps {
    /** 是否显示弹窗 */
    isOpen: boolean;
    /** 关闭/跳过弹窗 */
    onClose: () => void;
    /** 保存新 API Key 的回调 */
    onAddApiKey: (payload: Omit<UserApiKey, 'id' | 'createdAt' | 'updatedAt'>) => void;
    /** 当前亮/暗主题 */
    resolvedTheme: 'light' | 'dark';
}

/** 各步骤标题 */
const STEPS = [
    { title: '欢迎使用 MakingLovart', subtitle: '让我们花 30 秒完成配置' },
    { title: '粘贴你的 API Key', subtitle: '只需一步，即可开始 AI 创作' },
    { title: '配置完成 🎉', subtitle: '一切就绪，开始创作吧' },
] as const;

/** Provider 对应的默认 capabilities */
const PROVIDER_CAPABILITIES: Record<AIProvider, AICapability[]> = {
    google: ['text', 'image', 'video'],
    openai: ['text', 'image'],
    anthropic: ['text'],
    stability: ['image'],
    qwen: ['text'],
    banana: ['agent'],
    runninghub: ['image'],
    custom: ['text', 'image'],
};

/** Provider 可读标签 */
const PROVIDER_LABELS: Record<string, string> = {
    google: 'Google Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic Claude',
    stability: 'Stability AI',
    qwen: 'Qwen 通义千问',
    runninghub: 'RunningHub',
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
    isOpen,
    onClose,
    onAddApiKey,
    resolvedTheme,
}) => {
    const [step, setStep] = useState(0);
    const [provider, setProvider] = useState<AIProvider>('google');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isDark = resolvedTheme === 'dark';

    // ── 样式工具 ──
    const cardBg = isDark ? 'bg-[#12151B] border-[#2A3140]' : 'bg-white border-[#E4E7EC]';
    const textPrimary = isDark ? 'text-[#F3F4F6]' : 'text-[#101828]';
    const textSecondary = isDark ? 'text-[#98A2B3]' : 'text-[#667085]';
    const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
        isDark
            ? 'border-[#2A3140] bg-[#161A22] text-[#F3F4F6] placeholder:text-[#667085] focus:border-[#4B5B78]'
            : 'border-[#E4E7EC] bg-white text-[#344054] placeholder:text-[#98A2B3] focus:border-[#98A2B3]'
    }`;
    const primaryBtn = `rounded-full px-6 py-3 text-sm font-semibold transition ${
        isDark
            ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white'
            : 'bg-[#111827] text-white hover:bg-[#0F172A]'
    }`;
    const secondaryBtn = `rounded-full px-5 py-3 text-sm font-medium transition ${
        isDark
            ? 'text-[#98A2B3] hover:text-[#D0D5DD]'
            : 'text-[#667085] hover:text-[#344054]'
    }`;

    /**
     * 验证并保存 API Key
     * 验证通过后自动推断 provider capabilities 并保存
     */
    const handleValidateAndSave = async () => {
        if (!apiKey.trim()) return;
        setIsValidating(true);
        setError(null);

        try {
            const result = await validateApiKey(provider, apiKey.trim());
            if (result.ok) {
                // 验证通过，保存 Key 并进入完成页
                onAddApiKey({
                    provider,
                    capabilities: PROVIDER_CAPABILITIES[provider],
                    key: apiKey.trim(),
                    name: `${PROVIDER_LABELS[provider] || provider} Key`,
                    status: 'ok',
                    isDefault: true,
                });
                setStep(2);
            } else {
                setError(result.message || 'API Key 无效，请检查后重试');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '验证时发生错误');
        } finally {
            setIsValidating(false);
        }
    };

    /** 回车提交 */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && apiKey.trim() && !isValidating) {
            handleValidateAndSave();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
                className={`relative w-[90%] max-w-[480px] rounded-[32px] border p-8 shadow-[0_48px_120px_rgba(0,0,0,0.2)] ${cardBg}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── 进度指示器 ── */}
                <div className="mb-6 flex justify-center gap-2">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === step
                                    ? 'w-8 bg-blue-500'
                                    : i < step
                                        ? 'w-4 bg-blue-300'
                                        : isDark ? 'w-4 bg-[#2A3140]' : 'w-4 bg-[#E4E7EC]'
                            }`}
                        />
                    ))}
                </div>

                {/* ── Step 0: 欢迎页 ── */}
                {step === 0 && (
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-3xl shadow-lg">
                            🎨
                        </div>
                        <h2 className={`mb-2 text-xl font-bold ${textPrimary}`}>
                            {STEPS[0].title}
                        </h2>
                        <p className={`mb-2 text-sm ${textSecondary}`}>
                            {STEPS[0].subtitle}
                        </p>
                        <p className={`mb-8 text-sm leading-relaxed ${textSecondary}`}>
                            MakingLovart 使用 AI 帮你在画布上生成图片和视频。<br />
                            你只需要一个 <strong className={textPrimary}>Google Gemini API Key</strong>（免费）就能开始。
                        </p>

                        <div className="space-y-3">
                            <button type="button" onClick={() => setStep(1)} className={primaryBtn + ' w-full'}>
                                开始配置 →
                            </button>
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block text-center text-sm font-medium text-blue-500 hover:text-blue-600`}
                            >
                                还没有 API Key？点击这里免费获取 ↗
                            </a>
                            <button type="button" onClick={onClose} className={secondaryBtn + ' w-full'}>
                                稍后再说
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 1: 输入 API Key ── */}
                {step === 1 && (
                    <div>
                        <h2 className={`mb-1 text-lg font-bold ${textPrimary}`}>
                            {STEPS[1].title}
                        </h2>
                        <p className={`mb-6 text-sm ${textSecondary}`}>
                            {STEPS[1].subtitle}
                        </p>

                        {/* Provider 选择（默认 Google，可切换） */}
                        <div className="mb-4">
                            <label className={`mb-2 block text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>
                                AI 服务商
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {(['google', 'openai', 'anthropic', 'stability', 'qwen'] as AIProvider[]).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => { setProvider(p); setError(null); }}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                            provider === p
                                                ? isDark
                                                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                                                    : 'border-blue-500 bg-blue-50 text-blue-600'
                                                : isDark
                                                    ? 'border-[#2A3140] text-[#98A2B3] hover:bg-[#1B2029]'
                                                    : 'border-[#E4E7EC] text-[#667085] hover:bg-[#F9FAFB]'
                                        }`}
                                    >
                                        {PROVIDER_LABELS[p] || p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* API Key 输入框 */}
                        <div className="mb-4">
                            <label className={`mb-2 block text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>
                                API Key
                            </label>
                            <div className="relative">
                                <input
                                    value={apiKey}
                                    onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                                    onKeyDown={handleKeyDown}
                                    type={showKey ? 'text' : 'password'}
                                    placeholder={provider === 'google' ? 'AIzaSy...' : 'sk-...'}
                                    className={inputClass}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(prev => !prev)}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textSecondary} hover:${textPrimary}`}
                                >
                                    {showKey ? '隐藏' : '显示'}
                                </button>
                            </div>
                        </div>

                        {/* 小提示 */}
                        <div className={`mb-4 rounded-2xl p-3 text-xs leading-relaxed ${isDark ? 'bg-[#161A22] text-[#98A2B3]' : 'bg-[#F8FAFC] text-[#667085]'}`}>
                            {provider === 'google' && (
                                <>
                                    💡 <strong>获取方法</strong>：访问{' '}
                                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                        Google AI Studio
                                    </a>
                                    {' '}→ 点击「Create API Key」→ 复制粘贴到这里。
                                    <br />
                                    <span className="mt-1 inline-block">一个 Key 即可使用文生图、图生图和视频生成全部功能。</span>
                                </>
                            )}
                            {provider === 'openai' && (
                                <>
                                    💡 访问{' '}
                                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                        OpenAI Platform
                                    </a>
                                    {' '}→ 创建新 Key → 复制粘贴到这里。
                                </>
                            )}
                            {provider === 'anthropic' && '💡 支持 Claude 模型的提示词润色功能。'}
                            {provider === 'stability' && '💡 支持 Stable Diffusion XL 图片生成。'}
                            {provider === 'qwen' && '💡 支持通义千问模型的提示词润色功能。'}
                        </div>

                        {/* 错误提示 */}
                        {error && (
                            <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
                                isDark ? 'bg-[#3A1616] text-[#FDA29B]' : 'bg-[#FEF3F2] text-[#B42318]'
                            }`}>
                                ✗ {error}
                            </div>
                        )}

                        {/* 自动推断的功能 */}
                        <div className={`mb-6 flex items-center gap-2 text-xs ${textSecondary}`}>
                            <span>自动启用：</span>
                            {PROVIDER_CAPABILITIES[provider].map(cap => (
                                <span key={cap} className={`rounded-full px-2 py-0.5 ${isDark ? 'bg-[#1B2330] text-[#7CB4FF]' : 'bg-[#EFF6FF] text-[#175CD3]'}`}>
                                    {cap === 'text' ? '✏️ LLM润色' : cap === 'image' ? '🖼️ 图片生成' : cap === 'video' ? '🎬 视频生成' : '🤖 Agent'}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setStep(0); setError(null); }} className={secondaryBtn}>
                                ← 返回
                            </button>
                            <button
                                type="button"
                                onClick={handleValidateAndSave}
                                disabled={!apiKey.trim() || isValidating}
                                className={`${primaryBtn} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                                {isValidating ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        验证中...
                                    </span>
                                ) : '验证并保存 →'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: 完成 ── */}
                {step === 2 && (
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 text-3xl shadow-lg">
                            ✨
                        </div>
                        <h2 className={`mb-2 text-xl font-bold ${textPrimary}`}>
                            {STEPS[2].title}
                        </h2>
                        <p className={`mb-6 text-sm ${textSecondary}`}>
                            {STEPS[2].subtitle}
                        </p>

                        <div className={`mx-auto mb-6 max-w-xs rounded-2xl p-4 text-left ${isDark ? 'bg-[#161A22]' : 'bg-[#F8FAFC]'}`}>
                            <div className={`mb-2 text-xs font-semibold ${textSecondary}`}>已配置</div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-500">✓ 已验证</span>
                                <span className={`text-sm font-medium ${textPrimary}`}>{PROVIDER_LABELS[provider] || provider}</span>
                            </div>
                            <div className={`mt-2 text-xs ${textSecondary}`}>
                                可用功能：{PROVIDER_CAPABILITIES[provider].map(c =>
                                    c === 'text' ? 'LLM润色' : c === 'image' ? '图片生成' : c === 'video' ? '视频生成' : 'Agent'
                                ).join('、')}
                            </div>
                        </div>

                        <div className={`mb-6 rounded-2xl p-4 text-left text-xs leading-relaxed ${isDark ? 'bg-[#161A22] text-[#98A2B3]' : 'bg-[#F8FAFC] text-[#667085]'}`}>
                            <div className="mb-2 font-semibold">💡 快速上手</div>
                            <ol className="ml-4 list-decimal space-y-1">
                                <li>在底部输入栏输入提示词，如「一只在星空下飞翔的猫」</li>
                                <li>点击「生成」或按 Enter</li>
                                <li>AI 生成的图片会自动出现在画布上</li>
                                <li>选中图片后输入新提示词可以进一步编辑</li>
                            </ol>
                        </div>

                        <button type="button" onClick={onClose} className={primaryBtn + ' w-full'}>
                            开始创作 🎨
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
