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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
type ToolDef = {
    id: Tool | 'upload' | 'undo' | 'redo' | 'layers' | 'boards' | 'settings';
    label: string;
    icon: JSX.Element;
    onClick?: () => void;
    disabled?: boolean;
=======
const baseButtonClass =
    'flex h-8 w-8 items-center justify-center rounded-[14px] border border-transparent text-neutral-500 transition hover:bg-white hover:text-neutral-900';

const activeButtonClass = 'border-neutral-200 bg-white text-neutral-900 shadow-[0_8px_16px_rgba(15,23,42,0.10)]';

const panelPosition = {
    leftClosed: 16,
    leftOpen: 288,
>>>>>>> Stashed changes
};
=======
const iconSize = 18;

const groupTitleClass = 'm3-toolbar__section-title';
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
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
=======
    theme: 'light' | 'dark';
    tone?: 'accent' | 'neutral';
    hasMenu?: boolean;
}> = ({ label, icon, onClick, active = false, disabled = false, theme, tone = 'neutral', hasMenu = false }) => (
    <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
        className={`m3-tool-button ${active ? 'm3-tool-button--active' : ''} ${theme === 'dark' ? 'm3-tool-button--dark' : 'm3-tool-button--light'} ${tone === 'accent' ? 'm3-tool-button--accent' : ''}`}
    >
        <span className="m3-tool-button__icon">{icon}</span>
        {hasMenu && <span className="m3-tool-button__menu-dot" aria-hidden="true" />}
    </button>
);

const ToolGroupButton: React.FC<{
    label: string;
    activeTool: Tool;
    setActiveTool: (tool: Tool) => void;
    items: Array<{ id: Tool; label: string; icon: React.ReactNode }>;
    fallbackIcon: React.ReactNode;
    theme: 'light' | 'dark';
}> = ({ label, activeTool, setActiveTool, items, fallbackIcon, theme }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const activeItem = items.find(item => item.id === activeTool);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <ToolButton
                label={label}
                icon={activeItem?.icon ?? fallbackIcon}
                active={!!activeItem}
                onClick={() => setOpen(prev => !prev)}
                theme={theme}
                hasMenu
            />
            {open && (
                <div className={`m3-toolbar__flyout ${theme === 'dark' ? 'm3-toolbar__flyout--dark' : 'm3-toolbar__flyout--light'}`}>
                    {items.map(item => (
                        <ToolButton
                            key={item.id}
                            label={item.label}
                            icon={item.icon}
                            active={activeTool === item.id}
                            onClick={() => {
                                setActiveTool(item.id);
                                setOpen(false);
                            }}
                            theme={theme}
                        />
                    ))}
                </div>
            )}
        </div>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
    const leftPosition = isLayerPanelExpanded ? leftOpen : leftClosed;
    const isDark = theme === 'dark';
    const toolbarScale = Math.max(0.78, compactScale * 0.86);
    const toolbarHeight = 392 * toolbarScale;
>>>>>>> Stashed changes

<<<<<<< Updated upstream
    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUpload(file);
            event.target.value = '';
        }
    };
=======
    useEffect(() => {
        onLeftChange?.(leftPosition);
    }, [leftPosition, onLeftChange]);

    useEffect(() => {
<<<<<<< Updated upstream
        onHeightChange?.(380);
    }, [onHeightChange]);
=======
        onHeightChange?.(toolbarHeight);
    }, [onHeightChange, toolbarHeight]);
>>>>>>> Stashed changes

    const shapeTools = useMemo<Array<{ id: Tool; label: string; icon: React.ReactNode }>>(
        () => [
            {
                id: 'rectangle',
                label: t('toolbar.rectangle'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>,
            },
            {
                id: 'circle',
                label: t('toolbar.circle'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg>,
            },
            {
                id: 'triangle',
                label: t('toolbar.triangle'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 5 8 14H4L12 5Z" /></svg>,
            },
            {
                id: 'line',
                label: t('toolbar.line'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19 19 5" /></svg>,
            },
            {
                id: 'arrow',
                label: t('toolbar.arrow'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
            },
        ],
        [t]
    );

    const drawingTools = useMemo<Array<{ id: Tool; label: string; icon: React.ReactNode }>>(
        () => [
            {
                id: 'draw',
                label: t('toolbar.draw'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></svg>,
            },
            {
                id: 'highlighter',
                label: t('toolbar.highlighter'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 5 4 4" /><path d="M12 8 4 16l-1 5 5-1 8-8" /></svg>,
            },
            {
                id: 'lasso',
                label: t('toolbar.lasso'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="11" rx="7.5" ry="5" strokeDasharray="3 3" /><path d="M15 16c0 2-1 3-2.5 3S10 18 10 17.2" /></svg>,
            },
            {
                id: 'erase',
                label: t('toolbar.erase'),
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 21-4-4 10-10 4 4-10 10Z" /><path d="M14 7 9 2" /><path d="M17 21H7" /></svg>,
            },
        ],
        [t]
    );
>>>>>>> Stashed changes

    const isShapeActive = shapeTools.some(item => item.id === activeTool);
    const isDrawingActive = drawingTools.some(item => item.id === activeTool);

    if (isCropping) {
        return (
<<<<<<< Updated upstream
            <div className="absolute left-6 top-6 z-[45] rounded-[22px] border border-neutral-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                <div className="mb-2 text-sm font-medium text-neutral-700">{t('toolbar.crop.title')}</div>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={onCancelCrop} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">{t('toolbar.crop.cancel')}</button>
                    <button onClick={onConfirmCrop} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white">{t('toolbar.crop.confirm')}</button>
=======
            <div
                className={`m3-toolbar m3-toolbar--crop absolute top-3 z-[50] ${isDark ? 'm3-toolbar--dark' : 'm3-toolbar--light'}`}
                style={{ left: `${leftPosition}px`, top: `${topOffset}px`, transform: `scale(${toolbarScale})`, transformOrigin: 'top left', transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
                <div className="m3-toolbar__crop-title">{t('toolbar.crop.title')}</div>
                <div className="m3-toolbar__crop-actions">
                    <button
                        type="button"
                        onClick={onCancelCrop}
                        className={`m3-toolbar__crop-button ${isDark ? 'm3-toolbar__crop-button--dark' : 'm3-toolbar__crop-button--light'}`}
                    >
                        {t('toolbar.crop.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmCrop}
                        className={`m3-toolbar__crop-button m3-toolbar__crop-button--primary ${isDark ? 'm3-toolbar__crop-button--primary-dark' : 'm3-toolbar__crop-button--primary-light'}`}
                    >
                        {t('toolbar.crop.confirm')}
                    </button>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        <div className={shellClass} style={shellStyle}>
=======
        <div
<<<<<<< Updated upstream
            className={`absolute top-3 z-[40] flex flex-col items-center gap-1 rounded-[20px] border px-1 py-1.5 shadow-[0_20px_48px_rgba(15,23,42,0.24)] ${
                isDark ? 'border-[#2A3140] bg-[#12151B] text-white' : 'border-neutral-200 bg-white text-[#111827]'
            }`}
=======
            className={`m3-toolbar absolute z-[40] ${isDark ? 'm3-toolbar--dark' : 'm3-toolbar--light'}`}
>>>>>>> Stashed changes
            style={{
                left: `${leftPosition}px`,
<<<<<<< Updated upstream
                transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <ToolButton
                label="Boards & Layers"
                onClick={onLayersClick}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="5" width="7" height="14" rx="2" /><rect x="13" y="5" width="7" height="14" rx="2" /></svg>}
                active={isLayerPanelExpanded}
                theme={theme}
            />

            <div className={`h-px w-5 ${isDark ? 'bg-white/10' : 'bg-neutral-200'}`} />

            <ToolButton
                label={t('toolbar.select')}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 3 7 17 2.5-7.5L21 10 4 3Z" /><path d="m13 13 6 6" /></svg>}
                active={activeTool === 'select'}
                onClick={() => setActiveTool('select')}
                theme={theme}
            />
            <ToolButton
                label={t('toolbar.pan')}
                icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
=======
                transform: `scale(${toolbarScale})`,
                transformOrigin: 'top left',
                transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <div className="m3-toolbar__section">
                <div className={groupTitleClass}>{t('toolbar.workspaceGroup')}</div>
                <div className={`m3-toolbar__group ${isLayerPanelExpanded ? 'm3-toolbar__group--active' : ''}`}>
                    <ToolButton
                        label={t('toolbar.layers')}
                        onClick={onLayersClick}
                        icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="5" width="7" height="14" rx="2" /><rect x="13" y="5" width="7" height="14" rx="2" /></svg>}
                        active={isLayerPanelExpanded}
                        theme={theme}
                        tone="accent"
                    />
                    {onAssetsClick && (
                        <ToolButton
                            label={t('toolbar.assets')}
                            onClick={onAssetsClick}
                            icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16" /><path d="M10 4v16" /></svg>}
                            theme={theme}
                        />
                    )}
                    <ToolButton
                        label={t('toolbar.settings')}
                        onClick={onSettingsClick}
                        icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c0 .7.4 1.3 1.1 1.6.2.1.5.1.7.1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>}
                        theme={theme}
                    />
                </div>
            </div>

            <div className="m3-toolbar__divider" />

            <div className="m3-toolbar__section">
                <div className={groupTitleClass}>{t('toolbar.navigateGroup')}</div>
                <div className={`m3-toolbar__group ${activeTool === 'select' || activeTool === 'pan' ? 'm3-toolbar__group--active' : ''}`}>
                    <ToolButton
                        label={t('toolbar.select')}
                        icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 3 7 17 2.5-7.5L21 10 4 3Z" /><path d="m13 13 6 6" /></svg>}
                        active={activeTool === 'select'}
                        onClick={() => setActiveTool('select')}
                        theme={theme}
                        tone="accent"
                    />
                    <ToolButton
                        label={t('toolbar.pan')}
                        icon={
                            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
>>>>>>> Stashed changes
                        <path d="M6 12V6a2 2 0 1 1 4 0v6" />
                        <path d="M10 12V5a2 2 0 1 1 4 0v7" />
                        <path d="M14 12V7a2 2 0 1 1 4 0v7" />
                        <path d="M18 12v-1a2 2 0 1 1 4 0v3a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-2a2 2 0 1 1 4 0" />
                    </svg>
<<<<<<< Updated upstream
                }
                active={activeTool === 'pan'}
                onClick={() => setActiveTool('pan')}
                theme={theme}
            />
            <ToolGroupButton
                label={t('toolbar.shapes')}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                items={shapeTools}
                fallbackIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>}
                theme={theme}
            />
            <ToolGroupButton
                label={t('toolbar.drawingTools')}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                items={drawingTools}
                fallbackIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></svg>}
                theme={theme}
            />
            <ToolButton
                label={t('toolbar.text')}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3" /><path d="M12 4v16" /><path d="M9 20h6" /></svg>}
                active={activeTool === 'text'}
                onClick={() => setActiveTool('text')}
                theme={theme}
            />

            <div className={`my-0.5 h-px w-5 ${isDark ? 'bg-white/10' : 'bg-neutral-200'}`} />

            <input
                type="color"
                aria-label={t('toolbar.strokeColor')}
                title={t('toolbar.strokeColor')}
                value={drawingOptions.strokeColor}
                onChange={(event) => setDrawingOptions({ ...drawingOptions, strokeColor: event.target.value })}
                className={`h-7 w-7 cursor-pointer rounded-[12px] border bg-transparent p-0 ${isDark ? 'border-white/10' : 'border-neutral-200'}`}
            />
            <input
                type="range"
                min="1"
                max="50"
                aria-label={t('toolbar.strokeWidth')}
                title={t('toolbar.strokeWidth')}
                value={drawingOptions.strokeWidth}
                onChange={(event) => setDrawingOptions({ ...drawingOptions, strokeWidth: Number(event.target.value) })}
                className="h-16 w-7 cursor-pointer appearance-none bg-transparent [writing-mode:vertical-lr]"
            />
            <span className="text-[10px] text-white/60">{drawingOptions.strokeWidth}</span>

            <div className={`my-0.5 h-px w-5 ${isDark ? 'bg-white/10' : 'bg-neutral-200'}`} />
=======
                        }
                        active={activeTool === 'pan'}
                        onClick={() => setActiveTool('pan')}
                        theme={theme}
                    />
                </div>
            </div>

            <div className="m3-toolbar__divider" />

            <div className="m3-toolbar__section">
                <div className={groupTitleClass}>{t('toolbar.createGroup')}</div>
                <div className={`m3-toolbar__group ${isShapeActive || isDrawingActive || activeTool === 'text' ? 'm3-toolbar__group--active' : ''}`}>
                    <ToolGroupButton
                        label={t('toolbar.shapes')}
                        activeTool={activeTool}
                        setActiveTool={setActiveTool}
                        items={shapeTools}
                        fallbackIcon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>}
                        theme={theme}
                    />
                    <ToolGroupButton
                        label={t('toolbar.drawingTools')}
                        activeTool={activeTool}
                        setActiveTool={setActiveTool}
                        items={drawingTools}
                        fallbackIcon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" /></svg>}
                        theme={theme}
                    />
                    <ToolButton
                        label={t('toolbar.text')}
                        icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3" /><path d="M12 4v16" /><path d="M9 20h6" /></svg>}
                        active={activeTool === 'text'}
                        onClick={() => setActiveTool('text')}
                        theme={theme}
                        tone="accent"
                    />
                </div>
            </div>

            <div className="m3-toolbar__divider" />

            <div className="m3-toolbar__section">
                <div className={groupTitleClass}>{t('toolbar.strokeGroup')}</div>
                <div className="m3-toolbar__stroke-panel">
                    <label className={`m3-toolbar__stroke-swatch ${isDark ? 'm3-toolbar__stroke-swatch--dark' : 'm3-toolbar__stroke-swatch--light'}`}>
                        <input
                            type="color"
                            aria-label={t('toolbar.strokeColor')}
                            title={t('toolbar.strokeColor')}
                            value={drawingOptions.strokeColor}
                            onChange={(event) => setDrawingOptions({ ...drawingOptions, strokeColor: event.target.value })}
                            className="m3-toolbar__color-input"
                        />
                    </label>
                    <div className="m3-toolbar__stroke-range-wrap">
                        <input
                            type="range"
                            min="1"
                            max="50"
                            aria-label={t('toolbar.strokeWidth')}
                            title={t('toolbar.strokeWidth')}
                            value={drawingOptions.strokeWidth}
                            onChange={(event) => setDrawingOptions({ ...drawingOptions, strokeWidth: Number(event.target.value) })}
                            className={`m3-toolbar__stroke-range ${isDark ? 'm3-toolbar__stroke-range--dark' : 'm3-toolbar__stroke-range--light'}`}
                        />
                        <span className="m3-toolbar__stroke-value">{drawingOptions.strokeWidth}</span>
                    </div>
                </div>
            </div>

            <div className="m3-toolbar__divider" />
>>>>>>> Stashed changes

>>>>>>> Stashed changes
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
<<<<<<< Updated upstream
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
=======
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        onUpload(file);
                    }
                    event.target.value = '';
                }}
            />
<<<<<<< Updated upstream
            <ToolButton
                label={t('toolbar.upload')}
                onClick={() => fileInputRef.current?.click()}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" /></svg>}
                theme={theme}
            />
            {onAssetsClick && (
                <ToolButton
                    label="Assets"
                    onClick={onAssetsClick}
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16" /><path d="M10 4v16" /></svg>}
                    theme={theme}
                />
            )}
            <ToolButton
                label={t('toolbar.settings')}
                onClick={onSettingsClick}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c0 .7.4 1.3 1.1 1.6.2.1.5.1.7.1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>}
                theme={theme}
            />

            <div className={`my-0.5 h-px w-5 ${isDark ? 'bg-white/10' : 'bg-neutral-200'}`} />

            <ToolButton
                label={t('toolbar.undo')}
                onClick={onUndo}
                disabled={!canUndo}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 14-5-5 5-5" /><path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5 5.5 5.5 0 0 1 14.5 20H11" /></svg>}
                theme={theme}
            />
            <ToolButton
                label={t('toolbar.redo')}
                onClick={onRedo}
                disabled={!canRedo}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13" /></svg>}
                theme={theme}
            />
>>>>>>> Stashed changes
=======
            <div className="m3-toolbar__section">
                <div className={groupTitleClass}>{t('toolbar.historyGroup')}</div>
                <div className="m3-toolbar__group">
                    <ToolButton
                        label={t('toolbar.upload')}
                        onClick={() => fileInputRef.current?.click()}
                        icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" /></svg>}
                        theme={theme}
                    />
                    <ToolButton
                        label={t('toolbar.undo')}
                        onClick={onUndo}
                        disabled={!canUndo}
                        icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 14-5-5 5-5" /><path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5 5.5 5.5 0 0 1 14.5 20H11" /></svg>}
                        theme={theme}
                    />
                    <ToolButton
                        label={t('toolbar.redo')}
                        onClick={onRedo}
                        disabled={!canRedo}
                        icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13" /></svg>}
                        theme={theme}
                    />
                </div>
            </div>
>>>>>>> Stashed changes
        </div>
    );
};
