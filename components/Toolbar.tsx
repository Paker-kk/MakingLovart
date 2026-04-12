/**
 * ============================================
 * 主工具栏组件 (Toolbar)
 * ============================================
 * 
 * 【组件职责】
 * 提供画布创作的所有工具按钮，是用户操作画布的主要入口
 * 
 * 【核心功能】
 * 1. 工具选择：选择、平移、绘图、形状等工具
 * 2. 绘图选项：颜色选择器、笔刷粗细调整
 * 3. 文件上传：上传图片到画布
 * 4. 撤销/重做：操作历史管理
 * 5. 面板控制：打开设置、图层、画板面板
 * 6. 裁剪模式：显示裁剪确认/取消按钮
 * 7. 智能定位：根据图层面板状态调整位置
 * 
 * 【工具分类】
 * - 基础工具：选择、平移
 * - 形状工具：矩形、圆形、三角形、直线、箭头
 * - 绘图工具：画笔、高亮笔、套索、橡皮擦
 * - 其他工具：文本
 * 
 * 【设计模式】
 * - 工具组：相关工具折叠在一起，点击展开选择
 * - 响应式定位：根据图层面板展开/收起调整位置
 * - 状态提示：活跃工具高亮显示
 * 
 * 【交互逻辑】
 * - 点击工具按钮：切换当前工具
 * - 工具组按钮：点击展开，选择工具后自动收起
 * - 颜色/粗细：实时调整绘图参数
 * - 裁剪模式：切换为裁剪操作面板
 */

import React, { useState, useRef, useEffect } from 'react';
import type { Tool } from '../types';

/**
 * 【Props 接口定义】
 */
interface ToolbarProps {
    t: (key: string) => string;           // 国际化翻译函数
    activeTool: Tool;                     // 当前激活的工具
    setActiveTool: (tool: Tool) => void;  // 设置工具的回调
    drawingOptions: { strokeColor: string; strokeWidth: number };  // 绘图选项
    setDrawingOptions: (options: { strokeColor: string; strokeWidth: number }) => void;  // 设置绘图选项
    onUpload: (file: File) => void;       // 文件上传回调
    isCropping: boolean;                  // 是否处于裁剪模式
    onConfirmCrop: () => void;            // 确认裁剪回调
    onCancelCrop: () => void;             // 取消裁剪回调
    onSettingsClick: () => void;          // 打开设置回调
    onLayersClick: () => void;            // 打开图层面板回调
    onBoardsClick: () => void;            // 打开画板面板回调
    onUndo: () => void;                   // 撤销回调
    onRedo: () => void;                   // 重做回调
    canUndo: boolean;                     // 是否可以撤销
    canRedo: boolean;                     // 是否可以重做
    isLayerPanelExpanded?: boolean;       // 图层面板是否展开
    onLeftChange?: (leftPx: number) => void;  // 位置改变回调
}

/**
 * 【子组件】工具按钮
 * 
 * 单个工具按钮的统一样式和交互
 * 
 * @param {string} label - 按钮标签（用于辅助功能）
 * @param {JSX.Element} icon - 按钮图标
 * @param {boolean} isActive - 是否为活跃状态
 * @param {Function} onClick - 点击回调
 * @param {boolean} disabled - 是否禁用
 * @param {string} className - 额外的CSS类名
 */
const ToolButton: React.FC<{
    label: string;
    icon: JSX.Element;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}> = ({ label, icon, isActive = false, onClick, disabled = false, className = '' }) => (
    <button
        onClick={onClick}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={`p-2 rounded-md transition-colors duration-200 text-neutral-500 ${
            isActive ? 'bg-neutral-100 text-neutral-600' : 'hover:bg-neutral-50'  // 活跃状态高亮
        } disabled:text-neutral-300 disabled:hover:bg-transparent disabled:cursor-not-allowed ${className}`}
    >
        {icon}
    </button>
);

/**
 * 【子组件】工具组按钮
 * 
 * 将多个相关工具折叠在一起，点击展开选择
 * 例如：形状工具组（矩形、圆形、三角形、直线、箭头）
 * 
 * 【功能】
 * - 显示当前选中的工具图标
 * - 点击展开工具列表
 * - 选择工具后自动收起
 * - 点击外部区域自动关闭
 * 
 * @param {Tool} activeTool - 当前激活的工具
 * @param {Function} setActiveTool - 设置工具的回调
 * @param {Array} tools - 工具组中的工具列表
 * @param {JSX.Element} groupIcon - 工具组默认图标
 * @param {string} groupLabel - 工具组标签
 */
const ToolGroupButton: React.FC<{
    activeTool: Tool;
    setActiveTool: (tool: Tool) => void;
    tools: { id: Tool; label: string; icon: JSX.Element }[];
    groupIcon: JSX.Element;
    groupLabel: string;
}> = ({ activeTool, setActiveTool, tools, groupIcon, groupLabel }) => {
    // ============ 状态和引用 ============
    const [isOpen, setIsOpen] = useState(false);              // 是否展开
    const wrapperRef = useRef<HTMLDivElement>(null);          // 容器引用

    // 查找当前工具是否在这个工具组中
    const activeToolInGroup = tools.find(t => t.id === activeTool);

    // ============ 副作用 ============
    
    /**
     * 【Effect】点击外部关闭工具组
     * 监听全局点击事件，点击组件外部时关闭展开的工具列表
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * 【方法】选择工具
     * 切换到指定工具并关闭工具列表
     */
    const handleToolSelect = (toolId: Tool) => {
        setActiveTool(toolId);
        setIsOpen(false);  // 选择后自动关闭
    };

    // ============ 渲染 ============
    
    return (
        <div className="relative flex-shrink-0" ref={wrapperRef}>
            {/* 工具组按钮 - 显示当前选中的工具或默认图标 */}
            <ToolButton
                label={activeToolInGroup ? activeToolInGroup.label : groupLabel}
                icon={activeToolInGroup ? activeToolInGroup.icon : groupIcon}
                isActive={!!activeToolInGroup}  // 如果工具组中有工具被激活，则高亮
                onClick={() => setIsOpen(prev => !prev)}  // 切换展开/收起
            />
            
            {/* 展开的工具列表 - 点击按钮时显示 */}
            {isOpen && (
                <div className="absolute left-full top-0 ml-2 p-1 bg-white border border-neutral-200 rounded-lg shadow-2xl flex flex-col gap-1">
                    {tools.map(tool => (
                        <ToolButton
                            key={tool.id}
                            label={tool.label}
                            icon={tool.icon}
                            isActive={activeTool === tool.id}
                            onClick={() => handleToolSelect(tool.id)}
                            className=""
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * 【主组件】工具栏 (Toolbar)
 */
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
    isLayerPanelExpanded = false,
    onLeftChange,
}) => {
    // ============ 引用和状态 ============
    const fileInputRef = React.useRef<HTMLInputElement>(null);  // 文件输入框引用

    // ============ 事件处理 ============
    
    /**
     * 【方法】触发文件上传
     * 点击上传按钮时，触发隐藏的文件输入框
     */
    const handleUploadClick = () => fileInputRef.current?.click();
    
    /**
     * 【方法】处理文件选择
     * 文件选择后，调用上传回调并清空输入框
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
            e.target.value = '';  // 清空输入框，允许重复选择同一文件
        }
    };

    // ============ 位置计算 ============
    
    /**
     * 【计算】工具栏左侧位置
     * 
     * 根据图层面板的展开/收起状态调整工具栏位置
     * - 图层面板展开时：288px（16px边距 + 256px面板宽度 + 16px间距）
     * - 图层面板收起时：16px（紧贴左边）
     * 
     * 这样工具栏始终不会被图层面板遮挡
     */
    const leftPosition = isLayerPanelExpanded ? 288 : 16;

    /**
     * 【Effect】通知位置变化
     * 当位置改变时，通知父组件（如果提供了回调）
     */
    useEffect(() => {
        if (onLeftChange) {
            onLeftChange(leftPosition);
        }
    }, [leftPosition, onLeftChange]);

    /**
     * 容器样式：背景色和动态左侧位置
     */
    const containerStyle: React.CSSProperties = {
        backgroundColor: `var(--ui-bg-color)`,
        left: `${leftPosition}px`,
        transition: 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',  // 平滑过渡动画
    };

    // ============ 渲染逻辑 ============
    
    /**
     * 【渲染模式 1】裁剪模式
     * 当处于裁剪状态时，显示裁剪确认/取消面板
     */
    if (isCropping) {
        return (
            <div 
                style={containerStyle}
                className="absolute left-4 top-4 z-10 w-44 p-3 border border-neutral-200 rounded-2xl shadow-xl bg-white flex flex-col gap-2"
            >
                {/* 标题 */}
                <div className="flex items-center gap-2 text-neutral-700">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h4v10H3zM17 7h4v10h-4zM7 3h10v4H7zM7 17h10v4H7z"/></svg>
                    <span className="text-sm font-medium">{t('toolbar.crop.title')}</span>
                </div>
                
                {/* 分隔线 */}
                <div className="w-full h-px bg-neutral-200"></div>
                
                {/* 操作按钮 */}
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={onCancelCrop} 
                        className="px-3 py-1.5 text-sm rounded-md bg-neutral-50 hover:bg-white border border-neutral-200 text-neutral-700"
                    >
                        {t('toolbar.crop.cancel')}
                    </button>
                    <button 
                        onClick={onConfirmCrop} 
                        className="px-3 py-1.5 text-sm rounded-md bg-neutral-900 text-white hover:brightness-110"
                    >
                        {t('toolbar.crop.confirm')}
                    </button>
                </div>
            </div>
        )
    }

    // ============ 工具定义 ============
    
    /**
     * 【基础工具】选择和平移
     */
    const mainTools: { id: Tool; label: string; icon: JSX.Element }[] = [
        { id: 'select', label: t('toolbar.select'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg> },
        { id: 'pan', label: t('toolbar.pan'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg> },
    ];
    
    /**
     * 【形状工具组】矩形、圆形、三角形、直线、箭头
     * 折叠在一个工具组按钮中
     */
    const shapeTools: { id: Tool; label: string; icon: JSX.Element }[] = [
        { id: 'rectangle', label: t('toolbar.rectangle'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg> },
        { id: 'circle', label: t('toolbar.circle'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg> },
        { id: 'triangle', label: t('toolbar.triangle'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg> },
        { id: 'line', label: t('toolbar.line'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line></svg> },
        { id: 'arrow', label: t('toolbar.arrow'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> },
    ];

    /**
     * 【绘图工具组】画笔、高亮笔、套索、橡皮擦
     * 折叠在一个工具组按钮中
     */
    const drawingTools: { id: Tool; label: string; icon: JSX.Element }[] = [
        { id: 'draw', label: t('toolbar.draw'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg> },
        { id: 'highlighter', label: t('toolbar.highlighter'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18.37 2.63 1.4 1.4a2 2 0 0 1 0 2.82L5.23 21.37a2.82 2.82 0 0 1-4-4L15.55 2.63a2 2 0 0 1 2.82 0Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8v2"/></svg>},
        { id: 'lasso', label: t('toolbar.lasso'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="12" rx="8" ry="5" strokeDasharray="3 3" transform="rotate(-30 12 12)"/></svg>},
        { id: 'erase', label: t('toolbar.erase'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"/><path d="M22 21H7"/><path d="m5 12 5 5"/></svg> },
    ];

    /**
     * 【其他工具】文本等
     */
    const miscTools: { id: Tool; label: string; icon: JSX.Element }[] = [
        { id: 'text', label: t('toolbar.text'), icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg> },
    ];

    /**
     * 【渲染模式 2】正常工具栏
     * 
     * 垂直工具栏布局（从上到下）：
     * 1. 画板按钮
     * 2. 设置按钮
     * 3. 分隔线
     * 4. 基础工具（选择、平移）
     * 5. 形状工具组
     * 6. 绘图工具组
     * 7. 其他工具（文本）
     * 8. 分隔线
     * 9. 颜色选择器
     * 10. 笔刷粗细滑块
     * 11. 粗细数值显示
     * 12. 分隔线
     * 13. 文件上传按钮
     * 14. 分隔线
     * 15. 撤销/重做按钮
     */
    return (
        <div 
            className="absolute z-[40] px-2 py-4 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl flex flex-col items-center gap-2 transition-all duration-300 ease-out"
            style={{
                ...containerStyle,
                top: '50%',
                transform: 'translateY(-50%)',
                maxHeight: 'calc(100vh - 8rem)', // 上下各留 4rem 空间
            }}
        >
            {/* 1. 画板按钮 */}
            <ToolButton label="Boards" onClick={onBoardsClick} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>} />
            
            {/* 2. 设置按钮 */}
            <ToolButton label={t('toolbar.settings')} onClick={onSettingsClick} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>} />

            {/* 3. 分隔线 */}
            <div className="w-10 h-px bg-neutral-200"></div>
            
            {/* 4-7. 工具区域 */}
            <div className="flex flex-col items-center gap-2 flex-grow">
                {/* 4. 基础工具：选择、平移 */}
                {mainTools.map(tool => (
                    <ToolButton key={tool.id} label={tool.label} icon={tool.icon} isActive={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} />
                ))}

                {/* 5. 形状工具组 */}
                <ToolGroupButton 
                    activeTool={activeTool} 
                    setActiveTool={setActiveTool} 
                    tools={shapeTools} 
                    groupLabel={t('toolbar.shapes')}
                    groupIcon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
                />

                {/* 6. 绘图工具组 */}
                <ToolGroupButton 
                    activeTool={activeTool} 
                    setActiveTool={setActiveTool} 
                    tools={drawingTools} 
                    groupLabel={t('toolbar.drawingTools')}
                    groupIcon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>}
                />

                {/* 7. 其他工具：文本 */}
                {miscTools.map(tool => (
                    <ToolButton key={tool.id} label={tool.label} icon={tool.icon} isActive={activeTool === tool.id} onClick={() => setActiveTool(tool.id)} />
                ))}

                {/* 8. 分隔线 */}
                <div className="w-10 h-px bg-neutral-200"></div>
                
                {/* 9. 颜色选择器 */}
                <input 
                    type="color" 
                    aria-label={t('toolbar.strokeColor')} 
                    title={t('toolbar.strokeColor')} 
                    value={drawingOptions.strokeColor} 
                    onChange={(e) => setDrawingOptions({ ...drawingOptions, strokeColor: e.target.value })} 
                    className="w-8 h-8 p-0 border border-neutral-300 rounded-md cursor-pointer bg-transparent" 
                />
                
                {/* 10. 笔刷粗细滑块 */}
                <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={drawingOptions.strokeWidth} 
                    aria-label={t('toolbar.strokeWidth')} 
                    title={t('toolbar.strokeWidth')} 
                    onChange={(e) => setDrawingOptions({ ...drawingOptions, strokeWidth: parseInt(e.target.value, 10) })} 
                    className="w-10 cursor-pointer" 
                />
                
                {/* 11. 粗细数值显示 */}
                <span className="text-sm text-neutral-600 w-6 text-center">{drawingOptions.strokeWidth}</span>
                
                {/* 12. 分隔线 */}
                <div className="w-10 h-px bg-neutral-200"></div>
                
                {/* 13. 文件上传（隐藏的input + 按钮） */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                    aria-label={t('toolbar.upload')} 
                    title={t('toolbar.upload')} 
                />
                <ToolButton 
                    label={t('toolbar.upload')} 
                    onClick={handleUploadClick} 
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>} 
                />
            </div>

            {/* 14. 分隔线 */}
            <div className="w-10 h-px bg-white/30"></div>
            
            {/* 15. 撤销/重做按钮 */}
            <ToolButton 
                label={t('toolbar.undo')} 
                onClick={onUndo} 
                disabled={!canUndo} 
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>} 
            />
            <ToolButton 
                label={t('toolbar.redo')} 
                onClick={onRedo} 
                disabled={!canRedo} 
                icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>} 
            />
        </div>
    );
};