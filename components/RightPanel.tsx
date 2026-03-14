import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AssetCategory, AssetItem, AssetLibrary, Element, Tool } from '../types';

interface RightPanelProps {
    isMinimized: boolean;
    onToggleMinimize: () => void;
    library: AssetLibrary;
    onRemove: (category: AssetCategory, id: string) => void;
    onRename: (category: AssetCategory, id: string, name: string) => void;
    onGenerate: (prompt: string) => void;
    onWidthChange?: (width: number) => void;
    embedded?: boolean;
    isCompact?: boolean;
    compactBottomInset?: number;
    selectedElements?: Element[];
    activeTool?: Tool;
    zoom?: number;
    drawingOptions?: { strokeColor: string; strokeWidth: number };
    onElementUpdate?: (id: string, updates: Partial<Element>) => void;
    onAlignSelection?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
}

type RightPanelTab = 'chat' | 'inspect' | 'library';

const categoryOptions: Array<{ value: AssetCategory; label: string }> = [
    { value: 'character', label: '角色' },
    { value: 'scene', label: '场景' },
    { value: 'prop', label: '道具' },
];

const skillOptions = [
    '社媒轮播图',
    '社交媒体',
    'Logo 与品牌',
    '分镜故事板',
    '营销宣传册',
    '亚马逊产品图',
];

const inputShellClass =
    'w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 outline-none transition-colors focus:border-neutral-300';

function getElementLabel(element: Element): string {
    if (element.name?.trim()) return element.name;
    if (element.type === 'shape') {
        const labels = { rectangle: '矩形', circle: '圆形', triangle: '三角形' };
        return labels[element.shapeType];
    }

    const labels: Record<Element['type'], string> = {
        image: '图片',
        video: '视频',
        shape: '形状',
        text: '文本',
        path: '路径',
        group: '分组',
        arrow: '箭头',
        line: '线条',
    };
    return labels[element.type];
}

function hasSize(element: Element): element is Extract<Element, { width: number; height: number }> {
    return 'width' in element && 'height' in element;
}

function hasStroke(element: Element): element is Extract<Element, { strokeColor: string; strokeWidth: number }> {
    return 'strokeColor' in element && 'strokeWidth' in element;
}

const NumberField: React.FC<{
    label: string;
    value: number;
    disabled?: boolean;
    onCommit?: (value: number) => void;
}> = ({ label, value, disabled = false, onCommit }) => {
    const [draft, setDraft] = useState(String(Math.round(value)));

    useEffect(() => {
        setDraft(String(Math.round(value)));
    }, [value]);

    return (
        <label className="block">
            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">{label}</div>
            <input
                value={draft}
                disabled={disabled}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                    const next = Number(draft);
                    if (Number.isFinite(next)) onCommit?.(next);
                    else setDraft(String(Math.round(value)));
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        const next = Number(draft);
                        if (Number.isFinite(next)) onCommit?.(next);
                    }
                    if (event.key === 'Escape') {
                        setDraft(String(Math.round(value)));
                    }
                }}
                className={`${inputShellClass} ${disabled ? 'cursor-not-allowed bg-neutral-50 text-neutral-400' : ''}`}
            />
        </label>
    );
};

const AlignButtons: React.FC<{
    disabled: boolean;
    onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
}> = ({ disabled, onAlign }) => {
    const items: Array<{ id: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'; label: string }> = [
        { id: 'left', label: '左' },
        { id: 'center', label: '中' },
        { id: 'right', label: '右' },
        { id: 'top', label: '上' },
        { id: 'middle', label: '中线' },
        { id: 'bottom', label: '下' },
    ];

    return (
        <div className="grid grid-cols-6 gap-2">
            {items.map(item => (
                <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onAlign?.(item.id)}
                    className="rounded-xl border border-neutral-200 bg-white px-2 py-2 text-xs text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-35"
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
};

export const RightPanel: React.FC<RightPanelProps> = ({
    isMinimized,
    onToggleMinimize,
    library,
    onRemove,
    onRename,
    onGenerate,
    onWidthChange,
    embedded = false,
    isCompact = false,
    compactBottomInset = 8,
    selectedElements = [],
    activeTool = 'select',
    zoom = 1,
    drawingOptions = { strokeColor: '#111827', strokeWidth: 5 },
    onElementUpdate,
    onAlignSelection,
}) => {
    const [activeTab, setActiveTab] = useState<RightPanelTab>('chat');
    const [category, setCategory] = useState<AssetCategory>('character');
    const [quickPrompt, setQuickPrompt] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);
    const desktopPanelWidth = 360;

    const items = library[category];
    const assetCount = useMemo(
        () => library.character.length + library.scene.length + library.prop.length,
        [library]
    );
    const singleSelection = selectedElements.length === 1 ? selectedElements[0] : null;

    useEffect(() => {
        if (!onWidthChange) return;
        onWidthChange(embedded ? desktopPanelWidth : (isMinimized ? 0 : desktopPanelWidth));
    }, [desktopPanelWidth, embedded, isMinimized, onWidthChange]);

    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    useEffect(() => {
        if (selectedElements.length > 0 && activeTab === 'chat') {
            setActiveTab('inspect');
        }
    }, [activeTab, selectedElements.length]);

    const handleGenerate = () => {
        const nextPrompt = quickPrompt.trim();
        if (!nextPrompt) return;
        onGenerate(nextPrompt);
        setQuickPrompt('');
    };

    const handleDragStart = (event: React.DragEvent, item: AssetItem) => {
        event.dataTransfer.setData('text/plain', JSON.stringify({ __makingAsset: true, item }));
        event.dataTransfer.effectAllowed = 'copy';
    };

    const updateSingle = (updates: Partial<Element>) => {
        if (!singleSelection || !onElementUpdate) return;
        onElementUpdate(singleSelection.id, updates);
    };

    const saveEdit = (itemId: string) => {
        if (editingId !== itemId) return;
        const nextName = editingName.trim();
        if (nextName) onRename(category, itemId, nextName);
        setEditingId(null);
        setEditingName('');
    };

    const floatingStyle: React.CSSProperties = isCompact
        ? {
              left: '8px',
              right: '8px',
              top: 'auto',
              bottom: `${compactBottomInset}px`,
              height: 'min(76vh, 720px)',
              transform: isMinimized ? 'translateY(calc(100% + 14px))' : 'translateY(0)',
              opacity: isMinimized ? 0 : 1,
              pointerEvents: isMinimized ? 'none' : 'auto',
          }
        : {
              top: '0px',
              right: '0px',
              bottom: '0px',
              width: `${desktopPanelWidth}px`,
              transform: isMinimized ? 'translateX(calc(100% + 16px))' : 'translateX(0)',
              opacity: isMinimized ? 0 : 1,
              pointerEvents: isMinimized ? 'none' : 'auto',
          };

    const shellClass = embedded
        ? 'flex h-full min-h-0 flex-col border-l border-neutral-200 bg-white'
        : 'fixed z-[40] flex flex-col overflow-hidden border-l border-neutral-200 bg-white shadow-[-20px_0_40px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out';

    return (
        <>
            {!embedded && !isCompact && (
                <button
                    type="button"
                    onClick={onToggleMinimize}
                    className={`fixed top-4 z-[46] inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-all ${isMinimized ? 'right-4' : 'right-[18px]'}`}
                >
                    {isMinimized ? '打开对话栏' : '收起对话栏'}
                </button>
            )}

            <aside className={shellClass} style={embedded ? undefined : floatingStyle}>
                <div className="border-b border-neutral-100 px-5 pb-4 pt-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-[22px] font-semibold tracking-[-0.03em] text-neutral-900">
                                {activeTab === 'inspect' ? '检查器' : activeTab === 'library' ? '素材库' : '新对话'}
                            </div>
                            <div className="mt-1 text-sm text-neutral-500">
                                {activeTab === 'inspect'
                                    ? '位置、尺寸、布局与样式'
                                    : activeTab === 'library'
                                        ? '拖拽素材到画布'
                                        : '生成、绑定、继续创作'}
                            </div>
                        </div>
                        <div className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-600">
                            {Math.round(zoom * 100)}%
                        </div>
                    </div>

                    <div className="mt-4 inline-flex rounded-full bg-neutral-100 p-1">
                        {(['chat', 'inspect', 'library'] as RightPanelTab[]).map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${activeTab === tab ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                            >
                                {tab === 'chat' ? '对话' : tab === 'inspect' ? '检查器' : '素材库'}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'chat' && (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center">
                            <div className="text-[18px] font-semibold text-neutral-900">试试这些 Lovart Skills</div>
                            <div className="mt-8 grid w-full max-w-[320px] grid-cols-2 gap-3">
                                {skillOptions.map(item => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setQuickPrompt(item)}
                                        className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-neutral-100 px-4 pb-4 pt-3">
                            <div className="mb-3 rounded-[18px] border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-800">
                                升级会员，免费使用 Nano Banana 2 365 天
                            </div>
                            <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">
                                <textarea
                                    value={quickPrompt}
                                    onChange={(event) => setQuickPrompt(event.target.value)}
                                    placeholder='Start with an idea, or type "@" to mention'
                                    className="h-24 w-full resize-none bg-transparent text-[15px] text-neutral-800 outline-none placeholder:text-neutral-400"
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <button type="button" className="inline-flex h-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-4 text-[15px] font-medium text-blue-700">
                                        Agent
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={!quickPrompt.trim()}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
                                    >
                                        ↑
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inspect' && (
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
                        <div className="mb-5 rounded-[18px] border border-neutral-200 bg-neutral-50 px-4 py-3">
                            <div className="text-sm font-medium text-neutral-900">
                                {singleSelection
                                    ? getElementLabel(singleSelection)
                                    : selectedElements.length > 1
                                        ? `选中 ${selectedElements.length} 个对象`
                                        : 'sidebarPanel'}
                            </div>
                            <div className="mt-1 text-xs text-neutral-500">
                                {singleSelection ? '单对象编辑模式' : '选择画布对象后，在这里编辑布局和属性'}
                            </div>
                        </div>

                        <section className="border-t border-neutral-100 py-4">
                            <div className="mb-3 text-sm font-medium text-neutral-900">Context</div>
                            <div className="rounded-[16px] border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
                                当前工具：<span className="text-neutral-900">{activeTool}</span>
                                <span className="mx-2 text-neutral-300">•</span>
                                画笔：<span className="text-neutral-900">{drawingOptions.strokeWidth}px</span>
                            </div>
                        </section>

                        <section className="border-t border-neutral-100 py-4">
                            <div className="mb-3 text-sm font-medium text-neutral-900">Alignment</div>
                            <AlignButtons disabled={selectedElements.length < 2} onAlign={onAlignSelection} />
                        </section>

                        <section className="border-t border-neutral-100 py-4">
                            <div className="mb-3 text-sm font-medium text-neutral-900">Position</div>
                            {singleSelection ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <NumberField label="X" value={singleSelection.x} onCommit={(value) => updateSingle({ x: value })} />
                                    <NumberField label="Y" value={singleSelection.y} onCommit={(value) => updateSingle({ y: value })} />
                                    <NumberField label="W" value={hasSize(singleSelection) ? singleSelection.width : 0} disabled={!hasSize(singleSelection)} onCommit={(value) => updateSingle({ width: Math.max(1, value) } as Partial<Element>)} />
                                    <NumberField label="H" value={hasSize(singleSelection) ? singleSelection.height : 0} disabled={!hasSize(singleSelection)} onCommit={(value) => updateSingle({ height: Math.max(1, value) } as Partial<Element>)} />
                                </div>
                            ) : (
                                <div className="rounded-[16px] border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
                                    选择单个对象后可编辑位置和尺寸，多选时可使用上方对齐工具。
                                </div>
                            )}
                        </section>

                        <section className="border-t border-neutral-100 py-4">
                            <div className="mb-3 text-sm font-medium text-neutral-900">Appearance</div>
                            <div className="rounded-[16px] border border-neutral-200 bg-neutral-50 p-3">
                                {singleSelection?.type === 'shape' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="block">
                                            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">Fill</div>
                                            <input type="color" value={singleSelection.fillColor} onChange={(event) => updateSingle({ fillColor: event.target.value })} className="h-11 w-full cursor-pointer rounded-[12px] border border-neutral-200 bg-white p-1" />
                                        </label>
                                        <label className="block">
                                            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">Stroke</div>
                                            <input type="color" value={singleSelection.strokeColor} onChange={(event) => updateSingle({ strokeColor: event.target.value })} className="h-11 w-full cursor-pointer rounded-[12px] border border-neutral-200 bg-white p-1" />
                                        </label>
                                    </div>
                                )}

                                {singleSelection?.type === 'text' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="block">
                                            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">Text Color</div>
                                            <input type="color" value={singleSelection.fontColor} onChange={(event) => updateSingle({ fontColor: event.target.value })} className="h-11 w-full cursor-pointer rounded-[12px] border border-neutral-200 bg-white p-1" />
                                        </label>
                                        <NumberField label="Font Size" value={singleSelection.fontSize} onCommit={(value) => updateSingle({ fontSize: Math.max(8, value) })} />
                                    </div>
                                )}

                                {singleSelection && hasStroke(singleSelection) && singleSelection.type !== 'shape' && singleSelection.type !== 'text' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="block">
                                            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">Stroke</div>
                                            <input type="color" value={singleSelection.strokeColor} onChange={(event) => updateSingle({ strokeColor: event.target.value })} className="h-11 w-full cursor-pointer rounded-[12px] border border-neutral-200 bg-white p-1" />
                                        </label>
                                        <NumberField label="Weight" value={singleSelection.strokeWidth} onCommit={(value) => updateSingle({ strokeWidth: Math.max(1, value) })} />
                                    </div>
                                )}

                                {!singleSelection && (
                                    <div className="text-sm text-neutral-500">选择一个对象后，这里会显示可编辑的样式属性。</div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="border-b border-neutral-100 px-4 py-3">
                            <div className="inline-flex rounded-full bg-neutral-100 p-1">
                                {categoryOptions.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setCategory(option.value)}
                                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${category === option.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">已收集 {assetCount} 个素材，可直接拖入画布</div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {items.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-neutral-500">暂时还没有素材</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {items.map(item => (
                                        <div
                                            key={item.id}
                                            className="group relative overflow-hidden rounded-[18px] border border-neutral-200 bg-neutral-50 shadow-sm"
                                            draggable
                                            onDragStart={(event) => handleDragStart(event, item)}
                                        >
                                            <img src={item.dataUrl} alt={item.name || ''} className="aspect-square w-full object-cover" />
                                            {editingId === item.id ? (
                                                <div className="absolute inset-x-2 bottom-2">
                                                    <input
                                                        ref={editInputRef}
                                                        value={editingName}
                                                        onChange={(event) => setEditingName(event.target.value)}
                                                        onBlur={() => saveEdit(item.id)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') saveEdit(item.id);
                                                            if (event.key === 'Escape') {
                                                                setEditingId(null);
                                                                setEditingName('');
                                                            }
                                                        }}
                                                        className="w-full rounded-xl border border-blue-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2 text-white">
                                                        <button
                                                            type="button"
                                                            onDoubleClick={() => {
                                                                setEditingId(item.id);
                                                                setEditingName(item.name || '');
                                                            }}
                                                            className="min-w-0 text-left"
                                                        >
                                                            <div className="truncate text-sm font-medium">{item.name || '未命名素材'}</div>
                                                            <div className="text-[11px] text-white/70">{item.width} × {item.height}</div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemove(category, item.id)}
                                                            className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
                                                            title="删除素材"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M3 6h18" />
                                                                <path d="M8 6V4h8v2" />
                                                                <path d="m19 6-1 14H6L5 6" />
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
            </aside>
        </>
    );
};
