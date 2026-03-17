import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    CharacterLockProfile,
    ChatAttachment,
    Element,
    GenerationMode,
    PromptEnhanceMode,
    PromptEnhanceResult,
    UserApiKey,
    UserEffect,
} from '../types';
import type { APIConfig, ModelItem } from '../src/types/api-config';
import { ConfigSelector } from './ConfigManager/ConfigSelector';

interface PromptBarProps {
    t: (key: string, ...args: any[]) => string;
    theme: 'light' | 'dark';
    compactMode?: boolean;
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
    isAutoEnhanceEnabled?: boolean;
    onAutoEnhanceToggle?: () => void;
    onLockCharacterFromSelection?: (name?: string) => void;
    canLockCharacter?: boolean;
    characterLocks?: CharacterLockProfile[];
    activeCharacterLockId?: string | null;
    onSetActiveCharacterLock?: (id: string | null) => void;
    // API 配置管理
    apiConfigs?: APIConfig[];
    activeApiConfigId?: string | null;
    activeApiModelId?: string | null;
    onApiConfigChange?: (id: string) => void;
    onApiModelChange?: (modelId: string) => void;
    // API Key 联动
    userApiKeys?: UserApiKey[];
    onOpenSettings?: () => void;
}

type ExpandPanel = 'mode' | 'model' | 'more' | null;
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
    <div className="px-2 pb-1.5">
        <div className="text-xs font-semibold text-[var(--text-primary)]">{title}</div>
        {subtitle && <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{subtitle}</div>}
    </div>
);

const MenuOptionButton: React.FC<{ label: string; active?: boolean; description?: string; onClick: () => void }> = ({ label, active = false, description, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition ${
            active ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]'
        }`}
    >
        <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{label}</span>
            {description && <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">{description}</span>}
        </span>
        {active && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="m5 13 4 4L19 7" />
            </svg>
        )}
    </button>
);

export const PromptBar: React.FC<PromptBarProps> = ({
    t,
    theme,
    compactMode = false,
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
    isAutoEnhanceEnabled = false,
    onAutoEnhanceToggle,
    onLockCharacterFromSelection,
    canLockCharacter = false,
    characterLocks = [],
    activeCharacterLockId = null,
    onSetActiveCharacterLock,
    apiConfigs = [],
    activeApiConfigId = null,
    activeApiModelId = null,
    onApiConfigChange,
    onApiModelChange,
    userApiKeys = [],
    onOpenSettings,
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
    const [isDragActive, setIsDragActive] = useState(false);

    const triggerClass = `inline-flex ${compactMode ? 'h-7 gap-1 px-2.5 text-[11px]' : 'h-8 gap-1.5 px-3 text-xs'} items-center rounded-full border font-medium transition ${
        isDark ? 'border-[#2A3140] bg-[#1B2029] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E5E7EB] bg-[#F5F7FA] text-[#344054] hover:border-[#D0D5DD] hover:bg-white'
    }`;
    const activeTriggerClass = isDark ? 'border-[#4B5B78] bg-[#202734] text-white shadow-sm' : 'border-[#D0D5DD] bg-white text-[#111827] shadow-sm';
    const popoverCardClass = `absolute bottom-full left-0 z-[80] mb-2 ${compactMode ? 'min-w-[200px] rounded-[14px]' : 'min-w-[220px] rounded-[16px]'} border p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.14)] ${
        isDark ? 'border-[#2A3140] bg-[#161A22]' : 'border-[#E5E7EB] bg-white'
    }`;
    const shellClass = `${compactMode ? 'rounded-[18px]' : 'rounded-[20px]'} ${isDark ? 'border-[#2A3140] bg-[#12151B] shadow-[0_20px_50px_rgba(0,0,0,0.24)]' : 'border-[#E4E7EC] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.10)]'}`;
    const textareaClass = isDark ? `${compactMode ? 'min-h-[42px] text-[13px] leading-5' : 'min-h-[48px] text-[14px] leading-6'} w-full resize-none border-none bg-transparent px-0 py-0 text-[#F8FAFC] outline-none placeholder:text-[#667085]` : `${compactMode ? 'min-h-[42px] text-[13px] leading-5' : 'min-h-[48px] text-[14px] leading-6'} w-full resize-none border-none bg-transparent px-0 py-0 text-[#111827] outline-none placeholder:text-[#C2CAD7]`;

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
        textarea.style.height = `${Math.min(160, Math.max(48, textarea.scrollHeight))}px`;
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
                className={`relative overflow-visible rounded-[20px] border transition-all duration-200 ${shellClass} ${isDragActive ? (isDark ? 'scale-[1.01] border-[#4B5B78]' : 'scale-[1.01] border-[#B2CCFF]') : ''}`}
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
                    title="上传参考图"
                    aria-label="上传参考图"
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

                <div className={`relative ${compactMode ? 'px-3 pt-2.5' : 'px-3.5 pt-3'}`}>
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
                        <div className={`${popoverCardClass} top-[calc(100%_-_8px)] bottom-auto w-[320px]`}>
                            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Whiteboard References</div>
                            <div className="space-y-0.5">
                                {filteredMentions.map((item, index) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onMouseDown={event => {
                                            event.preventDefault();
                                            insertMention(item);
                                        }}
                                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${index === mentionIndex ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--panel-muted)]'}`}
                                    >
                                        <div className="h-8 w-8 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--panel-muted)]">{renderPreview(item.element)}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-medium">@{item.label}</div>
                                            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{TYPE_LABELS[item.element.type]}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {(attachments.length > 0 || selectedMentionItems.length > 0) && (
                        <div className={`space-y-2 pb-1 ${compactMode ? 'mt-2' : 'mt-2.5'}`}>
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {attachments.map(attachment => (
                                        <div
                                            key={attachment.id}
                                            className={`group flex items-center gap-2 rounded-[14px] border px-2 py-1.5 transition-all duration-200 hover:-translate-y-0.5 ${isDark ? 'border-[#2A3140] bg-[#171C24]' : 'border-[#E4E7EC] bg-[#F8FAFC]'}`}
                                        >
                                            <div className="h-8 w-8 overflow-hidden rounded-lg border border-[var(--border-color)] bg-white">
                                                <img src={attachment.href} alt={attachment.name} className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`max-w-[120px] truncate text-xs font-medium ${isDark ? 'text-[#F8FAFC]' : 'text-[#111827]'}`}>{attachment.name}</div>
                                                <div className="text-[10px] text-[var(--text-muted)]">参考图</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveAttachment?.(attachment.id)}
                                                className={`flex h-6 w-6 items-center justify-center rounded-full transition ${isDark ? 'text-[#98A2B3] hover:bg-[#202734] hover:text-white' : 'text-[#667085] hover:bg-white hover:text-[#111827]'}`}
                                                title="移除参考图"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 6 6 18" />
                                                    <path d="m6 6 12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedMentionItems.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedMentionItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={`group flex items-center gap-2 rounded-[14px] border px-2 py-1.5 transition-all duration-200 hover:-translate-y-0.5 ${isDark ? 'border-[#34507A] bg-[#16202E]' : 'border-[#B2CCFF] bg-[#EEF4FF]'}`}
                                        >
                                            <div className="h-8 w-8 overflow-hidden rounded-lg border border-white/40 bg-white/70">{renderPreview(item.element)}</div>
                                            <div className="min-w-0">
                                                <div className={`max-w-[130px] truncate text-xs font-semibold ${isDark ? 'text-[#E0EAFF]' : 'text-[#175CD3]'}`}>@{item.label}</div>
                                                <div className={`text-[10px] ${isDark ? 'text-[#9DB8E5]' : 'text-[#528BFF]'}`}>{TYPE_LABELS[item.element.type]} 引用</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedMentionIds(prev => prev.filter(id => id !== item.id))}
                                                className={`flex h-6 w-6 items-center justify-center rounded-full transition ${isDark ? 'text-[#9DB8E5] hover:bg-[#202734] hover:text-white' : 'text-[#528BFF] hover:bg-white hover:text-[#175CD3]'}`}
                                                title="移除引用"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                <div className={`relative flex items-center justify-between gap-3 border-t ${compactMode ? 'px-2.5 py-2' : 'px-3 py-2.5'} ${isDark ? 'border-[#2A3140]' : 'border-[#EEF1F5]'}`}>
                    <div className="min-w-0 flex-1 overflow-visible">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* API Key 状态指示器 — 与设置面板联动 */}
                            {(() => {
                                const defaultKey = userApiKeys.find(k => k.isDefault);
                                const keyCount = userApiKeys.length;
                                if (keyCount === 0) {
                                    return (
                                        <button
                                            type="button"
                                            onClick={onOpenSettings}
                                            className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed px-3 text-[11px] font-medium transition ${
                                                isDark ? 'border-[#7A271A] text-[#FDA29B] hover:bg-[#3A1616]' : 'border-[#FECACA] text-[#DC2626] hover:bg-[#FEF3F2]'
                                            }`}
                                        >
                                            🔑 未配置 API Key
                                        </button>
                                    );
                                }
                                return (
                                    <button
                                        type="button"
                                        onClick={onOpenSettings}
                                        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                                            isDark ? 'border-[#2A3140] bg-[#1B2029] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E5E7EB] bg-[#F5F7FA] text-[#344054] hover:bg-white'
                                        }`}
                                        title={`已配置 ${keyCount} 个 Key，点击打开设置管理`}
                                    >
                                        <span className={`inline-block h-2 w-2 rounded-full ${defaultKey?.status === 'ok' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                                        <span className="max-w-[100px] truncate">{defaultKey?.name || defaultKey?.provider || 'API Key'}</span>
                                        {keyCount > 1 && <span className={`text-[10px] ${isDark ? 'text-[#667085]' : 'text-[#98A2B3]'}`}>+{keyCount - 1}</span>}
                                    </button>
                                );
                            })()}

                            {/* API 配置选择器（高级配置） */}
                            {apiConfigs.length > 0 && onApiConfigChange && onApiModelChange && (
                                <ConfigSelector
                                    configs={apiConfigs}
                                    activeConfigId={activeApiConfigId}
                                    activeModelId={activeApiModelId}
                                    onConfigChange={onApiConfigChange}
                                    onModelChange={onApiModelChange}
                                    isDark={isDark}
                                />
                            )}

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
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={onAutoEnhanceToggle}
                                title={isAutoEnhanceEnabled ? '关闭自动润色（生成前不再自动优化提示词）' : '开启自动润色（生成前自动用 LLM 优化提示词）'}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                                    isAutoEnhanceEnabled
                                        ? isDark
                                            ? 'border-[#528BFF] bg-[#1E3A5F] text-[#B2CCFF] shadow-sm'
                                            : 'border-[#84ADFF] bg-[#EEF4FF] text-[#175CD3] shadow-sm'
                                        : isDark
                                            ? 'border-[#2A3140] bg-[#1B2029] text-[#667085] hover:bg-[#252C39]'
                                            : 'border-[#E5E7EB] bg-[#F5F7FA] text-[#98A2B3] hover:border-[#D0D5DD] hover:bg-white'
                                }`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
                                </svg>
                                {isAutoEnhanceEnabled ? '润色 ON' : '润色'}
                            </button>

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
                        className={`flex h-9 min-w-[72px] items-center justify-center rounded-xl px-3 transition disabled:cursor-not-allowed ${isDark ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white disabled:bg-[#3A4458] disabled:text-[#98A2B3]' : 'bg-[#111827] text-white hover:bg-[#0F172A] disabled:bg-[#D0D5DD]'}`}
                    >
                        {isLoading ? (
                            <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                            </svg>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">生成</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
