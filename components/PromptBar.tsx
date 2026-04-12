/**
 * ============================================
 * AI提示词输入栏组件 (Prompt Bar)
 * ============================================
 *
 * 在原有功能基础上升级：
 * - 使用 RichPromptEditor（Tiptap）替换普通 textarea
 * - 支持输入 @ 弹出画布元素选择菜单，选中后嵌入带缩略图徽章
 * - 生成时将 @ 引用元素作为额外参考图传给 AI
 */

import React, { useRef, useCallback, useMemo, useState } from 'react';
import { QuickPrompts } from './QuickPrompts';
import RichPromptEditor, { type RichPromptEditorHandle } from './RichPromptEditor';
import type { MentionItem } from './MentionList';
import type {
    UserEffect,
    GenerationMode,
    Element,
    PromptEnhanceMode,
    PromptEnhanceResult,
    CharacterLockProfile,
} from '../types';

// ---- Props 接口 -------------------------------------------------

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
    selectedImageModel?: string;
    selectedVideoModel?: string;
    imageModelOptions?: string[];
    videoModelOptions?: string[];
    onImageModelChange?: (model: string) => void;
    onVideoModelChange?: (model: string) => void;
    /** 当前画布上所有元素（用于 @ 引用菜单） */
    canvasElements?: Element[];
    /** 生成时回调：通知父组件本次携带了哪些 @引用元素的 id 列表 */
    onMentionedElementIds?: (ids: string[]) => void;
    onEnhancePrompt?: (payload: { prompt: string; mode: PromptEnhanceMode; stylePreset?: string }) => Promise<PromptEnhanceResult>;
    isEnhancingPrompt?: boolean;
    onLockCharacterFromSelection?: (name?: string) => void;
    canLockCharacter?: boolean;
    characterLocks?: CharacterLockProfile[];
    activeCharacterLockId?: string | null;
    onSetActiveCharacterLock?: (id: string | null) => void;
}

// ---- 工具：将画布元素转为 MentionItem ---------------------------

function getElementLabel(el: Element): string {
    if (el.name) return el.name;
    const typeNames: Record<string, string> = {
        image: '图片',
        video: '视频',
        shape: '形状',
        text: '文字',
        path: '笔迹',
        group: '组合',
        arrow: '箭头',
        line: '直线',
    };
    return `${typeNames[el.type] ?? el.type} ${el.id.slice(-4)}`;
}

function elementToMentionItem(el: Element): MentionItem {
    let thumbnail = '';
    if (el.type === 'image') thumbnail = el.href;
    return {
        id: el.id,
        label: getElementLabel(el),
        thumbnail,
        elementType: el.type,
    };
}

// ---- 主组件 ----------------------------------------------------

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
}) => {
    const editorRef = useRef<RichPromptEditorHandle>(null);
    const [enhanceMode, setEnhanceMode] = useState<PromptEnhanceMode>('smart');
    const [stylePreset, setStylePreset] = useState('cinematic');
    const [enhanceResult, setEnhanceResult] = useState<PromptEnhanceResult | null>(null);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);

    // 将画布元素列表转为 MentionItem（仅对图片以外的非隐藏元素也包含）
    const canvasItems = useMemo<MentionItem[]>(
        () =>
            canvasElements
                .filter(el => el.isVisible !== false)
                .map(elementToMentionItem),
        [canvasElements]
    );

    // ---- 占位符文本 -------------------------------------------

    const getPlaceholderText = () => {
        if (!isSelectionActive) {
            return generationMode === 'video'
                ? t('promptBar.placeholderDefaultVideo')
                : t('promptBar.placeholderDefault');
        }
        if (selectedElementCount === 1) return t('promptBar.placeholderSingle');
        return t('promptBar.placeholderMultiple', selectedElementCount);
    };

    // ---- 富文本内容变化 ----------------------------------------

    const handleTextChange = useCallback(
        (plainText: string) => {
            setPrompt(plainText);
        },
        [setPrompt]
    );

    // ---- 触发生成 -----------------------------------------------

    const handleGenerate = useCallback(() => {
        if (isLoading || !prompt.trim()) return;
        // 提取 @引用元素 id 列表通知父组件
        const mentions = editorRef.current?.getMentions() ?? [];
        onMentionedElementIds?.(mentions.map(m => m.id));
        onGenerate();
    }, [isLoading, prompt, onGenerate, onMentionedElementIds]);

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
    }, [prompt, onEnhancePrompt, isEnhancingPrompt, enhanceMode, stylePreset]);

    const handleApplyEnhancedPrompt = useCallback(() => {
        if (!enhanceResult?.enhancedPrompt) return;
        setPrompt(enhanceResult.enhancedPrompt);
        setTimeout(() => editorRef.current?.focus(), 10);
    }, [enhanceResult, setPrompt]);

    // ---- 保存效果 -----------------------------------------------

    const handleSaveEffect = () => {
        const name = window.prompt(
            t('myEffects.saveEffectPrompt'),
            t('myEffects.defaultName')
        );
        if (name && prompt.trim()) {
            onAddUserEffect({
                id: `user_${Date.now()}`,
                name,
                value: prompt,
            });
        }
    };

    // ---- 快捷提示词应用 -----------------------------------------

    const handleQuickPrompt = useCallback(
        (value: string) => {
            setPrompt(value);
            // 聚焦并将光标移到末尾
            setTimeout(() => editorRef.current?.focus(), 10);
        },
        [setPrompt]
    );

    // ---- 样式 ---------------------------------------------------

    const containerStyle: React.CSSProperties = {
        backgroundColor: 'var(--ui-bg-color)',
    };

    // ---- 渲染 ---------------------------------------------------

    return (
        <div className="w-full transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div
                style={containerStyle}
                className="flex items-center gap-2 p-2.5 border border-neutral-200/80 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white/95 backdrop-blur-md"
            >
                {/* 1. 模式切换器：图片 vs 视频 */}
                <div className="flex-shrink-0 flex items-center bg-neutral-100 rounded-full p-0.5">
                    <button
                        onClick={() => setGenerationMode('image')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                            generationMode === 'image'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                        {t('promptBar.imageMode')}
                    </button>
                    <button
                        onClick={() => setGenerationMode('video')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                            generationMode === 'video'
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                        {t('promptBar.videoMode')}
                    </button>
                </div>

                {/* 2. 宽高比选择器（仅视频模式） */}
                {generationMode === 'video' && (
                    <div className="flex-shrink-0 flex items-center bg-neutral-100 rounded-full p-0.5">
                        <button
                            onClick={() => setVideoAspectRatio('16:9')}
                            title={t('promptBar.aspectRatioHorizontal')}
                            className={`p-1 rounded-full transition-colors ${
                                videoAspectRatio === '16:9'
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setVideoAspectRatio('9:16')}
                            title={t('promptBar.aspectRatioVertical')}
                            className={`p-1 rounded-full transition-colors ${
                                videoAspectRatio === '9:16'
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="7" y="2" width="10" height="20" rx="2" ry="2" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* 2.5 模型快捷切换 */}
                {generationMode === 'image' && imageModelOptions.length > 0 && (
                    <select
                        value={selectedImageModel}
                        onChange={(e) => onImageModelChange?.(e.target.value)}
                        className="flex-shrink-0 text-xs bg-neutral-100 rounded-full px-2.5 py-1.5 text-neutral-700 border border-transparent focus:outline-none"
                        title="图片模型"
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
                        className="flex-shrink-0 text-xs bg-neutral-100 rounded-full px-2.5 py-1.5 text-neutral-700 border border-transparent focus:outline-none"
                        title="视频模型"
                    >
                        {videoModelOptions.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                )}

                {/* 2.6 Agent controls */}
                {onEnhancePrompt && (
                    <>
                        <select
                            value={enhanceMode}
                            onChange={(e) => setEnhanceMode(e.target.value as PromptEnhanceMode)}
                            className="flex-shrink-0 text-xs bg-neutral-100 rounded-full px-2.5 py-1.5 text-neutral-700 border border-transparent focus:outline-none"
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
                                onChange={(e) => setStylePreset(e.target.value)}
                                className="flex-shrink-0 text-xs bg-neutral-100 rounded-full px-2.5 py-1.5 text-neutral-700 border border-transparent focus:outline-none"
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
                            onClick={handleEnhancePrompt}
                            disabled={isEnhancingPrompt || !prompt.trim()}
                            className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 disabled:opacity-40 transition-colors"
                            title="AI 提示词润色"
                        >
                            {isEnhancingPrompt ? '润色中...' : '✨ AI润色'}
                        </button>
                    </>
                )}

                {onLockCharacterFromSelection && (
                    <>
                        <button
                            onClick={() => onLockCharacterFromSelection()}
                            disabled={!canLockCharacter}
                            className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 disabled:opacity-40 transition-colors"
                            title="从当前选中图片锁定角色"
                        >
                            🔒 锁定角色
                        </button>
                        {characterLocks.length > 0 && (
                            <select
                                value={activeCharacterLockId ?? ''}
                                onChange={(e) => onSetActiveCharacterLock?.(e.target.value || null)}
                                className="flex-shrink-0 text-xs bg-neutral-100 rounded-full px-2.5 py-1.5 text-neutral-700 border border-transparent focus:outline-none"
                                title="角色一致性锁定"
                            >
                                <option value="">不使用角色锁定</option>
                                {characterLocks.map(lock => (
                                    <option key={lock.id} value={lock.id}>{lock.name}</option>
                                ))}
                            </select>
                        )}
                    </>
                )}

                {/* 3. 快捷提示词 */}
                <QuickPrompts
                    t={t}
                    setPrompt={handleQuickPrompt}
                    disabled={!isSelectionActive || isLoading}
                    userEffects={userEffects}
                    onDeleteUserEffect={onDeleteUserEffect}
                />

                {/* 4. 富文本编辑器（带 @ 元素引用） */}
                <div
                    className="flex-grow flex items-center min-w-0 cursor-text"
                    onClick={() => editorRef.current?.focus()}
                    style={{ minHeight: '28px' }}
                >
                    <RichPromptEditor
                        ref={editorRef}
                        canvasItems={canvasItems}
                        placeholder={getPlaceholderText()}
                        disabled={isLoading}
                        onTextChange={handleTextChange}
                        onSubmit={handleGenerate}
                    />
                </div>

                {/* 5. @ 提示标签（引导用户使用） */}
                {canvasItems.length > 0 && !prompt.trim() && (
                    <span
                        className="flex-shrink-0 text-xs text-indigo-400 font-medium select-none"
                        title={`输入 @ 可引用 ${canvasItems.length} 个画布元素`}
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        @
                    </span>
                )}

                {/* 6. 保存效果按钮 */}
                {prompt.trim() && !isLoading && (
                    <button
                        onClick={handleSaveEffect}
                        title={t('myEffects.saveEffectTooltip')}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-neutral-500 rounded-full hover:bg-neutral-100 transition-colors duration-200"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                        </svg>
                    </button>
                )}

                {/* 7. 生成按钮 */}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    aria-label={t('promptBar.generate')}
                    title={t('promptBar.generate')}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all duration-200"
                    style={{ backgroundColor: 'var(--button-bg-color)' }}
                >
                    {isLoading ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : generationMode === 'image' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
                        </svg>
                    )}
                </button>
            </div>

            {(enhanceResult || enhanceError) && (
                <div className="mt-2 p-3 rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur-md shadow-sm">
                    {enhanceError && (
                        <div className="text-xs text-red-500 mb-2">{enhanceError}</div>
                    )}
                    {enhanceResult && (
                        <>
                            <div className="text-xs text-neutral-500 mb-1">AI 润色结果</div>
                            <div className="text-sm text-neutral-900 leading-relaxed mb-2">{enhanceResult.enhancedPrompt}</div>
                            {enhanceResult.negativePrompt && (
                                <div className="text-xs text-neutral-600 mb-2">
                                    <span className="font-medium">负面词：</span>
                                    {enhanceResult.negativePrompt}
                                </div>
                            )}
                            {enhanceResult.suggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {enhanceResult.suggestions.map((item, idx) => (
                                        <span key={`${item}-${idx}`} className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleApplyEnhancedPrompt}
                                    className="text-xs px-2.5 py-1 rounded-full bg-neutral-900 text-white hover:brightness-110 transition-colors"
                                >
                                    ✅ 采用
                                </button>
                                <button
                                    onClick={() => navigator.clipboard?.writeText(enhanceResult.enhancedPrompt)}
                                    className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors"
                                >
                                    📋 复制
                                </button>
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancingPrompt || !prompt.trim()}
                                    className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 disabled:opacity-40 transition-colors"
                                >
                                    🔄 再润色
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
