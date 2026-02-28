import React, { useMemo, useRef, useState } from 'react';
import type { ChatAttachment, GenerationMode, PromptEnhanceMode } from '../types';

type WorkflowStage = 'idle' | 'input' | 'agent' | 'generate' | 'output' | 'error';

interface NodeWorkflowPanelProps {
    prompt: string;
    setPrompt: (value: string) => void;
    generationMode: GenerationMode;
    setGenerationMode: (mode: GenerationMode) => void;
    selectedImageModel?: string;
    selectedVideoModel?: string;
    imageModelOptions?: string[];
    videoModelOptions?: string[];
    onImageModelChange?: (model: string) => void;
    onVideoModelChange?: (model: string) => void;
    attachments: ChatAttachment[];
    canvasImages: Array<{ id: string; name?: string; href: string; mimeType: string }>;
    onRemoveAttachment: (id: string) => void;
    onUploadFiles: (files: FileList | File[]) => void;
    onDropCanvasImage: (payload: { id: string; name?: string; href: string; mimeType: string }) => void;
    isRunning: boolean;
    onRunWorkflow: (opts: { autoEnhance: boolean; enhanceMode: PromptEnhanceMode; stylePreset?: string }) => Promise<void>;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const NodeWorkflowPanel: React.FC<NodeWorkflowPanelProps> = ({
    prompt,
    setPrompt,
    generationMode,
    setGenerationMode,
    selectedImageModel,
    selectedVideoModel,
    imageModelOptions = [],
    videoModelOptions = [],
    onImageModelChange,
    onVideoModelChange,
    attachments,
    canvasImages,
    onRemoveAttachment,
    onUploadFiles,
    onDropCanvasImage,
    isRunning,
    onRunWorkflow,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [autoEnhance, setAutoEnhance] = useState(true);
    const [enhanceMode, setEnhanceMode] = useState<PromptEnhanceMode>('smart');
    const [stylePreset, setStylePreset] = useState('cinematic');
    const [stage, setStage] = useState<WorkflowStage>('idle');

    const stageText = useMemo(() => {
        switch (stage) {
            case 'input':
                return '读取输入节点...';
            case 'agent':
                return '执行 Agent 节点（提示词润色）...';
            case 'generate':
                return generationMode === 'video' ? '执行视频生成节点...' : '执行图像生成节点...';
            case 'output':
                return '输出节点完成';
            case 'error':
                return '流程执行失败';
            default:
                return '等待运行';
        }
    }, [stage, generationMode]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const rawCanvasImage = e.dataTransfer.getData('application/x-canvas-image');
        if (rawCanvasImage) {
            try {
                const parsed = JSON.parse(rawCanvasImage) as { id: string; name?: string; href: string; mimeType: string };
                if (parsed.href && parsed.mimeType) {
                    onDropCanvasImage(parsed);
                }
            } catch {
                // ignore malformed drag payload
            }
        }

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUploadFiles(e.dataTransfer.files);
        }
    };

    const handleCanvasThumbDrag = (
        item: { id: string; name?: string; href: string; mimeType: string },
        e: React.DragEvent<HTMLButtonElement>
    ) => {
        e.dataTransfer.setData('application/x-canvas-image', JSON.stringify(item));
        e.dataTransfer.setData('text/plain', item.name || item.id);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleRun = async () => {
        if (isRunning || !prompt.trim()) return;
        setStage('input');
        await wait(180);
        if (autoEnhance) {
            setStage('agent');
            await wait(220);
        }
        setStage('generate');
        try {
            await onRunWorkflow({
                autoEnhance,
                enhanceMode,
                stylePreset: enhanceMode === 'style' ? stylePreset : undefined,
            });
            setStage('output');
            await wait(1200);
            setStage('idle');
        } catch {
            setStage('error');
        }
    };

    return (
        <div className="absolute inset-0 rounded-3xl overflow-hidden bg-[#090b10] text-white">
            <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
                <button className="w-10 h-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/20">+</button>
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/15 text-xs">工作流</button>
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/15 text-xs">历史</button>
            </div>

            <div className="relative z-10 h-full px-16 py-10 md:px-20">
                <div className="h-full flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-white/80">Untitled</div>
                        <div className="text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-500/30 rounded-full px-3 py-1">
                            {stageText}
                        </div>
                    </div>

                    <div className="relative flex-1">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <path d="M 200 220 C 280 220, 320 320, 390 320" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth="2" />
                            <path d="M 650 320 C 760 320, 760 220, 820 220" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth="2" />
                        </svg>

                        <div className="grid grid-cols-1 xl:grid-cols-[260px_300px_1fr] gap-6 h-full">
                            <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 backdrop-blur-md h-fit">
                                <div className="text-xs text-white/60 mb-3">Text</div>
                                <div className="space-y-2 text-sm text-white/85">
                                    <div>笔记:</div>
                                    <div className="text-white/70">⚡ 自己编写内容</div>
                                    <div className="text-white/70">◻ 文生短视频</div>
                                    <div className="text-white/70">⌘ 图片反推提示词</div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-xs text-white/60 mb-2">画板图片（可拖拽到右侧 Chat）</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {canvasImages.slice(0, 12).map(item => (
                                            <button
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => handleCanvasThumbDrag(item, e)}
                                                onClick={() => onDropCanvasImage(item)}
                                                className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 hover:border-emerald-300/70"
                                                title={`拖拽或点击添加：${item.name || item.id}`}
                                            >
                                                <img src={item.href} alt={item.name || item.id} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4 backdrop-blur-md flex flex-col justify-between min-h-[260px]">
                                <div>
                                    <div className="text-xs text-white/60 mb-4">Video</div>
                                    <div className="text-sm text-white/70">选中节点后在下方配置并生成</div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGenerationMode('image')}
                                            className={`text-xs px-3 py-1 rounded-full ${generationMode === 'image' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}`}
                                        >
                                            图像
                                        </button>
                                        <button
                                            onClick={() => setGenerationMode('video')}
                                            className={`text-xs px-3 py-1 rounded-full ${generationMode === 'video' ? 'bg-white text-black' : 'bg-white/10 text-white/80'}`}
                                        >
                                            视频
                                        </button>
                                    </div>
                                    <div className="text-xs text-white/60">参考图：{attachments.length} 张</div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/20 bg-[#11141d]/95 backdrop-blur-md shadow-2xl flex flex-col min-h-[420px]">
                                <div className="px-4 py-3 border-b border-white/10 text-xs text-white/60">双击开始编辑...</div>
                                <div
                                    className={`mx-4 mt-4 rounded-xl border transition-colors ${isDragOver ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 bg-black/20'}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragOver(true);
                                    }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                >
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="描述你想要生成的内容（支持拖入白板图片或上传图片）"
                                        className="w-full h-28 resize-none bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/40 outline-none"
                                    />

                                    {attachments.length > 0 && (
                                        <div className="px-3 pb-3 flex flex-wrap gap-2">
                                            {attachments.map(item => (
                                                <div key={item.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/20">
                                                    <img src={item.href} alt={item.name} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => onRemoveAttachment(item.id)}
                                                        className="absolute top-0 right-0 w-5 h-5 text-[10px] bg-black/70 text-white"
                                                        title="移除附件"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="px-4 py-3 mt-auto border-t border-white/10 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-xs px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20"
                                        >
                                            上传图片
                                        </button>
                                        <label className="text-xs text-white/70 inline-flex items-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={autoEnhance}
                                                onChange={(e) => setAutoEnhance(e.target.checked)}
                                                title="启用提示词润色"
                                                aria-label="启用提示词润色"
                                            />
                                            先执行提示词润色 Agent
                                        </label>
                                        <select
                                            value={enhanceMode}
                                            onChange={(e) => setEnhanceMode(e.target.value as PromptEnhanceMode)}
                                            className="text-xs bg-white/10 border border-white/20 rounded-full px-2 py-1"
                                            title="润色模式"
                                            aria-label="润色模式"
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
                                                className="text-xs bg-white/10 border border-white/20 rounded-full px-2 py-1"
                                                title="风格预设"
                                                aria-label="风格预设"
                                            >
                                                <option value="cinematic">电影感</option>
                                                <option value="ink">水墨</option>
                                                <option value="ghibli">吉卜力</option>
                                                <option value="cyberpunk">赛博朋克</option>
                                                <option value="pixar3d">3D 皮克斯</option>
                                            </select>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {generationMode === 'image' && imageModelOptions.length > 0 && (
                                            <select
                                                value={selectedImageModel}
                                                onChange={(e) => onImageModelChange?.(e.target.value)}
                                                className="text-xs bg-white/10 border border-white/20 rounded-full px-2 py-1"
                                                title="图像模型"
                                                aria-label="图像模型"
                                            >
                                                {imageModelOptions.map(model => <option key={model} value={model}>{model}</option>)}
                                            </select>
                                        )}
                                        {generationMode === 'video' && videoModelOptions.length > 0 && (
                                            <select
                                                value={selectedVideoModel}
                                                onChange={(e) => onVideoModelChange?.(e.target.value)}
                                                className="text-xs bg-white/10 border border-white/20 rounded-full px-2 py-1"
                                                title="视频模型"
                                                aria-label="视频模型"
                                            >
                                                {videoModelOptions.map(model => <option key={model} value={model}>{model}</option>)}
                                            </select>
                                        )}
                                        <button
                                            onClick={handleRun}
                                            disabled={isRunning || !prompt.trim()}
                                            className="ml-auto text-xs px-3 py-1.5 rounded-full bg-emerald-500/80 hover:bg-emerald-400 disabled:opacity-40"
                                        >
                                            {isRunning ? '运行中...' : '运行工作流'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                title="上传图片到工作流聊天框"
                aria-label="上传图片到工作流聊天框"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        onUploadFiles(e.target.files);
                        e.target.value = '';
                    }
                }}
            />
        </div>
    );
};
