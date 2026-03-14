import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetCategory, AssetItem, AssetLibrary, ChatAttachment, GenerationHistoryItem } from '../types';

type RightPanelTab = 'generate' | 'inspiration';

interface RightPanelProps {
    isMinimized: boolean;
    onToggleMinimize: () => void;
    library: AssetLibrary;
    generationHistory: GenerationHistoryItem[];
    attachments: ChatAttachment[];
    onRemove: (category: AssetCategory, id: string) => void;
    onRename: (category: AssetCategory, id: string, name: string) => void;
    onGenerate: (prompt: string) => void;
    onAddAttachments: (files: FileList | File[]) => void;
    onRemoveAttachment: (id: string) => void;
    onWidthChange?: (width: number) => void;
}

const CATEGORY_LABELS: Record<AssetCategory, string> = {
    character: '角色',
    scene: '场景',
    prop: '道具',
};

const CategoryTabs: React.FC<{ value: AssetCategory; onChange: (c: AssetCategory) => void }> = ({ value, onChange }) => (
    <div className="inline-flex rounded-2xl bg-neutral-100 p-1">
        {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map(category => (
            <button
                key={category}
                type="button"
                onClick={() => onChange(category)}
                className={`rounded-2xl px-3 py-1.5 text-xs transition-all ${
                    value === category ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
            >
                {CATEGORY_LABELS[category]}
            </button>
        ))}
    </div>
);

const EmptyHistory: React.FC = () => (
    <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
        <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-neutral-300 shadow-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-neutral-700">还没有历史生成内容</p>
            <p className="mt-1 text-xs text-neutral-500">新的图片生成后会自动保存到本地，并显示在这里。</p>
        </div>
    </div>
);

export const RightPanel: React.FC<RightPanelProps> = ({
    isMinimized,
    onToggleMinimize,
    library,
    generationHistory,
    attachments,
    onRemove,
    onRename,
    onGenerate,
    onAddAttachments,
    onRemoveAttachment,
    onWidthChange,
}) => {
    const [activeTab, setActiveTab] = useState<RightPanelTab>('generate');
    const [category, setCategory] = useState<AssetCategory>('character');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = localStorage.getItem('rightPanelWidth');
        return saved ? parseInt(saved, 10) : 380;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(380);

    const editInputRef = useRef<HTMLInputElement>(null);
    const promptInputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const items = useMemo(() => library[category], [category, library]);

    useEffect(() => {
        localStorage.setItem('rightPanelWidth', panelWidth.toString());
    }, [panelWidth]);

    useEffect(() => {
        onWidthChange?.(isMinimized ? 2 : panelWidth);
    }, [isMinimized, onWidthChange, panelWidth]);

    useEffect(() => {
        if (!isResizing) return;

        const handlePointerMove = (event: PointerEvent) => {
            const dx = resizeStartX - event.clientX;
            const minWidth = 340;
            const maxWidth = Math.min(620, window.innerWidth - 160);
            setPanelWidth(Math.min(maxWidth, Math.max(minWidth, resizeStartWidth + dx)));
        };

        const handlePointerUp = () => setIsResizing(false);

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isResizing, resizeStartWidth, resizeStartX]);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    useEffect(() => {
        const textarea = promptInputRef.current;
        if (!textarea) return;
        textarea.style.height = '0px';
        textarea.style.height = `${Math.min(168, Math.max(88, textarea.scrollHeight))}px`;
    }, [prompt]);

    const handleResizePointerDown = (event: React.PointerEvent) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        setIsResizing(true);
        setResizeStartX(event.clientX);
        setResizeStartWidth(panelWidth);
        event.stopPropagation();
        event.preventDefault();
    };

    const handleGenerate = () => {
        const nextPrompt = prompt.trim();
        if (!nextPrompt) return;
        onGenerate(nextPrompt);
        setPrompt('');
    };

    const handleLibraryDragStart = (event: React.DragEvent, item: AssetItem) => {
        event.dataTransfer.setData('text/plain', JSON.stringify({ __makingAsset: true, item }));
        event.dataTransfer.effectAllowed = 'copy';
    };

    const handleHistoryDragStart = (event: React.DragEvent, item: GenerationHistoryItem) => {
        event.dataTransfer.setData(
            'text/plain',
            JSON.stringify({
                __makingAsset: true,
                item: {
                    id: item.id,
                    name: item.name || 'Generated',
                    category: 'scene',
                    dataUrl: item.dataUrl,
                    mimeType: item.mimeType,
                    width: item.width,
                    height: item.height,
                    createdAt: item.createdAt,
                },
            })
        );
        event.dataTransfer.effectAllowed = 'copy';
    };

    const handleDoubleClick = (item: AssetItem) => {
        setEditingId(item.id);
        setEditingName(item.name || '');
    };

    const handleSaveEdit = (itemId: string) => {
        if (editingId === itemId && editingName.trim()) {
            onRename(category, itemId, editingName.trim());
        }
        setEditingId(null);
        setEditingName('');
    };

    const formatTime = (timestamp: number) =>
        new Date(timestamp).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    return (
        <>
            <button
                type="button"
                onClick={onToggleMinimize}
                style={{
                    opacity: isMinimized ? 1 : 0,
                    pointerEvents: isMinimized ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease-out',
                }}
                className="fixed right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 shadow-lg hover:text-neutral-900"
                title="打开侧边栏"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M15 3v18" />
                </svg>
            </button>

            <div
                style={{
                    right: '16px',
                    width: `${panelWidth}px`,
                    transform: isMinimized ? 'scaleX(0.005)' : 'scaleX(1)',
                    transformOrigin: 'right center',
                    opacity: isMinimized ? 0 : 1,
                    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out',
                    pointerEvents: isMinimized ? 'none' : 'auto',
                }}
                className="fixed bottom-4 top-4 z-[30] flex flex-col overflow-hidden rounded-[28px] border border-neutral-200/60 bg-white/96 shadow-2xl backdrop-blur-xl"
            >
                <div
                    className="absolute left-0 top-0 z-10 h-full w-1 cursor-ew-resize transition-colors hover:bg-blue-400"
                    onPointerDown={handleResizePointerDown}
                />

                <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('generate')}
                            className={`rounded-xl px-3 py-1.5 text-sm transition-all ${
                                activeTab === 'generate' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                        >
                            生成
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('inspiration')}
                            className={`rounded-xl px-3 py-1.5 text-sm transition-all ${
                                activeTab === 'inspiration' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                        >
                            素材库
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleMinimize}
                        className="rounded-xl border border-neutral-200 p-2.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                        title="收起"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="3" />
                            <path d="M19 12H5" />
                        </svg>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    {activeTab === 'generate' && (
                        <div className="flex h-full min-h-0 flex-col gap-4 p-4">
                            <div className="rounded-[28px] border border-neutral-200 bg-neutral-50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                                <div className="flex items-start gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-[84px] w-[66px] shrink-0 flex-col items-center justify-center rounded-[20px] border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:text-neutral-800"
                                        title="导入参考图"
                                    >
                                        <span className="text-2xl leading-none">+</span>
                                        <span className="mt-2 text-[11px]">导图</span>
                                    </button>

                                    <textarea
                                        ref={promptInputRef}
                                        value={prompt}
                                        onChange={event => setPrompt(event.target.value)}
                                        placeholder="输入描述，右侧只保留轻量参考图导入。"
                                        className="min-h-[84px] flex-1 resize-none border-none bg-transparent px-1 py-1 text-[15px] leading-7 text-neutral-800 outline-none placeholder:text-neutral-400"
                                    />
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={event => {
                                        if (event.target.files?.length) {
                                            onAddAttachments(event.target.files);
                                            event.target.value = '';
                                        }
                                    }}
                                />

                                {attachments.length > 0 && (
                                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                        {attachments.map(attachment => (
                                            <div
                                                key={attachment.id}
                                                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
                                            >
                                                <img
                                                    src={attachment.href}
                                                    alt={attachment.name}
                                                    className="h-full w-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveAttachment(attachment.id)}
                                                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
                                                    title="移除参考图"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <div className="text-xs text-neutral-500">
                                        参考图会自动作为生成输入使用
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={!prompt.trim()}
                                        className="flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2 text-sm text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                                    >
                                        生成
                                    </button>
                                </div>
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-900">历史生成</h3>
                                        <p className="mt-1 text-xs text-neutral-500">自动保存到本地，可直接拖到白板。</p>
                                    </div>
                                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] text-neutral-500">
                                        {generationHistory.length} 条
                                    </span>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                    {generationHistory.length === 0 ? (
                                        <EmptyHistory />
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {generationHistory.map(item => (
                                                <div
                                                    key={item.id}
                                                    className="group cursor-grab rounded-[22px] border border-neutral-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                                                    draggable
                                                    onDragStart={event => handleHistoryDragStart(event, item)}
                                                >
                                                    <div className="overflow-hidden rounded-[16px] bg-neutral-100">
                                                        <img
                                                            src={item.dataUrl}
                                                            alt={item.name || item.prompt}
                                                            className="aspect-square w-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="px-1 pb-1 pt-2">
                                                        <p className="line-clamp-2 text-xs font-medium leading-5 text-neutral-800">
                                                            {item.name || item.prompt}
                                                        </p>
                                                        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
                                                            <span>{item.width}×{item.height}</span>
                                                            <span>{formatTime(item.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inspiration' && (
                        <div className="flex h-full min-h-0 flex-col">
                            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                                <CategoryTabs value={category} onChange={setCategory} />
                                <span className="text-xs text-neutral-500">{items.length} 项</span>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                                {items.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-neutral-400">
                                        <div className="text-center">
                                            <svg className="mx-auto mb-3 h-16 w-16 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <rect x="3" y="7" width="7" height="10" rx="1" />
                                                <rect x="14" y="4" width="7" height="16" rx="1" />
                                            </svg>
                                            <p className="text-sm">暂无{CATEGORY_LABELS[category]}</p>
                                            <p className="mt-1 text-xs">可把历史生成内容拖到白板，或稍后继续扩展素材库。</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="columns-2 gap-3">
                                        {items.map(item => (
                                            <div
                                                key={item.id}
                                                className="group relative mb-3 inline-block w-full break-inside-avoid overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 transition-all hover:shadow-md"
                                                draggable
                                                onDragStart={event => handleLibraryDragStart(event, item)}
                                            >
                                                <img src={item.dataUrl} alt={item.name || ''} className="w-full bg-neutral-50 object-contain" />

                                                {editingId === item.id ? (
                                                    <div className="absolute inset-x-2 bottom-2 flex items-center gap-2">
                                                        <input
                                                            ref={editInputRef}
                                                            type="text"
                                                            value={editingName}
                                                            onChange={event => setEditingName(event.target.value)}
                                                            onBlur={() => handleSaveEdit(item.id)}
                                                            onKeyDown={event => {
                                                                if (event.key === 'Enter') {
                                                                    event.preventDefault();
                                                                    handleSaveEdit(item.id);
                                                                } else if (event.key === 'Escape') {
                                                                    setEditingId(null);
                                                                    setEditingName('');
                                                                }
                                                            }}
                                                            className="min-w-0 flex-1 rounded-lg border border-blue-400 bg-white/95 px-2 py-1 text-xs outline-none shadow-lg"
                                                            placeholder="输入名称"
                                                            aria-label="素材名称"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                                        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 text-white">
                                                            <div className="pointer-events-auto min-w-0 cursor-text" onDoubleClick={() => handleDoubleClick(item)}>
                                                                <div className="truncate text-xs font-medium">{item.name || '未命名'}</div>
                                                                <div className="text-[10px] opacity-80">{item.width}×{item.height}</div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="pointer-events-auto rounded-lg bg-white/10 p-1 backdrop-blur transition-colors hover:bg-white/20"
                                                                title="删除"
                                                                onClick={event => {
                                                                    event.stopPropagation();
                                                                    onRemove(category, item.id);
                                                                }}
                                                            >
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                                    <path d="M10 11v6" />
                                                                    <path d="M14 11v6" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
