import React, { useRef, useState, useEffect } from 'react';
import type { AssetLibrary, AssetCategory, AssetItem } from '../types';

type RightPanelTab = 'generate' | 'inspiration';

interface RightPanelProps {
    isMinimized: boolean;
    onToggleMinimize: () => void;
    library: AssetLibrary;
    onRemove: (category: AssetCategory, id: string) => void;
    onRename: (category: AssetCategory, id: string, name: string) => void;
    onGenerate: (prompt: string) => void;
    onWidthChange?: (width: number) => void; // 报告当前实际宽度
}

const CategoryTabs: React.FC<{ value: AssetCategory; onChange: (c: AssetCategory) => void }> = ({ value, onChange }) => (
    <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 gap-0.5">
        {(['character', 'scene', 'prop'] as AssetCategory[]).map(cat => (
            <button
                key={cat}
                onClick={() => onChange(cat)}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                    value === cat 
                        ? 'bg-white text-neutral-900 shadow-sm' 
                        : 'text-neutral-600 hover:text-neutral-900'
                }`}
            >
                {cat === 'character' ? '角色' : cat === 'scene' ? '场景' : '道具'}
            </button>
        ))}
    </div>
);

export const RightPanel: React.FC<RightPanelProps> = ({
    isMinimized,
    onToggleMinimize,
    library,
    onRemove,
    onRename,
    onGenerate,
    onWidthChange
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<RightPanelTab>('generate');
    const [category, setCategory] = useState<AssetCategory>('character');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string>('');
    const [prompt, setPrompt] = useState<string>('');
    const editInputRef = useRef<HTMLInputElement>(null);
    const promptInputRef = useRef<HTMLTextAreaElement>(null);

    // Resize state - 保存实际宽度，不受 minimized 影响
    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = localStorage.getItem('rightPanelWidth');
        return saved ? parseInt(saved, 10) : 380;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(380);

    // 保存宽度到 localStorage
    useEffect(() => {
        localStorage.setItem('rightPanelWidth', panelWidth.toString());
    }, [panelWidth]);

    // 报告当前实际显示宽度（minimized 时为 2px，否则为 panelWidth）
    useEffect(() => {
        if (onWidthChange) {
            const actualWidth = isMinimized ? 2 : panelWidth;
            onWidthChange(actualWidth);
        }
    }, [isMinimized, panelWidth, onWidthChange]);

    useEffect(() => {
        if (!isResizing) return;

        const handlePointerMove = (e: PointerEvent) => {
            const dx = resizeStartX - e.clientX;
            const minW = 320;
            const maxW = Math.min(600, window.innerWidth - 160);
            const nextW = Math.min(maxW, Math.max(minW, resizeStartWidth + dx));
            setPanelWidth(nextW);
        };

        const handlePointerUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isResizing, resizeStartX, resizeStartWidth]);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    const handleResizePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        setIsResizing(true);
        setResizeStartX(e.clientX);
        setResizeStartWidth(panelWidth);
        e.stopPropagation();
        e.preventDefault();
    };

    const handleDragStart = (e: React.DragEvent, item: AssetItem) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ __makingAsset: true, item }));
        e.dataTransfer.effectAllowed = 'copy';
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

    const handleKeyDown = (e: React.KeyboardEvent, itemId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit(itemId);
        } else if (e.key === 'Escape') {
            setEditingId(null);
            setEditingName('');
        }
    };

    const handleGenerate = () => {
        if (prompt.trim()) {
            onGenerate(prompt.trim());
            setPrompt('');
        }
    };

    const items = library[category];

    // 始终渲染面板和按钮，通过 CSS 控制显示
    return (
        <>
            {/* 最小化按钮 - 只在收起时显示 */}
            <button
                onClick={onToggleMinimize}
                style={{
                    opacity: isMinimized ? 1 : 0,
                    pointerEvents: isMinimized ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease-out',
                }}
                className="fixed top-4 right-4 z-20 w-10 h-10 rounded-lg bg-white border border-neutral-200 shadow-lg hover:shadow-xl flex items-center justify-center text-neutral-600 hover:text-neutral-900"
                title="打开侧边栏"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M15 3v18" />
                </svg>
            </button>

            {/* 面板 - 始终存在，用 scaleX 实现传送门效果 */}
        <div
            ref={panelRef}
            style={{
                right: '16px',
                width: `${panelWidth}px`, // 宽度始终由 panelWidth 决定
                transform: isMinimized ? 'scaleX(0.005)' : 'scaleX(1)', // 从极小缩放到正常
                transformOrigin: 'right center', // 从右边展开
                opacity: isMinimized ? 0 : 1,
                transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out',
                pointerEvents: isMinimized ? 'none' : 'auto',
            }}
            className="fixed top-4 bottom-4 z-[30] bg-white/95 backdrop-blur-xl border border-neutral-200/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
            {/* Resize handle (left edge) */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-400 transition-colors z-10"
                onPointerDown={handleResizePointerDown}
            />

            {/* Header with tabs */}
            <div className="flex-shrink-0 border-b border-neutral-200">
                <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                                activeTab === 'generate'
                                    ? 'bg-neutral-900 text-white'
                                    : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                        >
                            生成
                        </button>
                        <button
                            onClick={() => setActiveTab('inspiration')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                                activeTab === 'inspiration'
                                    ? 'bg-neutral-900 text-white'
                                    : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                        >
                            灵感库
                        </button>
                    </div>
                    <button
                        onClick={onToggleMinimize}
                        className="shrink-0 p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-colors"
                        title="最小化"
                        aria-label="最小化"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <rect x="3" y="3" width="18" height="18" rx="3" />
                            <path d="M19 12H5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
                {/* Generate Tab */}
                {activeTab === 'generate' && (
                    <div className="h-full flex flex-col p-3 gap-3">
                        <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-neutral-700 mb-1">
                                描述你想要生成的图片
                            </label>
                            <textarea
                                ref={promptInputRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="例如：一只可爱的猫咪坐在窗台上..."
                                className="w-full h-24 px-2.5 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:border-neutral-400 outline-none resize-none transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim()}
                            className="w-full py-2.5 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                            生成图片
                        </button>
                        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
                            <div className="text-center">
                                <svg className="w-14 h-14 mx-auto mb-2 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M21 15l-5-5L5 21" />
                                </svg>
                                <p className="text-xs">输入描述后点击生成</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Inspiration Tab */}
                {activeTab === 'inspiration' && (
                    <div className="h-full flex flex-col">
                        <div className="flex-shrink-0 px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                            <CategoryTabs value={category} onChange={setCategory} />
                            <span className="text-xs text-neutral-500">{items.length} 项</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            {items.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                                    <div className="text-center">
                                        <svg className="w-16 h-16 mx-auto mb-3 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="3" y="7" width="7" height="10" rx="1" />
                                            <rect x="14" y="4" width="7" height="16" rx="1" />
                                        </svg>
                                        <p>暂无{category === 'character' ? '角色' : category === 'scene' ? '场景' : '道具'}</p>
                                        <p className="text-xs mt-1">选中图片后点击"加入灵感库"</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="columns-2 gap-3">
                                    {items.map(item => (
                                        <div
                                            key={item.id}
                                            className="group inline-block w-full mb-3 break-inside-avoid rounded-lg border border-neutral-200 overflow-hidden hover:shadow-md cursor-grab active:cursor-grabbing relative bg-neutral-50 transition-all"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item)}
                                        >
                                            <img src={item.dataUrl} alt={item.name || ''} className="w-full h-auto object-contain bg-neutral-50" />

                                            {/* Hover overlay */}
                                            {editingId === item.id ? (
                                                <div className="absolute inset-x-2 bottom-2 flex items-center gap-2">
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onBlur={() => handleSaveEdit(item.id)}
                                                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                                                        className="text-xs px-2 py-1 border border-blue-400 rounded-lg outline-none bg-white/95 backdrop-blur min-w-0 flex-1 shadow-lg"
                                                        placeholder="输入名称"
                                                        aria-label="素材名称"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                                    <div className="absolute bottom-2 left-2 right-2 text-white flex items-end justify-between gap-2">
                                                        <div className="min-w-0 pointer-events-auto cursor-text" onDoubleClick={() => handleDoubleClick(item)}>
                                                            <div className="text-xs font-medium truncate">{item.name || '未命名'}</div>
                                                            <div className="text-[10px] opacity-80">{item.width}×{item.height}</div>
                                                        </div>
                                                        <button
                                                            className="pointer-events-auto p-1 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur transition-colors"
                                                            title="删除"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
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

