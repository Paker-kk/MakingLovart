import React from 'react';

interface LayerToggleButtonProps {
    isLayerMinimized: boolean;
    onToggle: () => void;
    toolbarLeft: number;
    isCompact?: boolean;
    compactBottomInset?: number;
    desktopBottomInset?: number;
}

export const LayerToggleButton: React.FC<LayerToggleButtonProps> = ({
    isLayerMinimized,
    onToggle,
    toolbarLeft,
    isCompact = false,
    compactBottomInset = 94,
    desktopBottomInset = 16,
}) => {
    const desktopLeft = toolbarLeft + 62;
    return (
        <button
            onClick={onToggle}
            style={{
                left: isCompact ? '12px' : `${desktopLeft}px`,
                bottom: isCompact ? `${compactBottomInset}px` : `${desktopBottomInset}px`,
                transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), bottom 0.2s ease',
            }}
            className="fixed z-50 h-10 w-10 rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-lg transition-all duration-200 hover:bg-neutral-50 hover:shadow-xl"
            title={isLayerMinimized ? '展开图层面板' : '收起图层面板'}
            aria-label={isLayerMinimized ? '展开图层面板' : '收起图层面板'}
        >
            <span className="flex h-full w-full items-center justify-center">
                {isLayerMinimized ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                )}
            </span>
        </button>
    );
};
