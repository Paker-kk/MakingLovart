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
<<<<<<< Updated upstream
=======
import type { APIConfig, ModelItem } from '../src/types/api-config';
import { useWorkspaceStore } from '../src/store/workspace-store';
import { ConfigSelector } from './ConfigManager/ConfigSelector';
import RichPromptEditor, { type RichPromptEditorHandle } from './RichPromptEditor';
import type { MentionItem } from './MentionList';
import { extractMentions } from './CanvasMentionExtension';
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
    const canvasItems = useMemo<MentionItem[]>(
        () => canvasElements.filter(el => el.isVisible !== false).map(elementToMentionItem),
        [canvasElements]
=======
    const triggerClass = `inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
=======
    const [expandedPanel, setExpandedPanel] = useState<ExpandPanel>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const workspaceMode = useWorkspaceStore(state => state.workspaceMode);
    const promptScope = useWorkspaceStore(state => state.promptScope);
    const focusedNodeId = useWorkspaceStore(state => state.focusedNodeId);
    const nodePromptDraft = useWorkspaceStore(state => state.nodePromptDraft);

    const triggerClass = `inline-flex ${compactMode ? 'h-7 gap-1 px-2.5 text-[11px]' : 'h-8 gap-1.5 px-3 text-xs'} items-center rounded-full border font-medium transition ${
>>>>>>> Stashed changes
        isDark ? 'border-[#2A3140] bg-[#1B2029] text-[#D0D5DD] hover:bg-[#252C39]' : 'border-[#E5E7EB] bg-[#F5F7FA] text-[#344054] hover:border-[#D0D5DD] hover:bg-white'
    }`;
    const activeTriggerClass = isDark ? 'border-[#4B5B78] bg-[#202734] text-white shadow-sm' : 'border-[#D0D5DD] bg-white text-[#111827] shadow-sm';
    const popoverCardClass = `absolute bottom-full left-0 z-[80] mb-3 min-w-[240px] rounded-[22px] border p-2 shadow-[0_26px_60px_rgba(15,23,42,0.16)] ${
        isDark ? 'border-[#2A3140] bg-[#161A22]' : 'border-[#E5E7EB] bg-white'
    }`;
    const shellClass = isDark ? 'border-[#2A3140] bg-[#12151B] shadow-[0_24px_60px_rgba(0,0,0,0.28)]' : 'border-[#E4E7EC] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]';
    const textareaClass = isDark ? 'min-h-[48px] max-h-[160px] w-full resize-none border-none bg-transparent px-0 py-0 text-[15px] leading-6 text-[#F8FAFC] outline-none placeholder:text-[#667085]' : 'min-h-[48px] max-h-[160px] w-full resize-none border-none bg-transparent px-0 py-0 text-[15px] leading-6 text-[#111827] outline-none placeholder:text-[#C2CAD7]';

    const mentionOptions = useMemo<MentionOption[]>(() => canvasElements.filter(element => element.isVisible !== false).map(element => ({
        id: element.id,
        label: getElementLabel(element),
        element,
    })), [canvasElements]);

    const mentionMap = useMemo(() => new Map(mentionOptions.map(item => [item.id, item])), [mentionOptions]);
    const selectedMentionItems = useMemo(
        () => selectedMentionIds.map(id => mentionMap.get(id)).filter((item): item is MentionOption => !!item),
        [mentionMap, selectedMentionIds]
>>>>>>> Stashed changes
    );

<<<<<<< Updated upstream
    const selectedMentionItems = useMemo<MentionItem[]>(
        () => selectedCanvasElements.filter(el => el.isVisible !== false).map(elementToMentionItem),
        [selectedCanvasElements]
    );
=======
    const currentModelOptions = generationMode === 'video' ? videoModelOptions : imageModelOptions;
    const placeholder = useMemo(() => {
        if (promptScope === 'node' && focusedNodeId) {
            return `当前焦点节点 ${focusedNodeId}，可继续补充节点提示词或载入节点草稿`;
        }
        if (!isSelectionActive) return '使用 @ 引用画布中的图片，例如：把 @图片1 的人物替换为 @图片2 的兔子';
        if (selectedElementCount === 1) return '描述你想对当前元素做什么';
        return `已选中 ${selectedElementCount} 个元素，补充组合生成描述`;
    }, [focusedNodeId, isSelectionActive, promptScope, selectedElementCount]);

    const contextSummary = useMemo(() => {
        if (promptScope === 'node' && focusedNodeId) {
            return {
                label: '节点上下文',
                detail: focusedNodeId,
            };
        }

        if (workspaceMode === 'node') {
            return {
                label: '节点画布',
                detail: '未选中节点',
            };
        }

        return {
            label: '全局画布',
            detail: isSelectionActive ? `已选中 ${selectedElementCount} 个元素` : '白板提示词',
        };
    }, [focusedNodeId, isSelectionActive, promptScope, selectedElementCount, workspaceMode]);

    /** 编辑器文本 + mention 变化时同步到父组件 */
    const handleEditorChange = useCallback((plainText: string, json: Record<string, unknown>) => {
        setPrompt(plainText);
        const mentions = extractMentions(json);
        const uniqueIds = [...new Set(mentions.map(m => m.id))];
        onMentionedElementIds?.(uniqueIds);
    }, [setPrompt, onMentionedElementIds]);

    /** 编辑器 Enter 提交 */
    const handleEditorSubmit = useCallback(() => {
        if (prompt.trim() && !isLoading) onGenerate();
    }, [prompt, isLoading, onGenerate]);

    /** 外部 prompt 被清空时（如切换画板、生成完成后），同步清空富文本编辑器 */
    useEffect(() => {
        if (!prompt && richEditorRef.current) {
            const editorText = richEditorRef.current.getText();
            if (editorText) richEditorRef.current.clear();
        }
    }, [prompt]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setExpandedPanel(null);
            }
        };
>>>>>>> Stashed changes

<<<<<<< Updated upstream
    const inferredLineCount = useMemo(() => {
        const lines = prompt.split(/\r?\n/);
        const wrappedLines = lines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 42)), 0);
        return Math.min(12, Math.max(2, wrappedLines));
=======
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = '0px';
        textarea.style.height = `${Math.min(160, Math.max(48, textarea.scrollHeight))}px`;
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    const handleTextChange = useCallback(
        (plainText: string) => {
            setPrompt(plainText);
        },
        [setPrompt]
    );
=======
    const handleAdoptNodeDraft = useCallback(() => {
        if (!nodePromptDraft.trim()) return;
        setPrompt(nodePromptDraft);
        richEditorRef.current?.setText(nodePromptDraft);
    }, [nodePromptDraft, setPrompt]);

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
>>>>>>> Stashed changes

    const syncMentionIds = useCallback(() => {
        const mentions = editorRef.current?.getMentions() ?? [];
        onMentionedElementIds?.(mentions.map(item => item.id));
    }, [onMentionedElementIds]);

<<<<<<< Updated upstream
    const handleGenerate = useCallback(() => {
        if (isLoading || !prompt.trim()) return;
        syncMentionIds();
        onGenerate();
    }, [isLoading, onGenerate, prompt, syncMentionIds]);
=======
                <div className={`flex items-center justify-between border-b px-3.5 py-2 text-[11px] ${isDark ? 'border-[#202734] bg-[#0F131A] text-[#98A2B3]' : 'border-[#EEF1F5] bg-[#F8FAFC] text-[#667085]'}`}>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${promptScope === 'node' ? (isDark ? 'bg-[#1E3A5F] text-[#B2CCFF]' : 'bg-[#EEF4FF] text-[#175CD3]') : (isDark ? 'bg-[#1B2029] text-[#D0D5DD]' : 'bg-white text-[#344054]')}`}>
                            {contextSummary.label}
                        </span>
                        <span className="truncate">{contextSummary.detail}</span>
                    </div>
                    {promptScope === 'node' && nodePromptDraft.trim() && nodePromptDraft !== prompt && (
                        <button
                            type="button"
                            onClick={handleAdoptNodeDraft}
                            className={`rounded-full px-2.5 py-1 font-medium transition ${isDark ? 'bg-[#1B2330] text-[#B2CCFF] hover:bg-[#252C39]' : 'bg-[#EEF4FF] text-[#175CD3] hover:bg-[#DBEAFE]'}`}
                        >
                            载入节点草稿
                        </button>
                    )}
                </div>

                <div
                    className={`relative ${compactMode ? 'px-3 pt-2.5' : 'px-3.5 pt-3'}`}
                    style={{
                        '--prompt-editor-color': isDark ? '#F8FAFC' : '#111827',
                        '--prompt-editor-placeholder': isDark ? '#667085' : '#C2CAD7',
                        '--prompt-editor-caret': isDark ? '#818CF8' : '#4f46e5',
                        '--prompt-editor-scrollbar': isDark ? '#2A3140' : '#e5e7eb',
                        '--prompt-editor-min-height': compactMode ? '42px' : '48px',
                        '--prompt-editor-font-size': compactMode ? '13px' : '14px',
                        '--prompt-editor-line-height': compactMode ? '1.4' : '1.5',
                    } as React.CSSProperties}
                >
                    <RichPromptEditor
                        ref={richEditorRef}
                        canvasItems={canvasItems}
                        placeholder={placeholder}
                        onTextChange={handleEditorChange}
                        onSubmit={handleEditorSubmit}
                    />
>>>>>>> Stashed changes

<<<<<<< Updated upstream
    const handleEnhancePrompt = useCallback(async () => {
=======
    const insertMention = useCallback((item: MentionOption) => {
        if (!mentionState || !textareaRef.current) return;
        // Insert @label inline into the prompt text so user sees "@图片 abc1" in the text
        const tag = `@${item.label} `;
        const nextPrompt = `${prompt.slice(0, mentionState.start)}${tag}${prompt.slice(mentionState.end)}`;
        setPrompt(nextPrompt);
        setSelectedMentionIds(prev => (prev.includes(item.id) ? prev : [...prev, item.id]));
        setMentionState(null);

        const cursorPos = mentionState.start + tag.length;
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(cursorPos, cursorPos);
        });
    }, [mentionState, prompt, setPrompt]);

    const handleEnhance = useCallback(async () => {
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    const bindingHint = selectedMentionItems.length > 0
        ? `当前已选中 ${selectedMentionItems.length} 个画布元素，可一键绑定到提示词`
        : canvasItems.length > 0
            ? '输入 @ 可直接引用画布中的图片、文字或形状'
            : '在画布中创建或选中元素后，就能把它们绑定到提示词里';
=======
                <div className="relative px-4 pt-3">
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
>>>>>>> Stashed changes

    const containerStyle: React.CSSProperties = {
        backgroundColor: 'var(--ui-bg-color)',
    };

<<<<<<< Updated upstream
    const selectionStrip = selectedMentionItems.length > 0 ? (
        <div className="mb-3 rounded-[18px] border border-blue-200/80 bg-blue-50/85 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Canvas Binding</div>
                    <div className="mt-1 text-sm text-neutral-700">{bindingHint}</div>
=======
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
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 pb-1">
                            {attachments.map(attachment => (
                                <div
                                    key={attachment.id}
                                    className={`group inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-xs transition ${isDark ? 'border-[#2A3140] bg-[#171C24]' : 'border-[#E4E7EC] bg-[#F8FAFC]'}`}
                                >
                                    <div className="h-5 w-5 overflow-hidden rounded-full border border-[var(--border-color)] bg-white">
                                        <img src={attachment.href} alt={attachment.name} className="h-full w-full object-cover" />
                                    </div>
                                    <span className={`max-w-[80px] truncate font-medium ${isDark ? 'text-[#F8FAFC]' : 'text-[#111827]'}`}>{attachment.name}</span>
                                    <button
                                        type="button"
                                        title="Remove"
                                        onClick={() => onRemoveAttachment?.(attachment.id)}
                                        className={`flex h-4 w-4 items-center justify-center rounded-full transition ${isDark ? 'text-[#98A2B3] hover:text-white' : 'text-[#667085] hover:text-[#111827]'}`}
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {selectedMentionItems.map(item => (
                                <div
                                    key={item.id}
                                    className={`group inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-xs transition ${isDark ? 'border-[#34507A] bg-[#16202E]' : 'border-[#B2CCFF] bg-[#EEF4FF]'}`}
                                >
                                    <div className="h-5 w-5 overflow-hidden rounded-full border border-white/40 bg-white/70">{renderPreview(item.element)}</div>
                                    <span className={`max-w-[80px] truncate font-semibold ${isDark ? 'text-[#E0EAFF]' : 'text-[#175CD3]'}`}>@{item.label}</span>
                                    <button
                                        type="button"
                                        title="Remove reference"
                                        onClick={() => setSelectedMentionIds(prev => prev.filter(id => id !== item.id))}
                                        className={`flex h-4 w-4 items-center justify-center rounded-full transition ${isDark ? 'text-[#9DB8E5] hover:text-white' : 'text-[#528BFF] hover:text-[#175CD3]'}`}
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
                <div className={`relative flex items-center justify-between gap-3 border-t px-3 py-2.5 ${isDark ? 'border-[#2A3140]' : 'border-[#EEF1F5]'}`}>
                    <div className="min-w-0 flex-1 overflow-visible">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <button type="button" onClick={() => setExpandedPanel(prev => (prev === 'mode' ? null : 'mode'))} className={`${triggerClass} ${expandedPanel === 'mode' ? activeTriggerClass : ''}`}>
                                    {getModeLabel(generationMode)}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                                {expandedPanel === 'mode' && <div className={popoverCardClass}><PopoverHeader title="生成类型" subtitle="选择图片、视频或首尾帧模式" /><div className="space-y-1">{(['image', 'video', 'keyframe'] as GenerationMode[]).map(mode => <MenuOptionButton key={mode} label={getModeLabel(mode)} active={generationMode === mode} onClick={() => { setGenerationMode(mode); setExpandedPanel(null); }} />)}</div></div>}
                            </div>
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
                        className="h-11 min-w-11 rounded-2xl px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.22)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ backgroundColor: 'var(--button-bg-color)' }}
                    >
                        {isLoading ? '...' : generationMode === 'video' ? 'Video' : 'Run'}
=======
                        className={`flex h-9 min-w-[72px] items-center justify-center rounded-xl px-3 transition disabled:cursor-not-allowed ${isDark ? 'bg-[#F3F4F6] text-[#111827] hover:bg-white disabled:bg-[#3A4458] disabled:text-[#98A2B3]' : 'bg-[#111827] text-white hover:bg-[#0F172A] disabled:bg-[#D0D5DD]'}`}
                    >
                        {isLoading ? (
                            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                            </svg>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">{t('promptBar.generate')}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </div>
                        )}
>>>>>>> Stashed changes
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
