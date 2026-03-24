

import React from 'react';
<<<<<<< Updated upstream
import type { WheelAction } from '../types';
import type { UserApiKey, ModelPreference, AIProvider } from '../types';
=======
import type { WheelAction, UserApiKey, ModelPreference, AIProvider, AICapability, ThemeMode, RunningHubConfig } from '../types';
import { validateApiKey } from '../services/aiGateway';
import { RUNNINGHUB_ASPECT_RATIO_OPTIONS, RUNNINGHUB_BASE_URL, RUNNINGHUB_MODEL_OPTIONS } from '../services/runninghubService';
import type { APIConfigStore } from '../src/store/api-config-store';
import type { APIConfig } from '../src/types/api-config';
import { ConfigList } from './ConfigManager/ConfigList';
import { ConfigForm } from './ConfigManager/ConfigForm';
>>>>>>> Stashed changes

const DEFAULT_RUNNINGHUB_CONFIG: RunningHubConfig = {
    textToImageAppId: '',
    imageToImageAppId: '',
    inpaintAppId: '',
    imageNodeId: '2',
    imageInputFieldName: 'images',
    maskNodeId: '',
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
    model: RUNNINGHUB_MODEL_OPTIONS[0],
    aspectRatio: '16:9',
    instanceType: 'default',
    usePersonalQueue: false,
};

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

<<<<<<< Updated upstream
=======
const providerBaseUrl: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    stability: 'https://api.stability.ai/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    banana: 'https://api.banana.dev/v1/vision',
    runninghub: RUNNINGHUB_BASE_URL,
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
    image: ['gemini-2.5-flash-image', 'imagen-4.0-generate-001', 'dall-e-3', 'sdxl', 'runninghub-image'],
    video: ['veo-2.0-generate-001'],
    agent: ['banana-vision-v1'],
};

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
    const [provider, setProvider] = React.useState<AIProvider>('google');
    const [apiKey, setApiKey] = React.useState('');
    const [baseUrl, setBaseUrl] = React.useState(providerBaseUrl.google);
    const [displayName, setDisplayName] = React.useState('');
    const [showKey, setShowKey] = React.useState(false);
    const [capabilities, setCapabilities] = React.useState<AICapability[]>(['text', 'image', 'video']);
    const [runninghubConfig, setRunninghubConfig] = React.useState<RunningHubConfig>(DEFAULT_RUNNINGHUB_CONFIG);
    const [isValidating, setIsValidating] = React.useState(false);
    const [validationResult, setValidationResult] = React.useState<{ ok: boolean; message?: string } | null>(null);
    const [showConfigForm, setShowConfigForm] = React.useState(false);
    const [editingConfig, setEditingConfig] = React.useState<APIConfig | null>(null);
    // 当前正在编辑的 API Key（null = 新增模式）
    const [editingKeyId, setEditingKeyId] = React.useState<string | null>(null);
    // 控制 API Key 添加/编辑弹窗
    const [showKeyModal, setShowKeyModal] = React.useState(false);
    // 自定义模型管理
    const [customModels, setCustomModels] = React.useState<string[]>([]);
    const [defaultModel, setDefaultModel] = React.useState('');
    const [newModelInput, setNewModelInput] = React.useState('');

>>>>>>> Stashed changes
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

    const getSafeCustomModels = React.useCallback((models: unknown): string[] => {
        if (!Array.isArray(models)) return [];
        return models.filter((model): model is string => typeof model === 'string' && model.trim().length > 0);
    }, []);

    const resetRunningHubConfig = React.useCallback(() => {
        setRunninghubConfig(DEFAULT_RUNNINGHUB_CONFIG);
    }, []);

    const openNewKeyModal = React.useCallback(() => {
        setEditingKeyId(null);
        setApiKey('');
        setDisplayName('');
        setProvider('google');
        setBaseUrl(providerBaseUrl.google);
        setCapabilities(['text', 'image', 'video']);
        setCustomModels([]);
        setDefaultModel('');
        setNewModelInput('');
        setValidationResult(null);
        resetRunningHubConfig();
        setShowKeyModal(true);
    }, [resetRunningHubConfig]);

    const handleProviderChange = (next: AIProvider) => {
        setProvider(next);
        setBaseUrl(providerBaseUrl[next]);
<<<<<<< Updated upstream
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
=======
        if (next === 'banana') setCapabilities(['agent']);
        if (next === 'anthropic' || next === 'qwen') setCapabilities(['text']);
        if (next === 'stability') setCapabilities(['image']);
        if (next === 'google') setCapabilities(['text', 'image', 'video']);
        if (next === 'openai') setCapabilities(['text', 'image']);
        if (next === 'runninghub') {
            setCapabilities(['image']);
            setCustomModels([]);
            setDefaultModel('');
            resetRunningHubConfig();
        }
        if (next === 'custom') setCapabilities(['text', 'image', 'video']);
    };

    const handleSaveKey = async () => {
        if (!apiKey.trim() || capabilities.length === 0) return;

        // 先验证 key 是否有效
        setIsValidating(true);
        setValidationResult(null);
        const result = await validateApiKey(
            provider,
            apiKey.trim(),
            provider === 'runninghub' ? undefined : (baseUrl.trim() || undefined),
            provider === 'runninghub' ? { runninghub: runninghubConfig } : undefined,
        );
        setIsValidating(false);
        setValidationResult(result);

        if (!result.ok) return; // 验证失败不保存

        if (editingKeyId) {
            // 编辑模式：更新已有 Key
            onUpdateApiKey(editingKeyId, {
                provider,
                capabilities,
                key: apiKey.trim(),
                baseUrl: provider === 'runninghub' ? undefined : (baseUrl.trim() || undefined),
                name: displayName.trim() || undefined,
                status: 'ok',
                customModels: provider === 'runninghub' ? undefined : (customModels.length > 0 ? customModels : undefined),
                defaultModel: provider === 'runninghub' ? undefined : (defaultModel || undefined),
                runninghub: provider === 'runninghub' ? runninghubConfig : undefined,
            });
        } else {
            // 新增模式
            onAddApiKey({
                provider,
                capabilities,
                key: apiKey.trim(),
                baseUrl: provider === 'runninghub' ? undefined : (baseUrl.trim() || undefined),
                name: displayName.trim() || undefined,
                status: 'ok',
                isDefault: false,
                customModels: provider === 'runninghub' ? undefined : (customModels.length > 0 ? customModels : undefined),
                defaultModel: provider === 'runninghub' ? undefined : (defaultModel || undefined),
                runninghub: provider === 'runninghub' ? runninghubConfig : undefined,
            });
>>>>>>> Stashed changes
        }
    };

<<<<<<< Updated upstream
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
=======
    /** 点击已有 Key 的"编辑"按钮 — 将其字段填入表单并打开弹窗 */
    const handleStartEdit = (item: UserApiKey) => {
        setEditingKeyId(item.id);
        setProvider(item.provider);
        setApiKey(item.key);
        setBaseUrl(item.baseUrl || providerBaseUrl[item.provider]);
        setDisplayName(item.name || '');
        setCapabilities(item.capabilities?.length ? [...item.capabilities] : ['text', 'image', 'video']);
        setCustomModels(getSafeCustomModels(item.customModels));
        setDefaultModel(item.defaultModel || '');
        setRunninghubConfig(item.runninghub || DEFAULT_RUNNINGHUB_CONFIG);
        setNewModelInput('');
        setValidationResult(null);
        setShowKeyModal(true);
    };

    /** 取消编辑 / 重置表单并关闭弹窗 */
    const handleCancelEdit = () => {
        setEditingKeyId(null);
        setApiKey('');
        setDisplayName('');
        setCustomModels([]);
        setDefaultModel('');
        setNewModelInput('');
        setValidationResult(null);
        resetRunningHubConfig();
        setShowKeyModal(false);
>>>>>>> Stashed changes
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
        >
            <div
                className="relative p-6 sm:p-8 border border-neutral-200/60 rounded-3xl shadow-2xl flex flex-col gap-5 w-[92%] sm:w-[480px] max-h-[88vh] overflow-y-auto bg-white/95 backdrop-blur-xl transform transition-all duration-300 scale-100"
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

<<<<<<< Updated upstream
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
=======
                <div className="space-y-6">
                    <section className="space-y-3">
                        <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                            界面主题
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                            {([
                                ['light', '浅色模式', '明亮白板与柔和面板'],
                                ['dark', '黑夜模式', '深色工作台与高对比内容'],
                                ['system', '跟随系统', '自动跟随设备主题'],
                            ] as Array<[ThemeMode, string, string]>).map(([mode, title, description]) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setThemeMode(mode)}
                                    className={`rounded-[24px] border p-4 text-left transition ${
                                        themeMode === mode
                                            ? isDark
                                                ? 'border-[#4B5B78] bg-[#1B2330] shadow-[0_10px_30px_rgba(0,0,0,0.18)]'
                                                : 'border-[#B2CCFF] bg-[#EEF4FF] shadow-[0_10px_30px_rgba(23,92,211,0.08)]'
                                            : isDark
                                                ? 'border-[#2A3140] bg-[#161A22] hover:bg-[#1B2029]'
                                                : 'border-[#E4E7EC] bg-[#F8FAFC] hover:bg-white'
                                    }`}
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className={`text-sm font-semibold ${isDark ? 'text-[#F3F4F6]' : 'text-[#101828]'}`}>{title}</div>
                                        {themeMode === mode && (
                                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                                                isDark ? 'bg-[#7CB4FF]/20 text-[#7CB4FF]' : 'bg-[#DCEBFF] text-[#175CD3]'
                                            }`}>
                                                当前
                                            </span>
                                        )}
                                    </div>
                                    <div className={`mb-4 text-xs ${isDark ? 'text-[#98A2B3]' : 'text-[#667085]'}`}>{description}</div>
                                    <div className={`grid h-16 grid-cols-[1fr_56px] gap-2 rounded-2xl p-2 ${
                                        mode === 'dark' || (mode === 'system' && resolvedTheme === 'dark')
                                            ? 'bg-[#0F141C]'
                                            : 'bg-white'
                                    }`}>
                                        <div className={`rounded-xl border ${
                                            mode === 'dark' || (mode === 'system' && resolvedTheme === 'dark')
                                                ? 'border-[#2A3140] bg-[#161A22]'
                                                : 'border-[#E4E7EC] bg-[#F8FAFC]'
                                        }`} />
                                        <div className={`rounded-xl border ${
                                            mode === 'dark' || (mode === 'system' && resolvedTheme === 'dark')
                                                ? 'border-[#2A3140] bg-[#12151B]'
                                                : 'border-[#E4E7EC] bg-white'
                                        }`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                            语言与交互
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className={`rounded-2xl p-3 ${isDark ? 'bg-[#161A22]' : 'bg-[#F8FAFC]'}`}>
                                <div className={`mb-2 text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>语言</div>
                                <div className={`inline-flex w-full rounded-full border p-1 ${isDark ? 'border-[#2A3140] bg-[#12151B]' : 'border-[#E4E7EC] bg-white'}`}>
                                    {([
                                        ['en', 'English'],
                                        ['zho', '中文'],
                                    ] as Array<['en' | 'zho', string]>).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setLanguage(value)}
                                            className={`flex-1 rounded-full px-3 py-2 text-sm transition ${
                                                language === value
                                                    ? isDark
                                                        ? 'bg-[#F3F4F6] text-[#111827]'
                                                        : 'bg-[#111827] text-white'
                                                    : isDark
                                                        ? 'text-[#98A2B3]'
                                                        : 'text-[#667085]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`rounded-2xl p-3 ${isDark ? 'bg-[#161A22]' : 'bg-[#F8FAFC]'}`}>
                                <div className={`mb-2 text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>滚轮行为</div>
                                <div className={`inline-flex w-full rounded-full border p-1 ${isDark ? 'border-[#2A3140] bg-[#12151B]' : 'border-[#E4E7EC] bg-white'}`}>
                                    {([
                                        ['zoom', '缩放'],
                                        ['pan', '平移'],
                                    ] as Array<[WheelAction, string]>).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setWheelAction(value)}
                                            className={`flex-1 rounded-full px-3 py-2 text-sm transition ${
                                                wheelAction === value
                                                    ? isDark
                                                        ? 'bg-[#F3F4F6] text-[#111827]'
                                                        : 'bg-[#111827] text-white'
                                                    : isDark
                                                        ? 'text-[#98A2B3]'
                                                        : 'text-[#667085]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 新：API 配置管理（CRUD） ───────────────────────── */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                                ⚙️ API 配置管理
                            </div>
                            <button
                                type="button"
                                onClick={() => { setEditingConfig(null); setShowConfigForm(true); }}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                    isDark
                                        ? 'border-[#4B5B78] bg-[#1B2330] text-[#B2CCFF] hover:bg-[#252C39]'
                                        : 'border-[#B2CCFF] bg-[#EEF4FF] text-[#175CD3] hover:bg-[#DBEAFE]'
                                }`}
                            >
                                + 新建
                            </button>
                        </div>
                        <ConfigList
                            configs={apiConfigStore.configs}
                            activeConfigId={apiConfigStore.activeConfigId}
                            onSelect={apiConfigStore.setActiveConfig}
                            onEdit={(config) => { setEditingConfig(config); setShowConfigForm(true); }}
                            onDelete={apiConfigStore.deleteConfig}
                            isDark={isDark}
                        />
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                                API 配置
                            </div>
                            <button
                                type="button"
                                onClick={openNewKeyModal}
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                    isDark ? 'border-[#4B5B78] bg-[#1B2330] text-[#B2CCFF] hover:bg-[#252C39]' : 'border-[#B2CCFF] bg-[#EEF4FF] text-[#175CD3] hover:bg-[#DBEAFE]'
                                }`}
                            >
                                + 添加 API Key
                            </button>
                        </div>

                        <div className="space-y-2">
                            {userApiKeys.length === 0 ? (
                                <div className={`rounded-2xl border border-dashed px-4 py-6 text-center text-sm ${
                                    isDark ? 'border-[#3A4458] text-[#98A2B3]' : 'border-[#D0D5DD] text-[#667085]'
                                }`}>
                                    <div className="mb-2 text-lg">🔑</div>
                                    <div className="font-medium">还没有配置 API Key</div>
                                    <div className="mt-1 text-xs">点击右上方「+ 添加 API Key」按钮开始配置</div>
                                </div>
                            ) : (
                                userApiKeys.map(item => (
                                    <div key={item.id} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                                        editingKeyId === item.id
                                            ? isDark ? 'border-[#4B5B78] bg-[#1B2330]' : 'border-[#1D4ED8] bg-[#EFF6FF]'
                                            : isDark ? 'border-[#2A3140] bg-[#161A22]' : 'border-[#E4E7EC] bg-white'
                                    }`}>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block h-2 w-2 rounded-full ${
                                                    item.status === 'ok' ? 'bg-green-500' : item.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                                                }`} title={item.status === 'ok' ? '已验证' : item.status === 'error' ? '验证失败' : '未验证'} />
                                                <span className={`truncate text-sm font-medium ${isDark ? 'text-[#F3F4F6]' : 'text-[#101828]'}`}>{item.name || item.provider}</span>
                                                {editingKeyId === item.id && (
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                        isDark ? 'bg-[#1B2330] text-[#7CB4FF]' : 'bg-[#EFF6FF] text-[#1D4ED8]'
                                                    }`}>编辑中</span>
                                                )}
                                            </div>
                                            <div className={`mt-1 text-xs ${isDark ? 'text-[#98A2B3]' : 'text-[#667085]'}`}>{maskKey(item.key)}</div>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {(item.capabilities || []).map(capability => (
                                                    <span key={capability} className={`rounded-full px-2 py-1 text-[11px] ${
                                                        isDark ? 'bg-[#1B2029] text-[#98A2B3]' : 'bg-[#F2F4F7] text-[#667085]'
                                                    }`}>
                                                        {capabilityLabels[capability]}
                                                    </span>
                                                ))}
                                                {getSafeCustomModels(item.customModels).length > 0 && (
                                                    <span className={`rounded-full px-2 py-1 text-[11px] ${
                                                        isDark ? 'bg-[#1B2330] text-[#7CB4FF]' : 'bg-[#EFF6FF] text-[#175CD3]'
                                                    }`} title={getSafeCustomModels(item.customModels).join(', ')}>
                                                        {getSafeCustomModels(item.customModels).length} 个模型{item.defaultModel ? ` · ${item.defaultModel}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-3 flex items-center gap-2">
                                            {!item.isDefault ? (
                                                <button type="button" onClick={() => onSetDefaultApiKey(item.id)} className={chipClass}>
                                                    设为默认
                                                </button>
                                            ) : (
                                                <span className={`rounded-full px-3 py-2 text-xs font-medium ${
                                                    isDark ? 'bg-[#123524] text-[#75E0A7]' : 'bg-[#ECFDF3] text-[#027A48]'
                                                }`}>
                                                    默认
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(item)}
                                                className={`rounded-full border px-3 py-2 text-xs font-medium ${
                                                    isDark ? 'border-[#2A3140] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F2F4F7]'
                                                }`}
                                            >
                                                编辑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteApiKey(item.id)}
                                                className={`rounded-full border px-3 py-2 text-xs font-medium ${
                                                    isDark ? 'border-[#7A271A] text-[#FDA29B]' : 'border-[#FECACA] text-[#DC2626]'
                                                }`}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                            模型偏好
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {(['text', 'image', 'video', 'agent'] as const).map(cap => {
                                const labels = { text: 'LLM 润色模型', image: '图片模型', video: '视频模型', agent: 'Agent 模型' };
                                const prefKey = { text: 'textModel', image: 'imageModel', video: 'videoModel', agent: 'agentModel' } as const;
                                const userModels = userApiKeys
                                    .filter(k => k.capabilities?.includes(cap) && k.customModels?.length)
                                    .flatMap(k => getSafeCustomModels(k.customModels));
                                const allModels = [...new Set([...modelOptions[cap], ...userModels])];
                                return (
                                    <label key={cap} className={`rounded-2xl p-3 ${isDark ? 'bg-[#161A22]' : 'bg-[#F8FAFC]'}`}>
                                        <div className={`mb-2 text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>{labels[cap]}</div>
                                        <select value={modelPreference[prefKey[cap]]} onChange={(event) => setModelPreference({ ...modelPreference, [prefKey[cap]]: event.target.value })} className={inputClass}>
                                            {allModels.map(model => <option key={model} value={model}>{model}</option>)}
                                        </select>
                                    </label>
                                );
                            })}
                        </div>
                    </section>

                    {/* Security section */}
                    <section className="space-y-3">
                        <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                            🔒 安全
                        </div>
                        <label className={`flex cursor-pointer items-center justify-between rounded-2xl p-4 ${isDark ? 'bg-[#161A22]' : 'bg-[#F8FAFC]'}`}>
                            <div>
                                <div className={`text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>关闭页面时清除 API Key</div>
                                <div className={`mt-1 text-xs ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>启用后每次关闭浏览器标签页将自动清除保存的 API Key，下次访问需重新输入</div>
                            </div>
                            <button
                                type="button"
                                aria-label="关闭页面时清除 API Key"
                                onClick={() => setClearKeysOnExit(!clearKeysOnExit)}
                                className={`relative ml-4 inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                                    clearKeysOnExit
                                        ? 'bg-green-500'
                                        : isDark ? 'bg-[#3A4458]' : 'bg-[#D0D5DD]'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${clearKeysOnExit ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </label>
                        <div className={`rounded-2xl border p-3 text-xs ${isDark ? 'border-[#2A3140] text-[#667085]' : 'border-[#E4E7EC] text-[#98A2B3]'}`}>
                            ✅ API Key 已加密存储（AES-GCM），不再以明文保留在 localStorage 中。
                        </div>
                    </section>
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
            {/* API Key 添加/编辑弹窗 */}
            {showKeyModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleCancelEdit}>
                    <div
                        className={`relative w-[90%] max-w-[440px] rounded-[24px] border p-6 shadow-[0_40px_100px_rgba(0,0,0,0.2)] ${
                            isDark ? 'border-[#2A3140] bg-[#12151B]' : 'border-[#E4E7EC] bg-white'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className={`text-base font-semibold ${isDark ? 'text-[#F3F4F6]' : 'text-[#101828]'}`}>
                                {editingKeyId ? '编辑 API Key' : '添加 API Key'}
                            </h4>
                            <button type="button" title="关闭 API Key 弹窗" aria-label="关闭 API Key 弹窗" onClick={handleCancelEdit} className={`rounded-full p-1.5 transition ${isDark ? 'hover:bg-[#252C39]' : 'hover:bg-[#F2F4F7]'}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <select title="选择 API 提供商" aria-label="选择 API 提供商" value={provider} onChange={(event) => handleProviderChange(event.target.value as AIProvider)} className={inputClass}>
                                    <option value="google">Google</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="qwen">Qwen</option>
                                    <option value="stability">Stability</option>
                                    <option value="banana">Banana</option>
                                    <option value="runninghub">RunningHub</option>
                                    <option value="custom">Custom</option>
                                </select>
                                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="备注名称（可选）" className={inputClass} />
                            </div>

                            <div className="flex gap-2">
                                <input
                                    value={apiKey}
                                    onChange={(event) => setApiKey(event.target.value)}
                                    type={showKey ? 'text' : 'password'}
                                    placeholder="粘贴 API Key"
                                    className={inputClass}
                                    autoFocus
                                />
                                <button type="button" onClick={() => setShowKey(prev => !prev)} className={chipClass}>
                                    {showKey ? '隐藏' : '显示'}
                                </button>
                            </div>

                            {provider === 'runninghub' ? (
                                <div className={`rounded-2xl border px-3 py-2 text-xs ${isDark ? 'border-[#2A3140] bg-[#161A22] text-[#98A2B3]' : 'border-[#E4E7EC] bg-[#F8FAFC] text-[#667085]'}`}>
                                    RunningHub 使用平台固定地址 {RUNNINGHUB_BASE_URL}。当前版本已接入文生图，查询接口和上传接口会由应用自动调用，无需手动填写 Base URL。
                                </div>
                            ) : (
                                <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="Base URL（可选）" className={inputClass} />
                            )}

                            {provider === 'runninghub' && (
                                <div className={`space-y-3 rounded-[20px] border p-3 ${isDark ? 'border-[#2A3140] bg-[#161A22]' : 'border-[#E4E7EC] bg-[#F8FAFC]'}`}>
                                    <div className={`text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>RunningHub 工作流配置</div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            value={runninghubConfig.textToImageAppId || ''}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, textToImageAppId: event.target.value }))}
                                            placeholder="文生图 App ID"
                                            className={inputClass}
                                        />
                                        <input
                                            value={runninghubConfig.imageToImageAppId || ''}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, imageToImageAppId: event.target.value }))}
                                            placeholder="图生图 App ID"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            value={runninghubConfig.inpaintAppId || ''}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, inpaintAppId: event.target.value }))}
                                            placeholder="局部重绘 App ID"
                                            className={inputClass}
                                        />
                                        <input
                                            value={runninghubConfig.imageNodeId || '2'}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, imageNodeId: event.target.value }))}
                                            placeholder="图片输入节点 ID，默认 2"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            value={runninghubConfig.imageInputFieldName || 'images'}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, imageInputFieldName: event.target.value }))}
                                            placeholder="图片参数名，默认 images"
                                            className={inputClass}
                                        />
                                        <input
                                            value={runninghubConfig.maskNodeId || ''}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, maskNodeId: event.target.value }))}
                                            placeholder="遮罩节点 ID（留空同图片节点）"
                                            className={inputClass}
                                        />
                                    </div>
                                    <input
                                        value={runninghubConfig.maskFieldName || 'mask'}
                                        onChange={(event) => setRunninghubConfig(prev => ({ ...prev, maskFieldName: event.target.value }))}
                                        placeholder="遮罩参数名，默认 mask"
                                        className={inputClass}
                                    />
                                    <div className={`space-y-3 rounded-2xl border p-3 ${isDark ? 'border-[#2A3140] bg-[#12151B]' : 'border-[#E4E7EC] bg-white'}`}>
                                        <div className={`text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>高级节点映射</div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <input
                                                value={runninghubConfig.promptNodeId || '1'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, promptNodeId: event.target.value }))}
                                                placeholder="提示词节点 ID"
                                                className={inputClass}
                                            />
                                            <input
                                                value={runninghubConfig.promptFieldName || 'text'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, promptFieldName: event.target.value }))}
                                                placeholder="提示词字段名"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <input
                                                value={runninghubConfig.modelNodeId || '4'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, modelNodeId: event.target.value }))}
                                                placeholder="模型节点 ID"
                                                className={inputClass}
                                            />
                                            <input
                                                value={runninghubConfig.modelFieldName || 'model_selected'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, modelFieldName: event.target.value }))}
                                                placeholder="模型字段名"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <input
                                                value={runninghubConfig.aspectNodeId || '4'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, aspectNodeId: event.target.value }))}
                                                placeholder="比例节点 ID"
                                                className={inputClass}
                                            />
                                            <input
                                                value={runninghubConfig.aspectFieldName || 'aspect_rate'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, aspectFieldName: event.target.value }))}
                                                placeholder="比例字段名"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <input
                                                value={runninghubConfig.promptTypeNodeId || '17'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, promptTypeNodeId: event.target.value }))}
                                                placeholder="提示词类型节点 ID"
                                                className={inputClass}
                                            />
                                            <input
                                                value={runninghubConfig.promptTypeFieldName || 'select'}
                                                onChange={(event) => setRunninghubConfig(prev => ({ ...prev, promptTypeFieldName: event.target.value }))}
                                                placeholder="提示词类型字段名"
                                                className={inputClass}
                                            />
                                        </div>
                                        <input
                                            value={runninghubConfig.promptTypeValue || '1'}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, promptTypeValue: event.target.value }))}
                                            placeholder="提示词类型默认值"
                                            className={inputClass}
                                        />
                                        <textarea
                                            value={runninghubConfig.modelFieldDataJson || ''}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, modelFieldDataJson: event.target.value }))}
                                            placeholder="模型字段 fieldData JSON，可选"
                                            className={inputClass}
                                            rows={3}
                                        />
                                        <textarea
                                            value={runninghubConfig.aspectFieldDataJson || ''}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, aspectFieldDataJson: event.target.value }))}
                                            placeholder="比例字段 fieldData JSON，可选"
                                            className={inputClass}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <select
                                            value={runninghubConfig.model || RUNNINGHUB_MODEL_OPTIONS[0]}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, model: event.target.value }))}
                                            className={inputClass}
                                            aria-label="RunningHub 默认模型"
                                            title="RunningHub 默认模型"
                                        >
                                            {RUNNINGHUB_MODEL_OPTIONS.map(model => <option key={model} value={model}>{model}</option>)}
                                        </select>
                                        <select
                                            value={runninghubConfig.aspectRatio || '16:9'}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, aspectRatio: event.target.value as RunningHubConfig['aspectRatio'] }))}
                                            className={inputClass}
                                            aria-label="RunningHub 默认比例"
                                            title="RunningHub 默认比例"
                                        >
                                            {RUNNINGHUB_ASPECT_RATIO_OPTIONS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <select
                                            value={runninghubConfig.instanceType || 'default'}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, instanceType: event.target.value as RunningHubConfig['instanceType'] }))}
                                            className={inputClass}
                                            aria-label="RunningHub 实例类型"
                                            title="RunningHub 实例类型"
                                        >
                                            <option value="default">default (24G)</option>
                                            <option value="plus">plus (48G)</option>
                                        </select>
                                        <input
                                            value={runninghubConfig.retainSeconds ?? ''}
                                            onChange={(event) => {
                                                const value = event.target.value.trim();
                                                setRunninghubConfig(prev => ({ ...prev, retainSeconds: value ? Number(value) : undefined }));
                                            }}
                                            placeholder="retainSeconds（可选）"
                                            inputMode="numeric"
                                            className={inputClass}
                                        />
                                    </div>
                                    <input
                                        value={runninghubConfig.webhookUrl || ''}
                                        onChange={(event) => setRunninghubConfig(prev => ({ ...prev, webhookUrl: event.target.value }))}
                                        placeholder="webhookUrl（可选）"
                                        className={inputClass}
                                    />
                                    <label className="flex items-center gap-2 text-xs">
                                        <input
                                            type="checkbox"
                                            checked={runninghubConfig.usePersonalQueue ?? false}
                                            onChange={(event) => setRunninghubConfig(prev => ({ ...prev, usePersonalQueue: event.target.checked }))}
                                        />
                                        <span className={isDark ? 'text-[#98A2B3]' : 'text-[#667085]'}>使用个人独占队列</span>
                                    </label>
                                    <div className={`text-[11px] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                                        文生图会走文生图 App ID；参考图编辑会走图生图 App ID；局部重绘会走局部重绘 App ID，并把白板遮罩按 data URI 注入到你填写的遮罩参数名里。
                                    </div>
                                </div>
                            )}

                            {(provider === 'openai' || provider === 'custom' || provider === 'qwen') && (
                                <div className={`rounded-2xl border px-3 py-2 text-xs ${isDark ? 'border-[#2A3140] bg-[#161A22] text-[#98A2B3]' : 'border-[#E4E7EC] bg-[#F8FAFC] text-[#667085]'}`}>
                                    OpenAI 兼容第三方接口可直接填写基础域名。应用会自动按兼容格式补全为 /v1；如果服务商已经给出完整路径，也可以直接填写完整地址。
                                </div>
                            )}

                            <div>
                                <div className={`mb-2 text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>这个 API 用于</div>
                                <div className="flex flex-wrap gap-2">
                                    {(['text', 'image', 'video', 'agent'] as AICapability[]).map(capability => (
                                        <button
                                            key={capability}
                                            type="button"
                                            onClick={() => toggleCapability(capability)}
                                            className={`${chipClass} ${
                                                capabilities.includes(capability)
                                                    ? isDark
                                                        ? 'border-[#4B5B78] bg-[#1B2330] text-[#7CB4FF]'
                                                        : 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                                                    : ''
                                            }`}
                                        >
                                            {capabilityLabels[capability]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 自定义模型管理 */}
                            {provider !== 'runninghub' && (
                            <div>
                                <div className={`mb-2 text-sm font-medium ${isDark ? 'text-[#D0D5DD]' : 'text-[#344054]'}`}>自定义模型（可选）</div>
                                <div className="flex gap-2">
                                    <input
                                        value={newModelInput}
                                        onChange={(e) => setNewModelInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newModelInput.trim()) {
                                                e.preventDefault();
                                                const model = newModelInput.trim();
                                                if (!customModels.includes(model)) {
                                                    setCustomModels(prev => [...prev, model]);
                                                    if (!defaultModel) setDefaultModel(model);
                                                }
                                                setNewModelInput('');
                                            }
                                        }}
                                        placeholder="输入模型 ID，回车添加"
                                        className={inputClass}
                                    />
                                    <button
                                        type="button"
                                        disabled={!newModelInput.trim()}
                                        onClick={() => {
                                            const model = newModelInput.trim();
                                            if (model && !customModels.includes(model)) {
                                                setCustomModels(prev => [...prev, model]);
                                                if (!defaultModel) setDefaultModel(model);
                                            }
                                            setNewModelInput('');
                                        }}
                                        className={`rounded-full border px-3 py-2.5 text-sm font-medium whitespace-nowrap transition disabled:opacity-40 ${
                                            isDark ? 'border-[#4B5B78] bg-[#1B2330] text-[#B2CCFF] hover:bg-[#252C39]' : 'border-[#B2CCFF] bg-[#EEF4FF] text-[#175CD3] hover:bg-[#DBEAFE]'
                                        }`}
                                    >
                                        +
                                    </button>
                                </div>
                                {customModels.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {customModels.map(model => (
                                            <span
                                                key={model}
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                                                    model === defaultModel
                                                        ? isDark
                                                            ? 'border-[#4B5B78] bg-[#1B2330] text-[#7CB4FF]'
                                                            : 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                                                        : isDark
                                                            ? 'border-[#2A3140] bg-[#161A22] text-[#D0D5DD]'
                                                            : 'border-[#E4E7EC] bg-[#F8FAFC] text-[#475467]'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setDefaultModel(model)}
                                                    className="truncate max-w-[160px]"
                                                    title={model === defaultModel ? '默认模型' : '点击设为默认'}
                                                >
                                                    {model === defaultModel && <span className="mr-1">★</span>}
                                                    {model}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomModels(prev => prev.filter(m => m !== model));
                                                        if (defaultModel === model) {
                                                            setDefaultModel(customModels.find(m => m !== model) || '');
                                                        }
                                                    }}
                                                    className={`ml-0.5 opacity-50 transition hover:opacity-100 ${isDark ? 'text-[#98A2B3]' : 'text-[#667085]'}`}
                                                    title="移除模型"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {customModels.length > 0 && (
                                    <div className={`mt-1.5 text-[11px] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>
                                        ★ 为默认模型，点击标签可切换
                                    </div>
                                )}
                            </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleSaveKey}
                                    disabled={!apiKey.trim() || capabilities.length === 0 || isValidating}
                                    className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${
                                        isDark
                                            ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white disabled:bg-[#3A4458] disabled:text-[#98A2B3]'
                                            : 'bg-[#111827] text-white hover:bg-[#0F172A] disabled:bg-[#D0D5DD]'
                                    }`}
                                >
                                    {isValidating ? '验证中...' : editingKeyId ? '验证并更新' : '验证并保存'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                                        isDark ? 'border-[#2A3140] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F2F4F7]'
                                    }`}
                                >
                                    取消
                                </button>
                            </div>

                            {validationResult && (
                                <div className={`rounded-xl px-3 py-2 text-sm ${
                                    validationResult.ok
                                        ? isDark ? 'bg-[#123524] text-[#75E0A7]' : 'bg-[#ECFDF3] text-[#027A48]'
                                        : isDark ? 'bg-[#3A1616] text-[#FDA29B]' : 'bg-[#FEF3F2] text-[#B42318]'
                                }`}>
                                    {validationResult.ok
                                        ? '✓ Key 验证通过，已保存'
                                        : `✗ 验证失败：${validationResult.message || 'API Key 无效'}`
                                    }
                                </div>
                            )}
>>>>>>> Stashed changes
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
