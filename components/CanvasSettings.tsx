import React from 'react';
import type { WheelAction, UserApiKey, ModelPreference, AIProvider, AICapability } from '../types';

interface CanvasSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    canvasBackgroundColor: string;
    onCanvasBackgroundColorChange: (color: string) => void;
    language: 'en' | 'zho';
    setLanguage: (lang: 'en' | 'zho') => void;
    uiTheme: { color: string; opacity: number };
    setUiTheme: (theme: { color: string; opacity: number }) => void;
    buttonTheme: { color: string; opacity: number };
    setButtonTheme: (theme: { color: string; opacity: number }) => void;
    wheelAction: WheelAction;
    setWheelAction: (action: WheelAction) => void;
    userApiKeys: UserApiKey[];
    onAddApiKey: (payload: Omit<UserApiKey, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onDeleteApiKey: (id: string) => void;
    onSetDefaultApiKey: (id: string) => void;
    modelPreference: ModelPreference;
    setModelPreference: (prefs: ModelPreference) => void;
    t: (key: string) => string;
}

const providerBaseUrl: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    stability: 'https://api.stability.ai/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    banana: 'https://api.banana.dev/v1/vision',
    custom: '',
};

const capabilityLabels: Record<AICapability, string> = {
    text: 'LLM',
    image: '图片',
    video: '视频',
    agent: 'Agent',
};

const modelOptions = {
    text: ['gemini-2.5-pro', 'gpt-4o-mini', 'claude-3-5-sonnet', 'qwen-max'],
    image: ['gemini-2.5-flash-image-preview', 'imagen-4.0-generate-001', 'dall-e-3', 'sdxl'],
    video: ['veo-2.0-generate-001'],
    agent: ['banana-vision-v1'],
};

const inputClass = 'w-full rounded-2xl border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm text-[#344054] outline-none transition focus:border-[#98A2B3]';
const chipClass = 'rounded-full border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 text-sm text-[#475467] transition hover:bg-[#F2F4F7]';

export const CanvasSettings: React.FC<CanvasSettingsProps> = ({
    isOpen,
    onClose,
    canvasBackgroundColor,
    onCanvasBackgroundColorChange,
    language,
    setLanguage,
    uiTheme,
    setUiTheme,
    buttonTheme,
    setButtonTheme,
    wheelAction,
    setWheelAction,
    userApiKeys,
    onAddApiKey,
    onDeleteApiKey,
    onSetDefaultApiKey,
    modelPreference,
    setModelPreference,
}) => {
    const [provider, setProvider] = React.useState<AIProvider>('google');
    const [apiKey, setApiKey] = React.useState('');
    const [baseUrl, setBaseUrl] = React.useState(providerBaseUrl.google);
    const [displayName, setDisplayName] = React.useState('');
    const [showKey, setShowKey] = React.useState(false);
    const [capabilities, setCapabilities] = React.useState<AICapability[]>(['text', 'image', 'video']);

    if (!isOpen) return null;

    const toggleCapability = (capability: AICapability) => {
        setCapabilities(prev =>
            prev.includes(capability)
                ? prev.filter(item => item !== capability)
                : [...prev, capability]
        );
    };

    const maskKey = (key: string) => {
        if (key.length < 10) return '****';
        return `${key.slice(0, 4)}****${key.slice(-4)}`;
    };

    const handleProviderChange = (next: AIProvider) => {
        setProvider(next);
        setBaseUrl(providerBaseUrl[next]);
        if (next === 'banana') setCapabilities(['agent']);
        if (next === 'anthropic' || next === 'qwen') setCapabilities(['text']);
        if (next === 'stability') setCapabilities(['image']);
        if (next === 'google') setCapabilities(['text', 'image', 'video']);
    };

    const handleSaveKey = () => {
        if (!apiKey.trim() || capabilities.length === 0) return;
        onAddApiKey({
            provider,
            capabilities,
            key: apiKey.trim(),
            baseUrl: baseUrl.trim() || undefined,
            name: displayName.trim() || undefined,
            status: 'unknown',
            isDefault: false,
        });
        setApiKey('');
        setDisplayName('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative max-h-[88vh] w-[92%] max-w-[620px] overflow-y-auto rounded-[28px] border border-[#E4E7EC] bg-white p-6 shadow-[0_40px_120px_rgba(15,23,42,0.18)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-[#101828]">设置</h3>
                        <p className="mt-1 text-sm text-[#667085]">配置白板、模型和 API 能力。</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E4E7EC] text-[#667085] transition hover:bg-[#F9FAFB]"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-6">
                    <section className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">语言与交互</div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">语言</div>
                                <div className="inline-flex w-full rounded-full border border-[#E4E7EC] bg-white p-1">
                                    {([
                                        ['en', 'English'],
                                        ['zho', '中文'],
                                    ] as Array<['en' | 'zho', string]>).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setLanguage(value)}
                                            className={`flex-1 rounded-full px-3 py-2 text-sm transition ${language === value ? 'bg-[#111827] text-white' : 'text-[#667085]'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">滚轮行为</div>
                                <div className="inline-flex w-full rounded-full border border-[#E4E7EC] bg-white p-1">
                                    {([
                                        ['zoom', '缩放'],
                                        ['pan', '平移'],
                                    ] as Array<[WheelAction, string]>).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setWheelAction(value)}
                                            className={`flex-1 rounded-full px-3 py-2 text-sm transition ${wheelAction === value ? 'bg-[#111827] text-white' : 'text-[#667085]'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">画布与外观</div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <label className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">画布背景</div>
                                <input type="color" value={canvasBackgroundColor} onChange={(event) => onCanvasBackgroundColorChange(event.target.value)} className="h-11 w-full rounded-xl border border-white bg-white" />
                            </label>
                            <label className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">界面色</div>
                                <input type="color" value={uiTheme.color} onChange={(event) => setUiTheme({ ...uiTheme, color: event.target.value })} className="h-11 w-full rounded-xl border border-white bg-white" />
                            </label>
                            <label className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">按钮色</div>
                                <input type="color" value={buttonTheme.color} onChange={(event) => setButtonTheme({ ...buttonTheme, color: event.target.value })} className="h-11 w-full rounded-xl border border-white bg-white" />
                            </label>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">API 配置</div>
                        <div className="rounded-[24px] border border-[#E4E7EC] bg-[#F8FAFC] p-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <select value={provider} onChange={(event) => handleProviderChange(event.target.value as AIProvider)} className={inputClass}>
                                    <option value="google">Google</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="qwen">Qwen</option>
                                    <option value="stability">Stability</option>
                                    <option value="banana">Banana</option>
                                    <option value="custom">Custom</option>
                                </select>
                                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="备注名称（可选）" className={inputClass} />
                            </div>

                            <div className="mt-3 space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        value={apiKey}
                                        onChange={(event) => setApiKey(event.target.value)}
                                        type={showKey ? 'text' : 'password'}
                                        placeholder="粘贴 API Key"
                                        className={inputClass}
                                    />
                                    <button type="button" onClick={() => setShowKey(prev => !prev)} className={chipClass}>
                                        {showKey ? '隐藏' : '显示'}
                                    </button>
                                </div>

                                <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="Base URL（可选）" className={inputClass} />

                                <div>
                                    <div className="mb-2 text-sm font-medium text-[#344054]">这个 API 用于</div>
                                    <div className="flex flex-wrap gap-2">
                                        {(['text', 'image', 'video', 'agent'] as AICapability[]).map(capability => (
                                            <button
                                                key={capability}
                                                type="button"
                                                onClick={() => toggleCapability(capability)}
                                                className={`${chipClass} ${capabilities.includes(capability) ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : ''}`}
                                            >
                                                {capabilityLabels[capability]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button type="button" onClick={handleSaveKey} disabled={!apiKey.trim() || capabilities.length === 0} className="rounded-full bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0F172A] disabled:cursor-not-allowed disabled:bg-[#D0D5DD]">
                                    保存 API
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {userApiKeys.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[#D0D5DD] px-4 py-6 text-center text-sm text-[#667085]">
                                    还没有保存任何 API Key。
                                </div>
                            ) : (
                                userApiKeys.map(item => (
                                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium text-[#101828]">{item.name || item.provider}</div>
                                            <div className="mt-1 text-xs text-[#667085]">{maskKey(item.key)}</div>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {(item.capabilities || []).map(capability => (
                                                    <span key={capability} className="rounded-full bg-[#F2F4F7] px-2 py-1 text-[11px] text-[#667085]">
                                                        {capabilityLabels[capability]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="ml-3 flex items-center gap-2">
                                            {!item.isDefault ? (
                                                <button type="button" onClick={() => onSetDefaultApiKey(item.id)} className={chipClass}>
                                                    设为默认
                                                </button>
                                            ) : (
                                                <span className="rounded-full bg-[#ECFDF3] px-3 py-2 text-xs font-medium text-[#027A48]">默认</span>
                                            )}
                                            <button type="button" onClick={() => onDeleteApiKey(item.id)} className="rounded-full border border-[#FECACA] bg-white px-3 py-2 text-xs font-medium text-[#DC2626]">
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98A2B3]">模型偏好</div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">LLM 润色模型</div>
                                <select value={modelPreference.textModel} onChange={(event) => setModelPreference({ ...modelPreference, textModel: event.target.value })} className={inputClass}>
                                    {modelOptions.text.map(model => <option key={model} value={model}>{model}</option>)}
                                </select>
                            </label>
                            <label className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">图片模型</div>
                                <select value={modelPreference.imageModel} onChange={(event) => setModelPreference({ ...modelPreference, imageModel: event.target.value })} className={inputClass}>
                                    {modelOptions.image.map(model => <option key={model} value={model}>{model}</option>)}
                                </select>
                            </label>
                            <label className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">视频模型</div>
                                <select value={modelPreference.videoModel} onChange={(event) => setModelPreference({ ...modelPreference, videoModel: event.target.value })} className={inputClass}>
                                    {modelOptions.video.map(model => <option key={model} value={model}>{model}</option>)}
                                </select>
                            </label>
                            <label className="rounded-2xl bg-[#F8FAFC] p-3">
                                <div className="mb-2 text-sm font-medium text-[#344054]">Agent 模型</div>
                                <select value={modelPreference.agentModel} onChange={(event) => setModelPreference({ ...modelPreference, agentModel: event.target.value })} className={inputClass}>
                                    {modelOptions.agent.map(model => <option key={model} value={model}>{model}</option>)}
                                </select>
                            </label>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
