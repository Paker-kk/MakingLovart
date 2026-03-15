import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    CharacterLockProfile,
    ChatAttachment,
    Element,
    GenerationMode,
    PromptEnhanceMode,
    PromptEnhanceResult,
    UserEffect,
} from '../types';

interface PromptBarProps {
    t: (key: string, ...args: any[]) => string;
    theme: 'light' | 'dark';
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
    attachments?: ChatAttachment[];
    onAddAttachments?: (files: FileList | File[]) => void;
    onRemoveAttachment?: (id: string) => void;
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
type MentionOption = { id: string; label: string; element: Element };

const TYPE_LABELS: Record<Element['type'], string> = {
    image: '图片',
    video: '视频',
    shape: '形状',
    text: '文字',
    path: '画笔',
    group: '组合',
    arrow: '箭头',
    line: '线条',
};

const STYLE_OPTIONS = [
    { id: 'cinematic', label: '电影感' },
    { id: 'ink', label: '水墨' },
    { id: 'ghibli', label: '吉卜力' },
    { id: 'cyberpunk', label: '赛博朋克' },
    { id: 'pixar3d', label: '3D 动画' },
];

function getElementLabel(element: Element): string {
    return element.name?.trim() || `${TYPE_LABELS[element.type]} ${element.id.slice(-4)}`;
}

function getModeLabel(mode: GenerationMode): string {
    if (mode === 'video') return '视频';
    if (mode === 'keyframe') return '首尾帧';
    return '图片';
}

function getModelLabel(mode: GenerationMode, imageModel?: string, videoModel?: string): string {
    return mode === 'video' ? videoModel || '选择视频模型' : imageModel || '选择图片模型';
}

function renderPreview(element: Element) {
    if (element.type === 'image') {
        return <img src={element.href} alt={getElementLabel(element)} className="h-full w-full object-cover" />;
    }

    if (element.type === 'video') {
        return (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111827] to-[#374151] text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v13.72c0 .83.9 1.35 1.62.94l10.2-5.86a1.08 1.08 0 0 0 0-1.88l-10.2-5.86A1.08 1.08 0 0 0 8 5.14Z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E2E8F0] to-[#CBD5E1] text-[#475467]">
            <span className="text-[11px] font-semibold uppercase">{TYPE_LABELS[element.type].slice(0, 1)}</span>
        </div>
    );
}

const PopoverHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
    <div className="px-2 pb-2">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</div>}
    </div>
);

const MenuOptionButton: React.FC<{ label: string; active?: boolean; description?: string; onClick: () => void }> = ({ label, active = false, description, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition ${
            active ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]'
        }`}
    >
        <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{label}</span>
            {description && <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{description}</span>}
        </span>
        {active && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="m5 13 4 4L19 7" />
            </svg>
        )}
    </button>
);

export const PromptBar: React.FC<PromptBarProps> = ({
    t,
    theme,
    prompt,
    setPrompt,
    onGenerate,
    isLoading,
    isSelectionActive,
    selectedElementCount,
    userEffects,
    onAddUserEffect,
    onDeleteUserEffect,
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
    attachments = [],
    onAddAttachments,
    onRemoveAttachment,
    onMentionedElementIds,
    onEnhancePrompt,
    isEnhancingPrompt = false,
    onLockCharacterFromSelection,
    canLockCharacter = false,
    characterLocks = [],
    activeCharacterLockId = null,
    onSetActiveCharacterLock,
}) => {
    const isDark = theme === 'dark';
    const rootRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragDepthRef = useRef(0);

    const [expandedPanel, setExpandedPanel] = useState<ExpandPanel>(null);
    const [mentionState, setMentionState] = useState<MentionState>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
    const [enhanceMode, setEnhanceMode] = useState<PromptEnhanceMode>('smart');
    const [stylePreset, setStylePreset] = useState('cinematic');
    const [enhanceResult, setEnhanceResult] = useState<PromptEnhanceResult | null>(null);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    const triggerClass = `inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
        isDark ? 'border-[#2A3140] bg-[#1B2029] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E5E7EB] bg-[#F5F7FA] text-[#344054] hover:border-[#D0D5DD] hover:bg-white'
    }`;
    const activeTriggerClass = isDark ? 'border-[#4B5B78] bg-[#202734] text-white shadow-sm' : 'border-[#D0D5DD] bg-white text-[#111827] shadow-sm';
    const popoverCardClass = `absolute bottom-full left-0 z-[80] mb-3 min-w-[240px] rounded-[22px] border p-2 shadow-[0_26px_60px_rgba(15,23,42,0.16)] ${
        isDark ? 'border-[#2A3140] bg-[#161A22]' : 'border-[#E5E7EB] bg-white'
    }`;
    const shellClass = isDark ? 'border-[#2A3140] bg-[#12151B] shadow-[0_24px_60px_rgba(0,0,0,0.28)]' : 'border-[#E4E7EC] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]';
    const textareaClass = isDark ? 'min-h-[128px] w-full resize-none border-none bg-transparent px-0 py-0 text-[20px] leading-8 text-[#F8FAFC] outline-none placeholder:text-[#667085]' : 'min-h-[128px] w-full resize-none border-none bg-transparent px-0 py-0 text-[20px] leading-8 text-[#111827] outline-none placeholder:text-[#C2CAD7]';

    const mentionOptions = useMemo<MentionOption[]>(() => canvasElements.filter(element => element.isVisible !== false).map(element => ({
        id: element.id,
        label: getElementLabel(element),
        element,
    })), [canvasElements]);

    const mentionMap = useMemo(() => new Map(mentionOptions.map(item => [item.id, item])), [mentionOptions]);
    const selectedMentionItems = useMemo(
        () => selectedMentionIds.map(id => mentionMap.get(id)).filter((item): item is MentionOption => !!item),
        [mentionMap, selectedMentionIds]
    );
    const filteredMentions = useMemo(() => {
        if (!mentionState) return [];
        const query = mentionState.query.trim().toLowerCase();
        return mentionOptions
            .filter(item => (!query || item.label.toLowerCase().includes(query)) && !selectedMentionIds.includes(item.id))
            .slice(0, 8);
    }, [mentionOptions, mentionState, selectedMentionIds]);
    const currentModelOptions = generationMode === 'video' ? videoModelOptions : imageModelOptions;
    const placeholder = useMemo(() => {
        if (!isSelectionActive) return '今天我们要创作什么';
        if (selectedElementCount === 1) return '描述你想对当前元素做什么';
        return `已选中 ${selectedElementCount} 个元素，补充组合生成描述`;
    }, [isSelectionActive, selectedElementCount]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setExpandedPanel(null);
                setMentionState(null);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = '0px';
        textarea.style.height = `${Math.min(280, Math.max(128, textarea.scrollHeight))}px`;
    }, [prompt]);

    useEffect(() => setMentionIndex(0), [mentionState?.query]);
    useEffect(() => setSelectedMentionIds(prev => prev.filter(id => mentionMap.has(id))), [mentionMap]);
    useEffect(() => onMentionedElementIds?.(selectedMentionIds), [onMentionedElementIds, selectedMentionIds]);

    const syncMentionState = useCallback((value: string, cursor: number) => {
        const before = value.slice(0, cursor);
        const atIndex = before.lastIndexOf('@');

        if (atIndex < 0) {
            setMentionState(null);
            return;
        }

        const prevChar = atIndex === 0 ? ' ' : before[atIndex - 1];
        if (atIndex > 0 && !/\s/.test(prevChar)) {
            setMentionState(null);
            return;
        }

        const token = before.slice(atIndex + 1);
        if (/[\s\n]/.test(token)) {
            setMentionState(null);
            return;
        }

        setMentionState({ start: atIndex, end: cursor, query: token });
    }, []);

    const insertMention = useCallback((item: MentionOption) => {
        if (!mentionState || !textareaRef.current) return;
        const nextPrompt = `${prompt.slice(0, mentionState.start)}${prompt.slice(mentionState.end)}`;
        setPrompt(nextPrompt);
        setSelectedMentionIds(prev => (prev.includes(item.id) ? prev : [...prev, item.id]));
        setMentionState(null);

        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(mentionState.start, mentionState.start);
        });
    }, [mentionState, prompt, setPrompt]);

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
            setEnhanceError(error instanceof Error ? error.message : '提示词润色失败');
        }
    }, [enhanceMode, isEnhancingPrompt, onEnhancePrompt, prompt, stylePreset]);

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

    const handleDropFiles = useCallback((files: FileList | File[]) => {
        if (!onAddAttachments) return;
        const images = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (images.length > 0) {
            onAddAttachments(images);
        }
    }, [onAddAttachments]);

    return (
        <div ref={rootRef} className="theme-aware w-full">
            <div
                className={`relative overflow-visible rounded-[30px] border transition-all duration-200 ${shellClass} ${isDragActive ? (isDark ? 'scale-[1.01] border-[#4B5B78]' : 'scale-[1.01] border-[#B2CCFF]') : ''}`}
                onDragEnter={event => {
                    if (!Array.from(event.dataTransfer.items).some(item => item.type.startsWith('image/'))) return;
                    event.preventDefault();
                    dragDepthRef.current += 1;
                    setIsDragActive(true);
                }}
                onDragOver={event => {
                    if (!Array.from(event.dataTransfer.items).some(item => item.type.startsWith('image/'))) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                }}
                onDragLeave={event => {
                    if (!Array.from(event.dataTransfer.items).some(item => item.type.startsWith('image/'))) return;
                    event.preventDefault();
                    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                    if (dragDepthRef.current === 0) setIsDragActive(false);
                }}
                onDrop={event => {
                    event.preventDefault();
                    dragDepthRef.current = 0;
                    setIsDragActive(false);
                    if (event.dataTransfer.files?.length) handleDropFiles(event.dataTransfer.files);
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={event => {
                        if (event.target.files?.length) {
                            handleDropFiles(event.target.files);
                            event.target.value = '';
                        }
                    }}
                />

                {isDragActive && (
                    <div className={`pointer-events-none absolute inset-3 z-20 rounded-[26px] border border-dashed backdrop-blur-sm ${isDark ? 'border-[#4B5B78] bg-[#1B2029]/72' : 'border-[#84ADFF] bg-[#EEF4FF]/78'}`}>
                        <div className="flex h-full items-center justify-center">
                            <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-[#111827] shadow-lg">松手上传参考图</div>
                        </div>
                    </div>
                )}

                <div className="relative px-5 pt-5">
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={event => {
                            setPrompt(event.target.value);
                            syncMentionState(event.target.value, event.target.selectionStart);
                        }}
                        onBlur={() => window.setTimeout(() => setMentionState(null), 120)}
                        onKeyDown={event => {
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
                                if (prompt.trim() && !isLoading) onGenerate();
                            }
                        }}
                        placeholder={placeholder}
                        className={textareaClass}
                    />

                    {mentionState && filteredMentions.length > 0 && (
                        <div className={`${popoverCardClass} top-[calc(100%_-_8px)] bottom-auto w-[360px]`}>
                            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Whiteboard References</div>
                            <div className="space-y-1">
                                {filteredMentions.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onMouseDown={event => {
                                            event.preventDefault();
                                            insertMention(item);
                                        }}
                                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${index === mentionIndex ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]'}`}
                                    >
                                        <div className="h-11 w-11 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--panel-muted)]">{renderPreview(item.element)}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium">@{item.label}</div>
                                            <div className="mt-0.5 text-xs text-[var(--text-muted)]">{TYPE_LABELS[item.element.type]}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(attachments.length > 0 || selectedMentionItems.length > 0) && (
                        <div className="mt-4 space-y-3 pb-1">
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {attachments.map(attachment => (
                                        <div
                                            key={attachment.id}
                                            className={`group flex items-center gap-3 rounded-[20px] border px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 ${isDark ? 'border-[#2A3140] bg-[#171C24]' : 'border-[#E4E7EC] bg-[#F8FAFC]'}`}
                                        >
                                            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
                                                <img src={attachment.href} alt={attachment.name} className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`max-w-[150px] truncate text-sm font-medium ${isDark ? 'text-[#F8FAFC]' : 'text-[#111827]'}`}>{attachment.name}</div>
                                                <div className="text-xs text-[var(--text-muted)]">参考图</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveAttachment?.(attachment.id)}
                                                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${isDark ? 'text-[#98A2B3] hover:bg-[#202734] hover:text-white' : 'text-[#667085] hover:bg-white hover:text-[#111827]'}`}
                                                title="移除参考图"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 6 6 18" />
                                                    <path d="m6 6 12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedMentionItems.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedMentionItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={`group flex items-center gap-3 rounded-[22px] border px-2.5 py-2 transition-all duration-200 hover:-translate-y-0.5 ${isDark ? 'border-[#34507A] bg-[#16202E]' : 'border-[#B2CCFF] bg-[#EEF4FF]'}`}
                                        >
                                            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/40 bg-white/70">{renderPreview(item.element)}</div>
                                            <div className="min-w-0">
                                                <div className={`max-w-[170px] truncate text-sm font-semibold ${isDark ? 'text-[#E0EAFF]' : 'text-[#175CD3]'}`}>@{item.label}</div>
                                                <div className={`text-xs ${isDark ? 'text-[#9DB8E5]' : 'text-[#528BFF]'}`}>{TYPE_LABELS[item.element.type]} 引用</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedMentionIds(prev => prev.filter(id => id !== item.id))}
                                                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${isDark ? 'text-[#9DB8E5] hover:bg-[#202734] hover:text-white' : 'text-[#528BFF] hover:bg-white hover:text-[#175CD3]'}`}
                                                title="移除引用"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 6 6 18" />
                                                    <path d="m6 6 12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={`relative flex items-center justify-between gap-4 border-t px-4 py-4 ${isDark ? 'border-[#2A3140]' : 'border-[#EEF1F5]'}`}>
                    <div className="min-w-0 flex-1 overflow-visible">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <button type="button" onClick={() => setExpandedPanel(prev => (prev === 'mode' ? null : 'mode'))} className={`${triggerClass} ${expandedPanel === 'mode' ? activeTriggerClass : ''}`}>
                                    {getModeLabel(generationMode)}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {expandedPanel === 'mode' && <div className={popoverCardClass}><PopoverHeader title="生成类型" subtitle="选择图片、视频或首尾帧模式" /><div className="space-y-1">{(['image', 'video', 'keyframe'] as GenerationMode[]).map(mode => <MenuOptionButton key={mode} label={getModeLabel(mode)} active={generationMode === mode} onClick={() => { setGenerationMode(mode); setExpandedPanel(null); }} />)}</div></div>}
                            </div>

                            <div className="relative">
                                <button type="button" onClick={() => setExpandedPanel(prev => (prev === 'model' ? null : 'model'))} className={`${triggerClass} ${expandedPanel === 'model' ? activeTriggerClass : ''}`}>
                                    <span className="max-w-[150px] truncate">{getModelLabel(generationMode, selectedImageModel, selectedVideoModel)}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {expandedPanel === 'model' && (
                                    <div className={`${popoverCardClass} w-[290px]`}>
                                        <PopoverHeader title="模型设置" subtitle="向上弹出选择，不打断输入流程" />
                                        <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
                                            <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">{generationMode === 'video' ? '视频模型' : '图片模型'}</div>
                                            {currentModelOptions.map(model => (
                                                <MenuOptionButton
                                                    key={model}
                                                    label={model}
                                                    active={(generationMode === 'video' ? selectedVideoModel : selectedImageModel) === model}
                                                    onClick={() => {
                                                        generationMode === 'video' ? onVideoModelChange?.(model) : onImageModelChange?.(model);
                                                        setExpandedPanel(null);
                                                    }}
                                                />
                                            ))}

                                            {generationMode === 'video' && (
                                                <div className="grid grid-cols-2 gap-2 px-1 pt-3">
                                                    {(['16:9', '9:16'] as const).map(ratio => (
                                                        <button
                                                            key={ratio}
                                                            type="button"
                                                            onClick={() => setVideoAspectRatio(ratio)}
                                                            className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${videoAspectRatio === ratio ? 'border-[#B2CCFF] bg-[#EEF4FF] text-[#175CD3]' : isDark ? 'border-[#2A3140] bg-[#1B2029] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#344054] hover:bg-white'}`}
                                                        >
                                                            {ratio}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {textModelOptions.length > 0 && (
                                                <>
                                                    <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">LLM 润色模型</div>
                                                    {textModelOptions.map(model => <MenuOptionButton key={model} label={model} active={selectedTextModel === model} onClick={() => onTextModelChange?.(model)} />)}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button type="button" onClick={() => setExpandedPanel(prev => (prev === 'enhance' ? null : 'enhance'))} className={`${triggerClass} ${expandedPanel === 'enhance' ? activeTriggerClass : ''}`}>
                                    LLM 润色
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {expandedPanel === 'enhance' && (
                                    <div className={`${popoverCardClass} w-[300px]`}>
                                        <PopoverHeader title="Prompt 润色" subtitle="先选模式，再一键优化当前输入" />
                                        <div className="space-y-1">
                                            {[['smart', '智能润色'], ['style', '风格化'], ['precise', '精准优化'], ['translate', '多语言转换']].map(([mode, label]) => (
                                                <MenuOptionButton key={mode} label={label} active={enhanceMode === mode} onClick={() => setEnhanceMode(mode as PromptEnhanceMode)} />
                                            ))}
                                        </div>

                                        {enhanceMode === 'style' && (
                                            <div className="mt-3 grid grid-cols-2 gap-2 px-1">
                                                {STYLE_OPTIONS.map(option => (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => setStylePreset(option.id)}
                                                        className={`rounded-2xl border px-3 py-2 text-sm transition ${stylePreset === option.id ? 'border-[#B2CCFF] bg-[var(--accent-bg)] text-[var(--accent-text)]' : isDark ? 'border-[#2A3140] bg-[#1B2029] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#344054] hover:bg-white'}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-3 px-1">
                                            <button
                                                type="button"
                                                onClick={handleEnhance}
                                                disabled={isEnhancingPrompt || !prompt.trim()}
                                                className={`w-full rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed ${isDark ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white disabled:bg-[#3A4458] disabled:text-[#98A2B3]' : 'bg-[#111827] text-white hover:bg-[#0F172A] disabled:bg-[#D0D5DD]'}`}
                                            >
                                                {isEnhancingPrompt ? '润色中...' : '立即润色'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button type="button" onClick={() => setExpandedPanel(prev => (prev === 'more' ? null : 'more'))} className={`${triggerClass} ${expandedPanel === 'more' ? activeTriggerClass : ''}`}>
                                    更多
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {expandedPanel === 'more' && (
                                    <div className={`${popoverCardClass} left-auto right-0 w-[320px]`}>
                                        <PopoverHeader title="更多操作" subtitle="把次级能力收进来，底部按钮保持简洁" />
                                        <div className="space-y-1">
                                            <MenuOptionButton
                                                label="上传参考图"
                                                description="点击选择，或直接把图片拖到输入框"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    setExpandedPanel(null);
                                                }}
                                            />

                                            {onLockCharacterFromSelection && (
                                                <MenuOptionButton
                                                    label="从当前选择锁定角色"
                                                    description={canLockCharacter ? '把当前图片保存为后续生成参考' : '先选中一张图片元素'}
                                                    onClick={() => onLockCharacterFromSelection()}
                                                />
                                            )}

                                            {characterLocks.length > 0 && (
                                                <>
                                                    <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98A2B3]">角色锁定</div>
                                                    <MenuOptionButton label="不使用角色锁定" active={activeCharacterLockId == null} onClick={() => onSetActiveCharacterLock?.(null)} />
                                                    {characterLocks.map(lock => <MenuOptionButton key={lock.id} label={lock.name} active={activeCharacterLockId === lock.id} onClick={() => onSetActiveCharacterLock?.(lock.id)} />)}
                                                </>
                                            )}

                                            <MenuOptionButton label="保存当前提示词" description="存成一个可复用效果" onClick={handleSaveEffect} />

                                            {userEffects.length > 0 && (
                                                <div className="max-h-40 space-y-1 overflow-y-auto pt-2 pr-1">
                                                    {userEffects.map(effect => (
                                                        <div key={effect.id} className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${isDark ? 'bg-[#1B2029]' : 'bg-[#F9FAFB]'}`}>
                                                            <button
                                                                type="button"
                                                                className="min-w-0 flex-1 text-left"
                                                                onClick={() => {
                                                                    setPrompt(effect.value);
                                                                    setExpandedPanel(null);
                                                                }}
                                                            >
                                                                <div className="truncate text-sm font-medium text-[var(--text-primary)]">{effect.name}</div>
                                                                <div className="truncate text-xs text-[var(--text-muted)]">{effect.value}</div>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => onDeleteUserEffect(effect.id)}
                                                                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${isDark ? 'text-[#98A2B3] hover:bg-[#202734] hover:text-white' : 'text-[#667085] hover:bg-white hover:text-[#111827]'}`}
                                                                title="删除已保存提示词"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M18 6 6 18" />
                                                                    <path d="m6 6 12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {canvasElements.length > 0 && (
                                                <div className={`rounded-2xl px-3 py-3 text-sm ${isDark ? 'bg-[#1B2029] text-[#98A2B3]' : 'bg-[#F9FAFB] text-[#667085]'}`}>
                                                    在输入框里输入 <span className={`font-semibold ${isDark ? 'text-[#F3F4F6]' : 'text-[#344054]'}`}>@</span>，可直接引用白板里的元素卡片。
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (prompt.trim() && !isLoading) onGenerate();
                        }}
                        disabled={isLoading || !prompt.trim()}
                        aria-label={t('promptBar.generate')}
                        title={t('promptBar.generate')}
                        className={`flex h-12 min-w-[88px] items-center justify-center rounded-2xl px-4 transition disabled:cursor-not-allowed ${isDark ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white disabled:bg-[#3A4458] disabled:text-[#98A2B3]' : 'bg-[#111827] text-white hover:bg-[#0F172A] disabled:bg-[#D0D5DD]'}`}
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
                <div className={`mt-3 rounded-[24px] border p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${isDark ? 'border-[#2A3140] bg-[#12151B]' : 'border-[#E4E7EC] bg-white'}`}>
                    {enhanceError && <div className="text-sm text-rose-500">{enhanceError}</div>}

                    {enhanceResult && (
                        <>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">AI Prompt Assist</div>
                            <div className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{enhanceResult.enhancedPrompt}</div>

                            {enhanceResult.suggestions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {enhanceResult.suggestions.map((item, index) => (
                                        <span key={`${item}-${index}`} className="rounded-full border border-[var(--border-color)] bg-[var(--panel-muted)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPrompt(enhanceResult.enhancedPrompt);
                                        requestAnimationFrame(() => textareaRef.current?.focus());
                                    }}
                                    className={`rounded-full px-4 py-2 text-xs font-medium transition ${isDark ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white' : 'bg-[#111827] text-white hover:bg-[#0F172A]'}`}
                                >
                                    采用润色结果
                                </button>
                                <button type="button" onClick={() => navigator.clipboard?.writeText(enhanceResult.enhancedPrompt)} className={triggerClass}>
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
