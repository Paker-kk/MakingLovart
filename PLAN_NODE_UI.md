# 节点白板双模融合与全局重构架构计划

在彻底抛弃老旧的 `NodeWorkflowPanel.tsx` 页面基础上，我们将不仅重构一个强大的 Tapnow 风格节点系统，更要解决与本项目现有的“AI 创绘白板模式”的深度联动问题。我们的目标是构建一套**底层架构共享、前台双模无缝切换**的新一代创作基础设施。

---

## 核心主轴一：白板模式与节点模式的无缝双切

当前项目本身具备了传统的“图层/图层历史白板模式”（`App.tsx` 中的 Canvas 模式），现在我们要做到它与“节点连线模式（NodeWorkflow）”的融合：

**1. 顶层状态共享与路由感知**
- 在顶层导航栏（Topbar）或工作区标签页中增加 Toggle Switch 控件（“画布模式”/“节点流模式”）。
- **底层资产（Asset Store）共用**：无论是白板下生成的图，还是节点模式下生成的图，统统保存在 `generationHistory` 中。当从节点模式切回白板模式时，可以直接从历史面板拖拽刚才节点生成的图到画板上。
- **状态保留**：采用 Zustand 进行全局持久化，使用户在两套模态间随意切换也不会丢失当前的连线数据或画板中的图层。

---

## 核心主轴二：全域 API KEY 管理与服务下沉共享

无论是简单的顶层白板悬浮 Prompt 框，还是特定深度组合的节点流，以及右侧智能对话助理（OpenClaw Agent），都必须共用同一个凭据配置源，彻底消除各自为战的请求通道。

**借鉴自 Tapnow `getApiCredentials` 的设计并作双模通用化**：

**1. 全局配置中心 (`store/api-config-store.ts`)**
我们要巩固现在的配置系统，并引入类似 Tapnow 里的多 Provider 调度逻辑。用户在统一的 Settings 面板配置大模型和绘画生成模型的 API KEY 和 Base URL。

**2. 核心调度服务 (`services/aiGateway.ts`) 改造**
不再让单独的组件承载请求网络代码，所有的生图、生视频请求全部走统一的 `aiGateway`：
```typescript
// 伪代码参考
export const executeGenration = async (taskPayload: { 
  type: 'image' | 'video', 
  prompt: string, 
  references?: string[],
  modelId: string 
}) => {
  // 从统一 Store 获取类似于 Tapnow 中的 `const { key: apiKey, url: baseUrl } = getApiCredentials(modelId)`
  const credentials = resolveCredentials(taskPayload.modelId);
  
  if (!credentials.apiKey) {
    throw new Error('未在全局设置中找到对应的 API Key');
  }

  // 请求执行逻辑，并最终将返回的媒体对象注册进双端共享的 Media Asset Library 中...
}
```
通过这种改造，无论是普通画布模式点下“生成”按钮，还是节点模式下游触发“生成”，调用的都是同样的凭据、同样的通道。

---

## 核心主轴三：Contextual 输入框与 OpenClaw Agent 的联动协同

在节点和画布模式共存下，底部的提示词输入框不再是呆板的静态条，而是**随焦点转移而“变形”的 AI 控制中枢**。同时我们还要将 OpenClaw 代持 Agent 逻辑并入此系统。

### 1. 焦点输入框体系 (Contextual PromptBar)
- **非节点聚焦状态 (全局视角)**：
  如果用户停留在白板上或未选中任何节点。输入框充当**“全局 Agent 发布台”**。向其输入“帮我搭建一个视频场景节点并连线到渲染节点”，该请求会进入 OpenClaw Agent。
- **节点聚焦状态 (微观视角)**：
  一旦用户点击某节点的设置区域，输入框变为**“专属 Prompt Box”**，并自带上下文补全。用户在这里输入 `@` 将唤起整个 `history` 或者 `node` 资产库的可视化清单。最终输入类似于 `$Tapnow:` 的 `@{node123}` 标记。

### 2. OpenClaw Agent 函数调用 (Function Calling)
引入 Agent SDK（如 Vercel AI SDK），为 OpenClaw 开发专门操作节点图和白板图层的 Tools：

```typescript
// agentTools.ts - 提供给 OpenClaw 使用的函数清单
export const agentTools = {
  create_node: {
    description: "当用户要求在工作流中建立一个特定生成能力的节点时调用此工具。",
    parameters: z.object({
      type: z.enum(['gen-image', 'gen-video', 'llm-chat']),
      position: z.object({ x: z.number(), y: z.number() }),
      promptDraft: z.string().optional()
    }),
    execute: async (args) => {
       useNodeWorkflowStore.getState().addNode({...args});
       return { success: true, message: `已为您在 (${args.position.x}, ${args.position.y}) 放置节点` };
    }
  },
  connect_nodes: {
    description: "将生成节点关联到下游节点作为垫图",
    // 自动在底层寻找源输出和目标输入端口...
  }
}
```

如此一来，右侧的 AI 会话窗可直接接管用户的命令。系统自动获取 `api-config-store` 里的 OpenClaw Token 并建立 WebSocket 流，然后 OpenClaw 会连续触发 `create_node` 或 `connect_nodes`，在用户眼前自动补全 Tapnow 风格的排版连线动画，完成真正智能的体验升级。

---

## 四、 具体实施里程碑规划（破冰至合拢）

1. **废弃旧址期**: 删除老版本的 `NodeWorkflowPanel.tsx` 页面代码与组件；建立全新的 `view/WorkflowCanvas` 目录树。
2. **状态中台重铸**: 更新 Zustand 状态树（`useNodeWorkflowStore` & `api-config-store`），编写统一的 API KEY 和垫图资产读取器，打通这与历史面板。
3. ** Tapnow 表现层入驻**: 从 Tapnow 接连引入并抽象化 `NodeCard`, `ContextMenu` 等视觉与拖拽行为层视图组件。
4. ** 双通道组装调试**: 分别测试“普通白板画布”与“节点流布局”两种模式下的“发送给网关生成”，确保产出互联。
5. **Agent 通神**: 将 OpenClaw（智能助手）对接到双模工作局面的事件轴中。

---

## 五、 白板基础工具栏 (Toolbar) 的 Google Material 3 风格重塑

目前项目的 `components/Toolbar.tsx` 代码中，采用的是基础 `h-10 w-10 rounded-[18px]` 的方块拼接，样式较为传统且缺乏组群感。为了适配整套全新的宏大拓扑架构，工具栏将进行 Google Material / Workspace 设计语系（M3）的改造：

**1. 视觉容器革新 (Pill-shaped Floating Toolbar)**
- **外层载体**：由原先分散的按钮包裹，重构为类似 Google Docs/Gemini 界面常用的**高光胶囊体 (Stadium shape)**。增加极其柔和的 M3 级阴影（`shadow-elevation-3`），悬浮在画布左中侧。
- **色彩与材质**：不再是死板的白色或黑色，采用略带半透明或与主题匹配的表面色（Surface Color，如 `bg-zinc-50/90` 或 `bg-[#1E1E20]/90` 加上 Backdrop-blur）。

**2. 组群状态与按键交互设计 (Grouped Actions & Tonal Highlights)**
- 按键不再是生硬的方形。选中 (Active) 状态将采用 **“柔和色块着色” (Tonal Highlighting)**：在被选中的工具底层铺设一层带颜色的背景（如 `bg-blue-100 text-blue-700`，深色下则是暗蓝高光），代替以前生硬的 border `activeButtonClass`。
- **功能分区**：
  - **基础工具组**：指针、抓手、框选 (Pointer, Hand, Select)。
  - **创作工具组**：画笔、橡皮擦、形状 (Pen, Eraser, Shape)。
  - **节点拖拽专区**：新增“生图节点”、“生视频节点”提取按钮，在工具栏内集成一键拖出生成功能。
  组与组之间通过细微的竖线 (`divider`) 分开，提升结构清晰度。

**3. 代码重构落地思路**
将抛弃原有的定长高亮写法，改为封装式的 M3 按钮：
```tsx
const M3ToolButton = ({ active, ...props }) => {
  return (
    <button 
      className={`
        w-10 h-10 rounded-full transition-all duration-200 
        ${active ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                 : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400'}
      `}
    >
       <Icon /> 
    </button>
  )
}
// 工具栏外壳
<div className="flex flex-col gap-1 p-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
   {/* ...工具组 */}
</div>
```
通过这样的修改，既能兼顾原本图层白板的历史包袱（画画功能工具），又巧妙拓展了节点流框架下所需的卡片拖拽“抽屉”，视觉上达到了跨越性的统一。
