import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Element } from '../types';

interface LayerPanelMinimizableProps {
    isMinimized: boolean;
    onToggleMinimize: () => void;
    elements: Element[];
    selectedElementIds: string[];
    onSelectElement: (id: string | null) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onRenameElement: (id: string, name: string) => void;
    onReorder: (draggedId: string, targetId: string, position: 'before' | 'after') => void;
    embedded?: boolean;
    isCompact?: boolean;
    compactBottomInset?: number;
}

const getElementLabel = (element: Element) => element.name || element.type;

const getElementIcon = (element: Element): React.ReactNode => {
    const iconProps = {
        width: 15,
        height: 15,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
    };

    switch (element.type) {
        case 'image':
            return <svg {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>;
        case 'video':
            return <svg {...iconProps}><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>;
        case 'text':
            return <svg {...iconProps}><path d="M4 7V4h16v3" /><path d="M12 4v16" /><path d="M9 20h6" /></svg>;
        case 'shape':
            return <svg {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
        case 'group':
            return <svg {...iconProps}><path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H3z" /></svg>;
        case 'arrow':
            return <svg {...iconProps}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
        case 'line':
            return <svg {...iconProps}><line x1="5" y1="19" x2="19" y2="5" /></svg>;
        default:
            return <svg {...iconProps}><path d="M12 3c2 2 4 4 4 6s-2 4-4 4-4-2-4-4 2-4 4-6Z" /></svg>;
    }
};

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex min-h-[136px] flex-col items-center justify-center rounded-[22px] bg-neutral-50 text-neutral-400">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M4 19h16a1 1 0 0 0 .8-1.6l-4-5.33a1 1 0 0 0-1.6 0L12 16 8.8 11.73a1 1 0 0 0-1.6 0L3.2 17.4A1 1 0 0 0 4 19Z" />
            <circle cx="16.5" cy="7.5" r="1.5" />
        </svg>
        <div className="mt-3 text-sm">{label}</div>
    </div>
);

const LayerItem: React.FC<{
    element: Element;
    level: number;
    isSelected: boolean;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onToggleLock: () => void;
    onRename: (name: string) => void;
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: () => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}> = ({
    element,
    level,
    isSelected,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onRename,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draftName, setDraftName] = useState(getElementLabel(element));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDraftName(getElementLabel(element));
    }, [element.name, element.type]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const finishRename = () => {
        setIsEditing(false);
        if (draftName.trim()) {
            onRename(draftName.trim());
        } else {
            setDraftName(getElementLabel(element));
        }
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={onSelect}
            onDoubleClick={() => setIsEditing(true)}
            className={`group flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors ${
                isSelected ? 'bg-blue-50 text-neutral-900 ring-1 ring-blue-200' : 'text-neutral-700 hover:bg-neutral-100'
            } ${element.isVisible === false ? 'opacity-50' : ''}`}
            style={{ paddingLeft: `${14 + level * 16}px` }}
        >
            <span className="shrink-0 text-neutral-400">{getElementIcon(element)}</span>
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={finishRename}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') finishRename();
                        if (event.key === 'Escape') {
                            setIsEditing(false);
                            setDraftName(getElementLabel(element));
                        }
                    }}
                    className="min-w-0 flex-1 border-b border-neutral-300 bg-transparent text-sm text-neutral-900 outline-none"
                />
            ) : (
                <span className="min-w-0 flex-1 truncate">{draftName}</span>
            )}
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleLock();
                    }}
                    className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-white hover:text-neutral-700"
                    title={element.isLocked ? '解锁' : '锁定'}
                >
                    {element.isLocked ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.5-2" /></svg>
                    )}
                </button>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleVisibility();
                    }}
                    className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-white hover:text-neutral-700"
                    title={element.isVisible === false ? '显示' : '隐藏'}
                >
                    {element.isVisible === false ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18" /><path d="M10.6 10.6A3 3 0 0 0 14 14" /><path d="M9.9 4.2A10 10 0 0 1 21 12s-1.6 3.2-4.8 5.5" /><path d="M6.7 6.7C3.9 8.4 3 12 3 12s4 8 11 8a10 10 0 0 0 3.6-.7" /></svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export const LayerPanelMinimizable: React.FC<LayerPanelMinimizableProps> = ({
    isMinimized,
    onToggleMinimize,
    elements,
    selectedElementIds,
    onSelectElement,
    onToggleVisibility,
    onToggleLock,
    onRenameElement,
    onReorder,
    embedded = false,
    isCompact = false,
    compactBottomInset = 8,
}) => {
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const elementMap = useMemo(() => new Map(elements.map(element => [element.id, element])), [elements]);
    const orderedElements = useMemo(() => [...elementMap.values()].reverse(), [elementMap]);

    const renderLayers = (list: Element[], level: number, parentId?: string): React.ReactNode =>
        list
            .filter(element => element.parentId === parentId)
            .map(element => (
                <React.Fragment key={element.id}>
                    <div className={dragOverId === element.id ? 'rounded-2xl bg-neutral-100' : ''}>
                        <LayerItem
                            element={element}
                            level={level}
                            isSelected={selectedElementIds.includes(element.id)}
                            onSelect={() => onSelectElement(element.id)}
                            onToggleVisibility={() => onToggleVisibility(element.id)}
                            onToggleLock={() => onToggleLock(element.id)}
                            onRename={(name) => onRenameElement(element.id, name)}
                            onDragStart={(event) => {
                                event.dataTransfer.setData('text/plain', element.id);
                                event.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragOverId(element.id);
                            }}
                            onDragLeave={() => setDragOverId(null)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragOverId(null);
                                const draggedId = event.dataTransfer.getData('text/plain');
                                if (!draggedId || draggedId === element.id) return;
                                const rect = event.currentTarget.getBoundingClientRect();
                                const position = event.clientY - rect.top > rect.height / 2 ? 'after' : 'before';
                                onReorder(draggedId, element.id, position);
                            }}
                        />
                    </div>
                    {renderLayers(list, level + 1, element.id)}
                </React.Fragment>
            ));

    const floatingStyle: React.CSSProperties = isCompact
        ? {
              left: '8px',
              right: '8px',
              top: 'auto',
              bottom: `${compactBottomInset}px`,
              height: 'min(60vh, 560px)',
              transform: isMinimized ? 'translateY(calc(100% + 16px))' : 'translateY(0)',
              opacity: isMinimized ? 0 : 1,
              pointerEvents: isMinimized ? 'none' : 'auto',
          }
        : {
              left: '0px',
              top: '0px',
              bottom: '0px',
              width: '336px',
              transform: isMinimized ? 'translateX(calc(-100% - 12px))' : 'translateX(0)',
              opacity: isMinimized ? 0 : 1,
              pointerEvents: isMinimized ? 'none' : 'auto',
          };

    return (
        <aside
            style={embedded ? undefined : floatingStyle}
            className={`flex h-full min-h-0 flex-col overflow-hidden bg-white ${
                embedded
                    ? 'border-r border-neutral-200'
                    : 'fixed z-[30] border-r border-neutral-200 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-300 ease-out'
            }`}
        >
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
                <div>
                    <h2 className="text-[18px] font-semibold text-neutral-900">图层</h2>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-neutral-400">Workflow</div>
                </div>
                <button
                    type="button"
                    onClick={onToggleMinimize}
                    className="rounded-full p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                    title="收起图层"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
            </div>

            <div className="border-t border-neutral-100 px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-[14px] font-semibold text-neutral-900">历史记录</div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
                <EmptyState label="暂无历史记录" />
            </div>

            <div className="border-t border-neutral-100 px-4 py-4">
                <div className="rounded-[20px] border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-orange-400 shadow-sm">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
                                </svg>
                            </span>
                            <div>
                                <div className="font-medium text-neutral-800">Image Generator 1</div>
                                <div className="mt-1 text-xs text-neutral-500">提示词与画布元素联动</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-neutral-400">
                            <button type="button" className="rounded-full p-1 transition-colors hover:bg-white hover:text-neutral-700" title="绑定">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 1 0-7.07-7.07L11 4" />
                                    <path d="M14 11a5 5 0 0 0-7.07 0l-3.54 3.54a5 5 0 0 0 7.07 7.07L13 20" />
                                </svg>
                            </button>
                            <button type="button" className="rounded-full p-1 transition-colors hover:bg-white hover:text-neutral-700" title="显示">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col border-t border-neutral-100 px-4 pb-4 pt-4">
                <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Canvas Elements
                </div>
                {orderedElements.length === 0 ? (
                    <div className="px-2 pt-10 text-center text-sm text-neutral-400">当前画布还没有元素</div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                        {renderLayers(orderedElements, 0)}
                    </div>
                )}
            </div>
        </aside>
    );
};
