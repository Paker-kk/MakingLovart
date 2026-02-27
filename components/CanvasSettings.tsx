

import React from 'react';
import type { WheelAction } from '../types';
import type { UserApiKey, ModelPreference, AIProvider } from '../types';

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
    t
}) => {
    if (!isOpen) return null;

    const [provider, setProvider] = React.useState<AIProvider>('google');
    const [apiKey, setApiKey] = React.useState('');
    const [baseUrl, setBaseUrl] = React.useState('');
    const [displayName, setDisplayName] = React.useState('');
    const [showKey, setShowKey] = React.useState(false);
    const [isTesting, setIsTesting] = React.useState(false);
    const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);

    const providerBaseUrl: Record<AIProvider, string> = {
        openai: 'https://api.openai.com/v1',
        anthropic: 'https://api.anthropic.com/v1',
        google: 'https://generativelanguage.googleapis.com/v1beta/models',
        stability: 'https://api.stability.ai/v1',
        qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        banana: 'https://api.banana.dev/v1/vision',
        custom: '',
    };

    const modelOptions = {
        text: ['gemini-2.5-pro', 'gpt-4o', 'claude-3-5-sonnet', 'qwen-max'],
        image: ['gemini-2.5-flash-image-preview', 'imagen-4.0-generate-001', 'dall-e-3', 'sdxl'],
        video: ['veo-2.0-generate-001', 'runway-gen3', 'pika-2.2', 'kling-v1.6'],
        agent: ['banana-vision-v1', 'gpt-4o-vision', 'gemini-2.5-flash'],
    };

    const maskKey = (k: string) => {
        if (k.length <= 7) return '****';
        return `${k.slice(0, 3)}****${k.slice(-4)}`;
    };

    const handleProviderChange = (next: AIProvider) => {
        setProvider(next);
        setBaseUrl(providerBaseUrl[next]);
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const timeout = new AbortController();
            const timer = window.setTimeout(() => timeout.abort(), 10000);
            const url = provider === 'google'
                ? `${(baseUrl || providerBaseUrl.google).replace(/\/$/, '')}?key=${encodeURIComponent(apiKey)}`
                : `${(baseUrl || providerBaseUrl[provider]).replace(/\/$/, '')}/models`;
            const headers: Record<string, string> = provider === 'google'
                ? {}
                : { Authorization: `Bearer ${apiKey}` };
            const res = await fetch(url, { headers, signal: timeout.signal });
            window.clearTimeout(timer);
            if (!res.ok) {
                throw new Error(`${res.status} ${res.statusText}`);
            }
            setTestResult({ ok: true, message: '连接成功，可用模型已自动获取' });
        } catch (error) {
            const message = error instanceof Error && error.name === 'AbortError'
                ? '网络超时，请检查网络环境'
                : `连接失败，请检查 Key 或 Base URL（${(error as Error).message}）`;
            setTestResult({ ok: false, message });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveKey = () => {
        if (!apiKey.trim()) return;
        const finalBaseUrl = provider === 'custom' ? baseUrl.trim() : (baseUrl || providerBaseUrl[provider]);
        onAddApiKey({
            provider,
            key: apiKey.trim(),
            baseUrl: finalBaseUrl || undefined,
            name: displayName.trim() || undefined,
            status: testResult?.ok ? 'ok' : 'unknown',
            isDefault: false,
        });
        setApiKey('');
        setDisplayName('');
        setTestResult(null);
    };

    return (
        <div 
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/10 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative p-6 border border-neutral-200 rounded-3xl shadow-2xl flex flex-col gap-5 w-[480px] max-h-[88vh] overflow-y-auto bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-neutral-900">{t('settings.title')}</h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        aria-label="Close settings"
                        title="Close settings"
                        className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Language Settings */}
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t('settings.language')}</label>
                    <div className="inline-flex w-full rounded-xl bg-neutral-100 p-1">
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${language === 'en' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                        >
                            English
                        </button>
                        <button 
                            onClick={() => setLanguage('zho')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${language === 'zho' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                        >
                            中文
                        </button>
                    </div>
                </div>

                {/* Canvas Background */}
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t('settings.canvas')}</label>
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                        <span className="text-sm text-neutral-700">{t('settings.backgroundColor')}</span>
                        <input
                            type="color"
                            title={t('settings.backgroundColor')}
                            aria-label={t('settings.backgroundColor')}
                            value={canvasBackgroundColor}
                            onChange={(e) => onCanvasBackgroundColorChange(e.target.value)}
                            className="w-10 h-10 p-0 border-2 border-white rounded-lg cursor-pointer shadow-sm"
                        />
                    </div>
                </div>

                {/* UI Theme */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t('settings.uiTheme')}</label>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                            <span className="text-sm text-neutral-700">{t('settings.color')}</span>
                            <input
                                type="color"
                                title={t('settings.color')}
                                aria-label={t('settings.color')}
                                value={uiTheme.color}
                                onChange={(e) => setUiTheme({ ...uiTheme, color: e.target.value })}
                                className="w-10 h-10 p-0 border-2 border-white rounded-lg cursor-pointer shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                            <span className="text-sm text-neutral-700 flex-shrink-0">{t('settings.opacity')}</span>
                            <input
                                type="range"
                                title={t('settings.opacity')}
                                aria-label={t('settings.opacity')}
                                min="0.1"
                                max="1"
                                step="0.05"
                                value={uiTheme.opacity}
                                onChange={(e) => setUiTheme({ ...uiTheme, opacity: parseFloat(e.target.value) })}
                                className="flex-1 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900"
                            />
                            <span className="text-xs font-medium text-neutral-500 w-10 text-right">{Math.round(uiTheme.opacity * 100)}%</span>
                        </div>
                    </div>
                </div>

                {/* Button Theme */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t('settings.actionButtonsTheme')}</label>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                            <span className="text-sm text-neutral-700">{t('settings.color')}</span>
                            <input
                                type="color"
                                title={t('settings.color')}
                                aria-label={t('settings.color')}
                                value={buttonTheme.color}
                                onChange={(e) => setButtonTheme({ ...buttonTheme, color: e.target.value })}
                                className="w-10 h-10 p-0 border-2 border-white rounded-lg cursor-pointer shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                            <span className="text-sm text-neutral-700 flex-shrink-0">{t('settings.opacity')}</span>
                            <input
                                type="range"
                                title={t('settings.opacity')}
                                aria-label={t('settings.opacity')}
                                min="0.1"
                                max="1"
                                step="0.05"
                                value={buttonTheme.opacity}
                                onChange={(e) => setButtonTheme({ ...buttonTheme, opacity: parseFloat(e.target.value) })}
                                className="flex-1 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900"
                            />
                            <span className="text-xs font-medium text-neutral-500 w-10 text-right">{Math.round(buttonTheme.opacity * 100)}%</span>
                        </div>
                    </div>
                </div>
                
                {/* Mouse Wheel */}
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{t('settings.mouseWheel')}</label>
                    <div className="inline-flex w-full rounded-xl bg-neutral-100 p-1">
                        <button 
                            onClick={() => setWheelAction('zoom')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${wheelAction === 'zoom' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                        >
                            {t('settings.zoom')}
                        </button>
                        <button 
                            onClick={() => setWheelAction('pan')}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${wheelAction === 'pan' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                        >
                            {t('settings.scroll')}
                        </button>
                    </div>
                </div>

                {/* API Key 管理 */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">API Keys</label>
                    <div className="p-3 bg-neutral-50 rounded-xl space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <select title="服务商" aria-label="服务商" value={provider} onChange={(e) => handleProviderChange(e.target.value as AIProvider)} className="px-2 py-2 rounded-lg border border-neutral-200 text-sm">
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="google">Google Gemini</option>
                                <option value="stability">Stability AI</option>
                                <option value="qwen">通义千问</option>
                                <option value="banana">BANANA</option>
                                <option value="custom">Custom</option>
                            </select>
                            <input title="备注名称" aria-label="备注名称" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="备注名称（可选）" className="px-2 py-2 rounded-lg border border-neutral-200 text-sm" />
                        </div>
                        <div className="flex gap-2">
                            <input title="API Key" aria-label="API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} type={showKey ? 'text' : 'password'} placeholder="粘贴 API Key" className="flex-1 px-2 py-2 rounded-lg border border-neutral-200 text-sm" />
                            <button title="显示或隐藏 API Key" aria-label="显示或隐藏 API Key" onClick={() => setShowKey(v => !v)} className="px-2 text-xs rounded-lg border border-neutral-200">{showKey ? '隐藏' : '显示'}</button>
                        </div>
                        <input title="Base URL" aria-label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL（可选）" className="w-full px-2 py-2 rounded-lg border border-neutral-200 text-sm" />
                        <div className="flex gap-2">
                            <button title="测试连接" aria-label="测试连接" onClick={handleTestConnection} disabled={!apiKey || isTesting} className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white disabled:opacity-50">{isTesting ? '测试中...' : '测试连接'}</button>
                            <button title="保存 Key" aria-label="保存 Key" onClick={handleSaveKey} disabled={!apiKey} className="px-3 py-1.5 text-xs rounded-lg bg-neutral-900 text-white disabled:opacity-50">保存 Key</button>
                        </div>
                        {testResult && (
                            <div className={`text-xs ${testResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>{testResult.message}</div>
                        )}
                    </div>
                    <div className="space-y-1">
                        {userApiKeys.length === 0 ? (
                            <div className="text-xs text-neutral-500">暂无已保存的 API Key</div>
                        ) : userApiKeys.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-neutral-200">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-neutral-800 truncate">{item.name || item.provider}</div>
                                    <div className="text-xs text-neutral-500">{maskKey(item.key)}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {!item.isDefault && <button title="设为默认" aria-label="设为默认" onClick={() => onSetDefaultApiKey(item.id)} className="text-xs px-2 py-1 rounded border border-neutral-200">设默认</button>}
                                    {item.isDefault && <span className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700">默认</span>}
                                    <button title="删除 Key" aria-label="删除 Key" onClick={() => onDeleteApiKey(item.id)} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600">删除</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 模型偏好 */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">模型偏好</label>
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs text-neutral-600">文本模型</label>
                        <select title="文本模型" aria-label="文本模型" value={modelPreference.textModel} onChange={(e) => setModelPreference({ ...modelPreference, textModel: e.target.value })} className="px-2 py-2 rounded-lg border border-neutral-200 text-sm">
                            {modelOptions.text.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <label className="text-xs text-neutral-600">图片模型</label>
                        <select title="图片模型" aria-label="图片模型" value={modelPreference.imageModel} onChange={(e) => setModelPreference({ ...modelPreference, imageModel: e.target.value })} className="px-2 py-2 rounded-lg border border-neutral-200 text-sm">
                            {modelOptions.image.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <label className="text-xs text-neutral-600">视频模型</label>
                        <select title="视频模型" aria-label="视频模型" value={modelPreference.videoModel} onChange={(e) => setModelPreference({ ...modelPreference, videoModel: e.target.value })} className="px-2 py-2 rounded-lg border border-neutral-200 text-sm">
                            {modelOptions.video.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <label className="text-xs text-neutral-600">图层 Agent</label>
                        <select title="图层 Agent 模型" aria-label="图层 Agent 模型" value={modelPreference.agentModel} onChange={(e) => setModelPreference({ ...modelPreference, agentModel: e.target.value })} className="px-2 py-2 rounded-lg border border-neutral-200 text-sm">
                            {modelOptions.agent.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
