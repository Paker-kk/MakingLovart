import React, { useCallback, useMemo, useRef, useState } from 'react';
import { QuickPrompts } from './QuickPrompts';
import RichPromptEditor, { type RichPromptEditorHandle } from './RichPromptEditor';
import type { MentionItem } from './MentionList';
import type {
    CharacterLockProfile,
    Element,
    GenerationMode,
    PromptEnhanceMode,
    PromptEnhanceResult,
    UserEffect,
} from '../types';

interface PromptBarProps {
    t: (key: string, ...args: any[]) => string;
    prompt: string;
    setPrompt: (prompt: string) => void;
    onGenerate: () => void;
    isLoading: boolean;
    isSelectionActive: boolean;
    selectedElementCount: number;
    selectedCanvasElements?: Element[];
    userEffects: UserEffect[];
    onAddUserEffect: (effect: UserEffect) => void;
    onDeleteUserEffect: (id: string) => void;
    generationMode: GenerationMode;
    setGenerationMode: (mode: GenerationMode) => void;
    videoAspectRatio: '16:9' | '9:16';
    setVideoAspectRatio: (ratio: '16:9' | '9:16') => void;
    selectedImageModel?: string;
    selectedVideoModel?: string;
    imageModelOptions?: string[];
    videoModelOptions?: string[];
    onImageModelChange?: (model: string) => void;
    onVideoModelChange?: (model: string) => void;
    canvasElements?: Element[];
    onMentionedElementIds?: (ids: string[]) => void;
    onEnhancePrompt?: (payload: { prompt: string; mode: PromptEnhanceMode; stylePreset?: string }) => Promise<PromptEnhanceResult>;
    isEnhancingPrompt?: boolean;
    onLockCharacterFromSelection?: (name?: string) => void;
    canLockCharacter?: boolean;
    characterLocks?: CharacterLockProfile[];
    activeCharacterLockId?: string | null;
    onSetActiveCharacterLock?: (id: string | null) => void;
    layout?: 'dock' | 'floating';
}

function getElementLabel(el: Element): string {
    if (el.name) return el.name;
    const fallbackMap: Record<string, string> = {
        image: '图片',
        video: '视频',
        shape: '形状',
        text: '文字',
        path: '路径',
        group: '分组',
        arrow: '箭头',
        line: '线条',
    };
    return `${fallbackMap[el.type] ?? el.type} ${el.id.slice(-4)}`;
}

function elementToMentionItem(el: Element): MentionItem {
    return {
        id: el.id,
        label: getElementLabel(el),
        thumbnail: el.type === 'image' ? el.href : '',
        elementType: el.type,
    };
}

const STYLE_PRESETS = [
    { value: 'cinematic', label: '电影感' },
    { value: 'ink', label: '水墨' },
    { value: 'ghibli', label: '吉卜力' },
    { value: 'cyberpunk', label: '赛博朋克' },
    { value: 'pixar3d', label: '3D 动画' },
];

const ENHANCE_MODE_LABELS: Record<PromptEnhanceMode, string> = {
    smart: '智能润色',
    style: '风格强化',
    precise: '精准优化',
    translate: '中英互转',
};

export const PromptBar: React.FC<PromptBarProps> = ({
    t,
    prompt,
    setPrompt,
    onGenerate,
    isLoading,
    isSelectionActive,
    selectedElementCount,
    selectedCanvasElements = [],
    userEffects,
    onAddUserEffect,
    onDeleteUserEffect,
    generationMode,
    setGenerationMode,
    videoAspectRatio,
    setVideoAspectRatio,
    selectedImageModel,
    selectedVideoModel,
    imageModelOptions = [],
    videoModelOptions = [],
    onImageModelChange,
    onVideoModelChange,
    canvasElements = [],
    onMentionedElementIds,
    onEnhancePrompt,
    isEnhancingPrompt = false,
    onLockCharacterFromSelection,
    canLockCharacter = false,
    characterLocks = [],
    activeCharacterLockId = null,
    onSetActiveCharacterLock,
    layout = 'dock',
}) => {
    const editorRef = useRef<RichPromptEditorHandle>(null);
    const [enhanceMode, setEnhanceMode] = useState<PromptEnhanceMode>('smart');
    const [stylePreset, setStylePreset] = useState('cinematic');
    const [enhanceResult, setEnhanceResult] = useState<PromptEnhanceResult | null>(null);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);

    const canvasItems = useMemo<MentionItem[]>(
        () => canvasElements.filter(el => el.isVisible !== false).map(elementToMentionItem),
        [canvasElements]
    );

    const selectedMentionItems = useMemo<MentionItem[]>(
        () => selectedCanvasElements.filter(el => el.isVisible !== false).map(elementToMentionItem),
        [selectedCanvasElements]
    );

    const inferredLineCount = useMemo(() => {
        const lines = prompt.split(/\r?\n/);
        const wrappedLines = lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 42)), 0);
        return Math.min(12, Math.max(2, wrappedLines));
    }, [prompt]);

    const editorMinHeight = Math.max(56, Math.min(220, inferredLineCount * 24 + 14));

    const getPlaceholderText = () => {
        if (!isSelectionActive) {
            return generationMode === 'video'
                ? t('promptBar.placeholderDefaultVideo')
                : t('promptBar.placeholderDefault');
        }
        if (selectedElementCount === 1) return t('promptBar.placeholderSingle');
        return t('promptBar.placeholderMultiple', selectedElementCount);
    };

    const handleTextChange = useCallback(
        (plainText: string) => {
            setPrompt(plainText);
        },
        [setPrompt]
    );

    const syncMentionIds = useCallback(() => {
        const mentions = editorRef.current?.getMentions() ?? [];
        onMentionedElementIds?.(mentions.map(item => item.id));
    }, [onMentionedElementIds]);

    const handleGenerate = useCallback(() => {
        if (isLoading || !prompt.trim()) return;
        syncMentionIds();
        onGenerate();
    }, [isLoading, onGenerate, prompt, syncMentionIds]);

    const handleEnhancePrompt = useCallback(async () => {
        if (!prompt.trim() || !onEnhancePrompt || isEnhancingPrompt) return;
        setEnhanceError(null);
        try {
            const result = await onEnhancePrompt({
                prompt,
                mode: enhanceMode,
                stylePreset: enhanceMode === 'style' ? stylePreset : undefined,
            });
            setEnhanceResult(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Prompt enhancement failed.';
            setEnhanceError(message);
            setEnhanceResult(null);
        }
    }, [enhanceMode, isEnhancingPrompt, onEnhancePrompt, prompt, stylePreset]);

    const handleApplyEnhancedPrompt = useCallback(() => {
        if (!enhanceResult?.enhancedPrompt) return;
        setPrompt(enhanceResult.enhancedPrompt);
        setTimeout(() => editorRef.current?.focus(), 0);
    }, [enhanceResult, setPrompt]);

    const handleSaveEffect = useCallback(() => {
        const name = window.prompt(t('myEffects.saveEffectPrompt'), t('myEffects.defaultName'));
        if (name && prompt.trim()) {
            onAddUserEffect({
                id: `user_${Date.now()}`,
                name,
                value: prompt,
            });
        }
    }, [onAddUserEffect, prompt, t]);

    const handleQuickPrompt = useCallback(
        (value: string) => {
            setPrompt(value);
            setTimeout(() => editorRef.current?.focus(), 0);
        },
        [setPrompt]
    );

    const handleBindSelection = useCallback(() => {
        if (selectedMentionItems.length === 0) return;
        selectedMentionItems.forEach(item => editorRef.current?.insertMention(item));
        setTimeout(() => {
            syncMentionIds();
            editorRef.current?.focus();
        }, 0);
    }, [selectedMentionItems, syncMentionIds]);

    const bindingHint = selectedMentionItems.length > 0
        ? `当前已选中 ${selectedMentionItems.length} 个画布元素，可一键绑定到提示词`
        : canvasItems.length > 0
            ? '输入 @ 可直接引用画布中的图片、文字或形状'
            : '在画布中创建或选中元素后，就能把它们绑定到提示词里';

    const containerStyle: React.CSSProperties = {
        backgroundColor: 'var(--ui-bg-color)',
    };

    const selectionStrip = selectedMentionItems.length > 0 ? (
        <div className="mb-3 rounded-[18px] border border-blue-200/80 bg-blue-50/85 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Canvas Binding</div>
                    <div className="mt-1 text-sm text-neutral-700">{bindingHint}</div>
                </div>
                <button
                    onClick={handleBindSelection}
                    className="shrink-0 rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                    绑定选中对象
                </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {selectedMentionItems.map(item => (
                    <span
                        key={item.id}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/90 px-3 py-1 text-xs text-neutral-700"
                    >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                            {item.label.slice(0, 1)}
                        </span>
                        <span className="max-w-[120px] truncate">{item.label}</span>
                    </span>
                ))}
            </div>
        </div>
    ) : null;

    const footerControls = (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-200/70 pt-2.5">
            <div className="inline-flex items-center rounded-full bg-neutral-100 p-0.5">
                <button
                    onClick={() => setGenerationMode('image')}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        generationMode === 'image'
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                    {t('promptBar.imageMode')}
                </button>
                <button
                    onClick={() => setGenerationMode('video')}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        generationMode === 'video'
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                    {t('promptBar.videoMode')}
                </button>
            </div>

            {generationMode === 'video' && (
                <div className="inline-flex items-center rounded-full bg-neutral-100 p-0.5">
                    <button
                        onClick={() => setVideoAspectRatio('16:9')}
                        title={t('promptBar.aspectRatioHorizontal')}
                        className={`rounded-full px-2 py-1 text-xs transition-colors ${
                            videoAspectRatio === '16:9' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
                        }`}
                    >
                        16:9
                    </button>
                    <button
                        onClick={() => setVideoAspectRatio('9:16')}
                        title={t('promptBar.aspectRatioVertical')}
                        className={`rounded-full px-2 py-1 text-xs transition-colors ${
                            videoAspectRatio === '9:16' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'
                        }`}
                    >
                        9:16
                    </button>
                </div>
            )}

            {generationMode === 'image' && imageModelOptions.length > 0 && (
                <select
                    value={selectedImageModel}
                    onChange={(e) => onImageModelChange?.(e.target.value)}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700 outline-none"
                    title="Image model"
                >
                    {imageModelOptions.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
            )}

            {generationMode === 'video' && videoModelOptions.length > 0 && (
                <select
                    value={selectedVideoModel}
                    onChange={(e) => onVideoModelChange?.(e.target.value)}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700 outline-none"
                    title="Video model"
                >
                    {videoModelOptions.map(model => (
                        <option key={model} value={model}>{model}</option>
                    ))}
                </select>
            )}

            {onEnhancePrompt && (
                <>
                    <select
                        value={enhanceMode}
                        onChange={(e) => setEnhanceMode(e.target.value as PromptEnhanceMode)}
                        className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700 outline-none"
                        title="Enhance mode"
                    >
                        {Object.entries(ENHANCE_MODE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>

                    {enhanceMode === 'style' && (
                        <select
                            value={stylePreset}
                            onChange={(e) => setStylePreset(e.target.value)}
                            className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700 outline-none"
                            title="Style preset"
                        >
                            {STYLE_PRESETS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancingPrompt || !prompt.trim()}
                        className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-800 transition-colors hover:bg-neutral-200 disabled:opacity-40"
                    >
                        {isEnhancingPrompt ? '润色中...' : 'AI 润色'}
                    </button>
                </>
            )}

            {onLockCharacterFromSelection && (
                <>
                    <button
                        onClick={() => onLockCharacterFromSelection()}
                        disabled={!canLockCharacter}
                        className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-800 transition-colors hover:bg-neutral-200 disabled:opacity-40"
                    >
                        锁定角色
                    </button>
                    {characterLocks.length > 0 && (
                        <select
                            value={activeCharacterLockId ?? ''}
                            onChange={(e) => onSetActiveCharacterLock?.(e.target.value || null)}
                            className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700 outline-none"
                            title="角色一致性"
                        >
                            <option value="">不使用角色锁定</option>
                            {characterLocks.map(lock => (
                                <option key={lock.id} value={lock.id}>{lock.name}</option>
                            ))}
                        </select>
                    )}
                </>
            )}

            <QuickPrompts
                t={t}
                setPrompt={handleQuickPrompt}
                disabled={!isSelectionActive || isLoading}
                userEffects={userEffects}
                onDeleteUserEffect={onDeleteUserEffect}
            />

            {prompt.trim() && !isLoading && (
                <button
                    onClick={handleSaveEffect}
                    title={t('myEffects.saveEffectTooltip')}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-200"
                >
                    保存效果
                </button>
            )}
        </div>
    );

    if (layout === 'floating') {
        return (
            <div className="w-full">
                <div
                    style={containerStyle}
                    className="rounded-[28px] border border-neutral-300/80 bg-[#f5f5f6]/95 p-4 shadow-[0_20px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl"
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Prompt Studio</div>
                            <div className="mt-1 text-base font-semibold text-neutral-900">今天我们要创作什么</div>
                        </div>
                        <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">
                            {generationMode === 'video' ? 'Video' : 'Image'}
                        </div>
                    </div>

                    {selectionStrip}

                    <div
                        className="rounded-[22px] border border-neutral-200/90 bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.03)] transition-all focus-within:border-neutral-300 focus-within:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                        onClick={() => editorRef.current?.focus()}
                    >
                        <RichPromptEditor
                            ref={editorRef}
                            value={prompt}
                            canvasItems={canvasItems}
                            placeholder={getPlaceholderText()}
                            disabled={isLoading}
                            onTextChange={handleTextChange}
                            onSubmit={handleGenerate}
                            minHeightPx={120}
                            maxHeightPx={220}
                        />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-500">
                        <div className="min-w-0 truncate">{bindingHint}</div>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !prompt.trim()}
                            aria-label={t('promptBar.generate')}
                            title={t('promptBar.generate')}
                            className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                            style={{ backgroundColor: 'var(--button-bg-color)' }}
                        >
                            {isLoading ? '...' : generationMode === 'video' ? '生成视频' : '生成内容'}
                        </button>
                    </div>

                    {footerControls}
                </div>

                {(enhanceResult || enhanceError) && (
                    <div className="mt-3 rounded-[22px] border border-neutral-200 bg-white/96 p-4 shadow-sm backdrop-blur-md">
                        {enhanceError && <div className="mb-2 text-xs text-red-500">{enhanceError}</div>}
                        {enhanceResult && (
                            <>
                                <div className="mb-1 text-xs font-medium text-neutral-500">AI 润色结果</div>
                                <div className="mb-2 text-sm leading-relaxed text-neutral-900">{enhanceResult.enhancedPrompt}</div>
                                {enhanceResult.negativePrompt && (
                                    <div className="mb-2 text-xs text-neutral-600">
                                        <span className="font-medium">负面词：</span>
                                        {enhanceResult.negativePrompt}
                                    </div>
                                )}
                                {enhanceResult.suggestions.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1">
                                        {enhanceResult.suggestions.map((item, idx) => (
                                            <span key={`${item}-${idx}`} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={handleApplyEnhancedPrompt}
                                        className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs text-white transition-colors hover:brightness-110"
                                    >
                                        采用
                                    </button>
                                    <button
                                        onClick={() => navigator.clipboard?.writeText(enhanceResult.enhancedPrompt)}
                                        className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-800 transition-colors hover:bg-neutral-200"
                                    >
                                        复制
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div
                style={containerStyle}
                className="rounded-[28px] bg-white/86 p-3 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-4"
            >
                {selectionStrip}

                <div className="flex items-end gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                        <div
                            className="rounded-[20px] bg-neutral-50/90 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] transition-all focus-within:bg-white focus-within:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.16),0_10px_24px_rgba(15,23,42,0.10)]"
                            onClick={() => editorRef.current?.focus()}
                        >
                            <RichPromptEditor
                                ref={editorRef}
                                value={prompt}
                                canvasItems={canvasItems}
                                placeholder={getPlaceholderText()}
                                disabled={isLoading}
                                onTextChange={handleTextChange}
                                onSubmit={handleGenerate}
                                minHeightPx={editorMinHeight}
                                maxHeightPx={300}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        aria-label={t('promptBar.generate')}
                        title={t('promptBar.generate')}
                        className="h-11 min-w-11 rounded-2xl px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ backgroundColor: 'var(--button-bg-color)' }}
                    >
                        {isLoading ? '...' : generationMode === 'video' ? 'Video' : 'Run'}
                    </button>
                </div>

                <div className="mt-2 text-xs text-neutral-500">{bindingHint}</div>
                {footerControls}
            </div>

            {(enhanceResult || enhanceError) && (
                <div className="mt-2 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur-md">
                    {enhanceError && <div className="mb-2 text-xs text-red-500">{enhanceError}</div>}
                    {enhanceResult && (
                        <>
                            <div className="mb-1 text-xs text-neutral-500">AI 润色结果</div>
                            <div className="mb-2 text-sm leading-relaxed text-neutral-900">{enhanceResult.enhancedPrompt}</div>
                            {enhanceResult.negativePrompt && (
                                <div className="mb-2 text-xs text-neutral-600">
                                    <span className="font-medium">负面词：</span>
                                    {enhanceResult.negativePrompt}
                                </div>
                            )}
                            {enhanceResult.suggestions.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1">
                                    {enhanceResult.suggestions.map((item, idx) => (
                                        <span key={`${item}-${idx}`} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleApplyEnhancedPrompt}
                                    className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs text-white transition-colors hover:brightness-110"
                                >
                                    采用
                                </button>
                                <button
                                    onClick={() => navigator.clipboard?.writeText(enhanceResult.enhancedPrompt)}
                                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-800 transition-colors hover:bg-neutral-200"
                                >
                                    复制
                                </button>
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancingPrompt || !prompt.trim()}
                                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-800 transition-colors hover:bg-neutral-200 disabled:opacity-40"
                                >
                                    再润色
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
