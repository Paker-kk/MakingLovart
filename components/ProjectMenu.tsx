import React, { useEffect, useRef, useState } from 'react';

interface ProjectMenuProps {
    title: string;
    left?: number;
    top?: number;
    embedded?: boolean;
    canDelete?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
    onOpenBoards: () => void;
    onCreateProject: () => void;
    onDeleteCurrentProject: () => void;
    onImportImage: (file: File) => void;
    onUndo: () => void;
    onRedo: () => void;
    onFitView: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
}

type MenuAction = {
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
};

const menuButtonClass =
    'flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-[14px] text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent';

export const ProjectMenu: React.FC<ProjectMenuProps> = ({
    title,
    left = 16,
    top = 10,
    embedded = false,
    canDelete = true,
    canUndo = true,
    canRedo = true,
    onOpenBoards,
    onCreateProject,
    onDeleteCurrentProject,
    onImportImage,
    onUndo,
    onRedo,
    onFitView,
    onZoomIn,
    onZoomOut,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        window.addEventListener('mousedown', handlePointerDown);
        return () => window.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const actionGroups: MenuAction[][] = [
        [
            { label: '项目库', onClick: onOpenBoards },
            { label: '适配画布', shortcut: '1', onClick: onFitView },
        ],
        [
            { label: '新建项目', onClick: onCreateProject },
            { label: '删除当前项目', onClick: onDeleteCurrentProject, disabled: !canDelete },
        ],
        [
            { label: '导入图片', onClick: () => fileInputRef.current?.click() },
        ],
        [
            { label: '撤销', shortcut: 'Ctrl/Cmd+Z', onClick: onUndo, disabled: !canUndo },
            { label: '重做', shortcut: 'Shift+Ctrl/Cmd+Z', onClick: onRedo, disabled: !canRedo },
        ],
        [
            { label: '放大', shortcut: '+', onClick: onZoomIn },
            { label: '缩小', shortcut: '-', onClick: onZoomOut },
        ],
    ];

    return (
        <div
            ref={rootRef}
            className={embedded ? 'relative' : 'fixed z-[46]'}
            style={embedded ? undefined : { left, top }}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        onImportImage(file);
                    }
                    event.target.value = '';
                    setIsOpen(false);
                }}
            />

            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-3 py-2 text-neutral-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-neutral-50"
            >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="7" cy="12" r="3" />
                        <path d="M14 7h7" />
                        <path d="M14 12h7" />
                        <path d="M14 17h4" />
                    </svg>
                </span>
                <span className="max-w-[220px] truncate text-[16px] font-semibold">{title}</span>
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full z-20 mt-3 w-[280px] rounded-[24px] border border-neutral-200 bg-white p-3 shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
                    {actionGroups.map((group, groupIndex) => (
                        <div
                            key={`menu-group-${groupIndex}`}
                            className={groupIndex === 0 ? '' : 'mt-2 border-t border-neutral-100 pt-2'}
                        >
                            {group.map(item => (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        item.onClick();
                                        if (item.label !== '导入图片') {
                                            setIsOpen(false);
                                        }
                                    }}
                                    disabled={item.disabled}
                                    className={menuButtonClass}
                                >
                                    <span>{item.label}</span>
                                    {item.shortcut && (
                                        <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                                            {item.shortcut}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
