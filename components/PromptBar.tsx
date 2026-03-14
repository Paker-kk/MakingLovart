import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    userEffects: UserEffect[];
    onAddUserEffect: (effect: UserEffect) => void;
    onDeleteUserEffect: (id: string) => void;
    generationMode: GenerationMode;
    setGenerationMode: (mode: GenerationMode) => void;
    videoAspectRatio: '16:9' | '9:16';
    setVideoAspectRatio: (ratio: '16:9' | '9:16') => void;
    selectedTextModel?: string;
    selectedImageModel?: string;
    selectedVideoModel?: string;
    textModelOptions?: string[];
    imageModelOptions?: string[];
    videoModelOptions?: string[];
    onTextModelChange?: (model: string) => void;
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
}

type ExpandPanel = 'mode' | 'model' | 'enhance' | 'more' | null;
type MentionState = { start: number; end: number; query: string } | null;

interface MentionOption {
    id: string;
    label: string;
}

const triggerClass =
    'h-11 shrink-0 rounded-full border border-[#E6EAF0] bg-[#F4F6FA] px-4 text-sm font-medium text-[#3C4657] transition hover:bg-[#ECEFF5]';

const activeTriggerClass = 'border-[#D7DEE8] bg-white text-[#1F2937] shadow-sm';

function getElementLabel(element: Element): string {
    if (element.name?.trim()) return element.name.trim();

    const labels: Record<string, string> = {
        image: '图片',
        video: '视频',
        shape: '形状',
        text: '文字',
        path: '笔迹',
        group: '组合',
        arrow: '箭头',
        line: '直线',
    };

    return `${labels[element.type] ?? '元素'} ${element.id.slice(-4)}`;
}

function getModeLabel(mode: GenerationMode) {
    if (mode === 'video') return '视频';
    if (mode === 'keyframe') return '首尾帧';
    return '图片';
}

function getModelLabel(mode: GenerationMode, imageModel?: string, videoModel?: string) {
    if (mode === 'video') return videoModel || '选择视频模型';
    return imageModel || '选择图片模型';
}

export const PromptBar: React.FC<PromptBarProps> = ({
    t,
    prompt,
    setPrompt,
    onGenerate,
    isLoading,
    isSelectionActive,
    selectedElementCount,
    userEffects,
    onAddUserEffect,
    generationMode,
    setGenerationMode,
    videoAspectRatio,
    setVideoAspectRatio,
    selectedTextModel,
    selectedImageModel,
    selectedVideoModel,
    textModelOptions = [],
    imageModelOptions = [],
    videoModelOptions = [],
    onTextModelChange,
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
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [expandedPanel, setExpandedPanel] = useState<ExpandPanel>(null);
    const [mentionState, setMentionState] = useState<MentionState>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [mentionMap, setMentionMap] = useState<Record<string, string>>({});
    const [enhanceMode, setEnhanceMode] = useState<PromptEnhanceMode>('smart');
    const [stylePreset, setStylePreset] = useState('cinematic');
    const [enhanceResult, setEnhanceResult] = useState<PromptEnhanceResult | null>(null);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);

    const mentionOptions = useMemo<MentionOption[]>(
        () => canvasElements.filter(element => element.isVisible !== false).map(element => ({
            id: element.id,
            label: getElementLabel(element),
        })),
        [canvasElements]
    );

    const filteredMentions = useMemo(() => {
        if (!mentionState) return [];
        const query = mentionState.query.trim().toLowerCase();
        return mentionOptions
            .filter(item => !query || item.label.toLowerCase().includes(query))
            .slice(0, 8);
    }, [mentionOptions, mentionState]);

    useEffect(() => {
        setMentionIndex(0);
    }, [mentionState?.query]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = '0px';
        textarea.style.height = `${Math.min(260, Math.max(132, textarea.scrollHeight))}px`;
    }, [prompt]);

    const placeholder = useMemo(() => {
        if (!isSelectionActive) return '今天我们要创作什么';
        if (selectedElementCount === 1) return '描述你想对当前元素做什么';
        return `已选中 ${selectedElementCount} 个元素，补充组合生成描述`;
    }, [isSelectionActive, selectedElementCount]);

    const syncMentionState = useCallback((value: string, cursor: number) => {
        const textBeforeCursor = value.slice(0, cursor);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex < 0) {
            setMentionState(null);
            return;
        }

        const prevChar = atIndex === 0 ? ' ' : textBeforeCursor[atIndex - 1];
        if (atIndex > 0 && !/\s/.test(prevChar)) {
            setMentionState(null);
            return;
        }

        const token = textBeforeCursor.slice(atIndex + 1);
        if (/[\s\n]/.test(token)) {
            setMentionState(null);
            return;
        }

        setMentionState({ start: atIndex, end: cursor, query: token });
    }, []);

    const insertMention = useCallback((item: MentionOption) => {
        const textarea = textareaRef.current;
        if (!textarea || !mentionState) return;

        const token = `@[${item.label}] `;
        const nextPrompt = `${prompt.slice(0, mentionState.start)}${token}${prompt.slice(mentionState.end)}`;
        const nextCursor = mentionState.start + token.length;

        setPrompt(nextPrompt);
        setMentionMap(prev => ({ ...prev, [item.label]: item.id }));
        setMentionState(null);

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    }, [mentionState, prompt, setPrompt]);

    const handlePromptChange = useCallback((value: string, cursor: number) => {
        setPrompt(value);
        syncMentionState(value, cursor);
    }, [setPrompt, syncMentionState]);

    const handleGenerate = useCallback(() => {
        if (!prompt.trim() || isLoading) return;

        const ids = Array.from(prompt.matchAll(/@\[([^\]]+)\]/g))
            .map(match => mentionMap[match[1]])
            .filter((id): id is string => !!id);

        onMentionedElementIds?.(Array.from(new Set(ids)));
        onGenerate();
    }, [isLoading, mentionMap, onGenerate, onMentionedElementIds, prompt]);

    const handleEnhance = useCallback(async () => {
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
            setEnhanceResult(null);
            setEnhanceError(error instanceof Error ? error.message : '提示词润色失败。');
        }
    }, [enhanceMode, isEnhancingPrompt, onEnhancePrompt, prompt, stylePreset]);

    const handleApplyEnhancedPrompt = useCallback(() => {
        if (!enhanceResult?.enhancedPrompt) return;
        setPrompt(enhanceResult.enhancedPrompt);
        requestAnimationFrame(() => textareaRef.current?.focus());
    }, [enhanceResult, setPrompt]);

    const handleSaveEffect = useCallback(() => {
        if (!prompt.trim()) return;
        const name = window.prompt('给这个提示词起个名字', `我的效果 ${userEffects.length + 1}`);
        if (!name?.trim()) return;

        onAddUserEffect({
            id: `effect_${Date.now()}`,
            name: name.trim(),
            value: prompt.trim(),
        });
    }, [onAddUserEffect, prompt, userEffects.length]);

    return (
        <div className="w-full">
            <div className="overflow-hidden rounded-[26px] border border-[#E4E7EC] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                <div className="relative px-5 pt-5">
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(event) => handlePromptChange(event.target.value, event.target.selectionStart)}
                        onBlur={() => window.setTimeout(() => setMentionState(null), 120)}
                        onKeyDown={(event) => {
                            if (mentionState && filteredMentions.length > 0) {
                                if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    setMentionIndex(prev => (prev + 1) % filteredMentions.length);
                                    return;
                                }
                                if (event.key === 'ArrowUp') {
                                    event.preventDefault();
                                    setMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                                    return;
                                }
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    insertMention(filteredMentions[mentionIndex]);
                                    return;
                                }
                                if (event.key === 'Escape') {
                                    setMentionState(null);
                                    return;
                                }
                            }

                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                handleGenerate();
                            }
                        }}
                        placeholder={placeholder}
                        className="min-h-[132px] w-full resize-none border-none bg-transparent px-0 py-0 text-[18px] leading-8 text-[#1F2937] outline-none placeholder:text-[#B8C2D1]"
                    />

                    {mentionState && filteredMentions.length > 0 && (
                        <div className="absolute left-5 top-[calc(100%_-_8px)] z-20 w-[280px] rounded-2xl border border-[#E4E7EC] bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
                            <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#98A2B3]">
                                引用白板元素
                            </div>
                            <div className="space-y-1">
                                {filteredMentions.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            insertMention(item);
                                        }}
                                        className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                                            index === mentionIndex ? 'bg-[#EEF4FF] text-[#175CD3]' : 'text-[#344054] hover:bg-[#F4F6FA]'
                                        }`}
                                    >
                                        @{item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {expandedPanel && (
                    <div className="border-t border-[#EEF1F5] bg-[#FBFCFE] px-4 py-3">
                        {expandedPanel === 'mode' && (
                            <div className="flex flex-wrap items-center gap-2">
                                {(['image', 'video', 'keyframe'] as GenerationMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setGenerationMode(mode)}
                                        className={`${triggerClass} ${generationMode === mode ? activeTriggerClass : ''}`}
                                    >
                                        {getModeLabel(mode)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {expandedPanel === 'model' && (
                            <div className="flex flex-wrap items-center gap-2">
                                {(generationMode === 'video' ? videoModelOptions : imageModelOptions).length > 0 && (
                                    <select
                                        value={generationMode === 'video' ? selectedVideoModel : selectedImageModel}
                                        onChange={(event) =>
                                            generationMode === 'video'
                                                ? onVideoModelChange?.(event.target.value)
                                                : onImageModelChange?.(event.target.value)
                                        }
                                        className={triggerClass}
                                        title="生成模型"
                                    >
                                        {(generationMode === 'video' ? videoModelOptions : imageModelOptions).map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                )}

                                {generationMode === 'video' && (
                                    <button
                                        type="button"
                                        onClick={() => setVideoAspectRatio(videoAspectRatio === '16:9' ? '9:16' : '16:9')}
                                        className={triggerClass}
                                    >
                                        比例 {videoAspectRatio}
                                    </button>
                                )}

                                {selectedTextModel && (
                                    <select
                                        value={selectedTextModel}
                                        onChange={(event) => onTextModelChange?.(event.target.value)}
                                        className={triggerClass}
                                        title="LLM 润色模型"
                                    >
                                        {textModelOptions.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {expandedPanel === 'enhance' && (
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={enhanceMode}
                                    onChange={(event) => setEnhanceMode(event.target.value as PromptEnhanceMode)}
                                    className={triggerClass}
                                    title="润色模式"
                                >
                                    <option value="smart">智能润色</option>
                                    <option value="style">风格化</option>
                                    <option value="precise">精准优化</option>
                                    <option value="translate">多语言互转</option>
                                </select>

                                {enhanceMode === 'style' && (
                                    <select
                                        value={stylePreset}
                                        onChange={(event) => setStylePreset(event.target.value)}
                                        className={triggerClass}
                                        title="风格预设"
                                    >
                                        <option value="cinematic">电影感</option>
                                        <option value="ink">水墨</option>
                                        <option value="ghibli">吉卜力</option>
                                        <option value="cyberpunk">赛博朋克</option>
                                        <option value="pixar3d">3D 皮克斯</option>
                                    </select>
                                )}

                                <button
                                    type="button"
                                    onClick={handleEnhance}
                                    disabled={isEnhancingPrompt || !prompt.trim()}
                                    className={triggerClass}
                                >
                                    {isEnhancingPrompt ? '润色中...' : '立即润色'}
                                </button>
                            </div>
                        )}

                        {expandedPanel === 'more' && (
                            <div className="flex flex-wrap items-center gap-2">
                                {onLockCharacterFromSelection && (
                                    <button
                                        type="button"
                                        onClick={() => onLockCharacterFromSelection()}
                                        disabled={!canLockCharacter}
                                        className={triggerClass}
                                    >
                                        锁定角色
                                    </button>
                                )}

                                {characterLocks.length > 0 && (
                                    <select
                                        value={activeCharacterLockId ?? ''}
                                        onChange={(event) => onSetActiveCharacterLock?.(event.target.value || null)}
                                        className={triggerClass}
                                        title="角色锁定"
                                    >
                                        <option value="">不使用角色锁定</option>
                                        {characterLocks.map(lock => (
                                            <option key={lock.id} value={lock.id}>{lock.name}</option>
                                        ))}
                                    </select>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSaveEffect}
                                    disabled={!prompt.trim()}
                                    className={triggerClass}
                                >
                                    保存提示词
                                </button>

                                {canvasElements.length > 0 && (
                                    <span className={`${triggerClass} inline-flex items-center`}>
                                        输入 @ 可选择白板元素
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3 border-t border-[#EEF1F5] px-4 py-4">
                    <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex min-w-max items-center gap-2">
                            {([
                                ['mode', getModeLabel(generationMode)],
                                ['model', getModelLabel(generationMode, selectedImageModel, selectedVideoModel)],
                                ['enhance', 'LLM 润色'],
                                ['more', '更多'],
                            ] as Array<[Exclude<ExpandPanel, null>, string]>).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setExpandedPanel(prev => (prev === key ? null : key))}
                                    className={`${triggerClass} ${expandedPanel === key ? activeTriggerClass : ''}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        aria-label={t('promptBar.generate')}
                        title={t('promptBar.generate')}
                        className="flex h-12 min-w-[72px] items-center justify-center rounded-2xl bg-[#1F2937] px-4 text-white transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:bg-[#D0D5DD]"
                    >
                        {isLoading ? (
                            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                            </svg>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">生成</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {(enhanceResult || enhanceError) && (
                <div className="mt-3 rounded-[22px] border border-[#E4E7EC] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                    {enhanceError && <div className="text-sm text-rose-500">{enhanceError}</div>}

                    {enhanceResult && (
                        <>
                            <div className="text-xs uppercase tracking-[0.18em] text-[#98A2B3]">AI Prompt Assist</div>
                            <div className="mt-2 text-sm leading-7 text-[#344054]">{enhanceResult.enhancedPrompt}</div>

                            {enhanceResult.suggestions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {enhanceResult.suggestions.map((item, index) => (
                                        <span
                                            key={`${item}-${index}`}
                                            className="rounded-full border border-[#E6EAF0] bg-[#F4F6FA] px-3 py-1.5 text-xs text-[#667085]"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleApplyEnhancedPrompt}
                                    className="rounded-full bg-[#1F2937] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#111827]"
                                >
                                    采用润色结果
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard?.writeText(enhanceResult.enhancedPrompt)}
                                    className={triggerClass}
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
};
