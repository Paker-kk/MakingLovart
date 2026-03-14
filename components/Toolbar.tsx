import React, { useRef } from 'react';
import type { Tool } from '../types';

interface ToolbarProps {
    t: (key: string) => string;
    activeTool: Tool;
    setActiveTool: (tool: Tool) => void;
    drawingOptions: { strokeColor: string; strokeWidth: number };
    setDrawingOptions: (options: { strokeColor: string; strokeWidth: number }) => void;
    onUpload: (file: File) => void;
    isCropping: boolean;
    onConfirmCrop: () => void;
    onCancelCrop: () => void;
    onSettingsClick: () => void;
    onLayersClick: () => void;
    onBoardsClick: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    embedded?: boolean;
    isCompact?: boolean;
    compactBottomInset?: number;
}

type ToolDef = {
    id: Tool | 'upload' | 'undo' | 'redo' | 'layers' | 'boards' | 'settings';
    label: string;
    icon: JSX.Element;
    onClick?: () => void;
    disabled?: boolean;
};

const baseButtonClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-neutral-600 transition-all hover:border-neutral-200 hover:bg-white hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30';

const activeButtonClass = 'border-neutral-900 bg-neutral-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]';

function ToolButton({
    label,
    icon,
    active = false,
    disabled = false,
    onClick,
}: {
    label: string;
    icon: JSX.Element;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={`${baseButtonClass} ${active ? activeButtonClass : ''}`}
        >
            {icon}
        </button>
    );
}

const toolMap: Record<Tool, ToolDef> = {
    select: { id: 'select', label: '选择', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="M13 13l6 6" /></svg> },
    pan: { id: 'pan', label: '拖拽', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20" /><path d="M2 12h20" /><path d="m5 9-3 3 3 3" /><path d="m19 9 3 3-3 3" /><path d="m9 5 3-3 3 3" /><path d="m9 19 3 3 3-3" /></svg> },
    draw: { id: 'draw', label: '画笔', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg> },
    erase: { id: 'erase', label: '橡皮擦', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 2.5 0 3.4L13 21H7Z" /></svg> },
    rectangle: { id: 'rectangle', label: '矩形', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg> },
    circle: { id: 'circle', label: '圆形', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg> },
    triangle: { id: 'triangle', label: '三角形', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg> },
    text: { id: 'text', label: '文字', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3" /><path d="M12 4v16" /><path d="M9 20h6" /></svg> },
    arrow: { id: 'arrow', label: '箭头', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg> },
    highlighter: { id: 'highlighter', label: '高亮', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18.37 2.63 1.4 1.4a2 2 0 0 1 0 2.82L5.23 21.37a2.82 2.82 0 0 1-4-4L15.55 2.63a2 2 0 0 1 2.82 0Z" /></svg> },
    lasso: { id: 'lasso', label: '套索', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="8" ry="5" strokeDasharray="3 3" transform="rotate(-30 12 12)" /></svg> },
    line: { id: 'line', label: '线条', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5" /></svg> },
};

export const Toolbar: React.FC<ToolbarProps> = ({
    t,
    activeTool,
    setActiveTool,
    drawingOptions,
    setDrawingOptions,
    onUpload,
    isCropping,
    onConfirmCrop,
    onCancelCrop,
    onSettingsClick,
    onLayersClick,
    onBoardsClick,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    embedded = false,
    isCompact = false,
    compactBottomInset = 112,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUpload(file);
            event.target.value = '';
        }
    };

    if (isCropping) {
        return (
            <div className="absolute left-6 top-6 z-[45] rounded-[22px] border border-neutral-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                <div className="mb-2 text-sm font-medium text-neutral-700">{t('toolbar.crop.title')}</div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={onCancelCrop} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{t('toolbar.crop.cancel')}</button>
                    <button onClick={onConfirmCrop} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white">{t('toolbar.crop.confirm')}</button>
                </div>
            </div>
        );
    }

    const desktopTools: ToolDef[] = [
        toolMap.select,
        toolMap.pan,
        toolMap.draw,
        toolMap.rectangle,
        toolMap.circle,
        toolMap.text,
        toolMap.arrow,
        toolMap.lasso,
        { id: 'upload', label: '上传', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" /></svg>, onClick: handleUploadClick },
    ];

    const mobileTools: ToolDef[] = [
        toolMap.select,
        toolMap.pan,
        toolMap.text,
        toolMap.rectangle,
        toolMap.draw,
    ];

    const auxiliaryTools: ToolDef[] = [
        { id: 'layers', label: '图层', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></svg>, onClick: onLayersClick },
        { id: 'boards', label: '项目', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>, onClick: onBoardsClick },
        { id: 'settings', label: '设置', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>, onClick: onSettingsClick },
        { id: 'undo', label: '撤销', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>, onClick: onUndo, disabled: !canUndo },
        { id: 'redo', label: '重做', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" /></svg>, onClick: onRedo, disabled: !canRedo },
    ];

    const shellClass = embedded
        ? 'absolute bottom-6 left-1/2 z-[42] -translate-x-1/2'
        : `fixed left-1/2 z-[42] -translate-x-1/2 ${isCompact ? '' : ''}`;

    const shellStyle = embedded
        ? undefined
        : { bottom: `${compactBottomInset}px` };

    return (
        <div className={shellClass} style={shellStyle}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            <div className="flex items-center gap-2 rounded-[28px] border border-neutral-200/90 bg-white/96 px-3 py-2 shadow-[0_18px_42px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                {(isCompact ? mobileTools : desktopTools).map(tool => (
                    <ToolButton
                        key={tool.id}
                        label={tool.label}
                        icon={tool.icon}
                        active={tool.id === activeTool}
                        disabled={tool.disabled}
                        onClick={tool.onClick ?? (() => setActiveTool(tool.id as Tool))}
                    />
                ))}

                <div className="mx-1 h-8 w-px bg-neutral-200" />

                <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
                    <input
                        type="color"
                        aria-label={t('toolbar.strokeColor')}
                        title={t('toolbar.strokeColor')}
                        value={drawingOptions.strokeColor}
                        onChange={(event) => setDrawingOptions({ ...drawingOptions, strokeColor: event.target.value })}
                        className="h-7 w-7 cursor-pointer rounded-full border-none bg-transparent p-0"
                    />
                </label>

                <div className="inline-flex min-w-[54px] items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700">
                    {drawingOptions.strokeWidth}px
                </div>

                {!isCompact && (
                    <>
                        <div className="mx-1 h-8 w-px bg-neutral-200" />
                        {auxiliaryTools.map(tool => (
                            <ToolButton
                                key={tool.id}
                                label={tool.label}
                                icon={tool.icon}
                                disabled={tool.disabled}
                                onClick={tool.onClick}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};
