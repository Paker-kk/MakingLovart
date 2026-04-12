# Flovart Claude Code 改造实施计划

> 版本：v0.1
>
> 日期：2026-04-10
>
> 对应文档：[CLAUDE_CODE_TRANSFORMATION_PRD.md](./CLAUDE_CODE_TRANSFORMATION_PRD.md)

---

## 一、实施目标

本计划的目标不是一次性把 Flovart 改成完整的 Claude Code 生态产品，而是按最小可验证路径，把以下能力逐步落地：

1. 让 Flovart 具备可被 Claude Code 稳定调用的短剧任务执行入口。
2. 让短剧工作流从“人工拼装”变成“可复用、可暂停、可继续、可补拍”的生产流程。
3. 让所有生成结果回流到 Flovart 画布，形成导演级可编辑闭环。
4. 在不破坏现有生成能力的前提下，为后续插件化和 marketplace 分发预留结构。

---

## 二、实施原则

### 2.1 产品原则

1. 先把“短剧样片生产系统”做清楚，再扩展成更泛化的创作平台。
2. 优先保证稳定出片，而不是追求表面上的自动化炫技。
3. 任何自动化都必须保留用户可接管点。

### 2.2 技术原则

1. 先沉淀 service 层执行入口，再接 UI 和 Claude Code 侧能力。
2. 尽量复用现有 `services/`、`components/nodeflow/`、`agentOrchestrator` 的能力。
3. 先做项目内 `.claude` 骨架验证，再平滑迁移为可分发 plugin。
4. 每一阶段都必须有可验证结果，避免长链路一次性重构。

### 2.3 风险控制原则

1. 不在第一阶段引入重度桌面控制。
2. 不在第一阶段做复杂 MCP 编排中心。
3. 不在第一阶段大拆 `App.tsx`，只做必要接入点。
4. 对已有图像/视频/Provider 逻辑做增量封装，不做破坏性替换。

---

## 三、总体实施路径

整个实施分为 5 个阶段。

| 阶段 | 名称 | 目标 | 输出 |
|------|------|------|------|
| Phase 0 | 基线盘点 | 确认可复用能力与约束 | 模块映射、任务边界、输入输出协议 |
| Phase 1 | 执行入口层 | 建立短剧 pipeline 的 service 层入口 | `shortDramaPipeline` 系列服务骨架 |
| Phase 2 | 项目内 Claude 骨架 | 用 `.claude` 跑通 skills / agents / hooks | 可在项目中调用的短剧工作流能力 |
| Phase 3 | Flovart UI 闭环 | 打通任务状态、暂停继续、画布回写 | 任务队列、补拍、节奏控制入口 |
| Phase 4 | Plugin 化迁移 | 从项目内能力平移到分发型插件 | `claude-plugin/` 目录与 manifest |

---

## 四、Phase 0：基线盘点

### 4.1 目标

确认哪些能力已经存在，哪些能力缺的是“编排层”，哪些能力真的需要新增。

### 4.2 主要任务

1. 梳理现有图像、视频、工作流、Agent、资产库、画布回写能力。
2. 明确短剧主流程的数据结构。
3. 确认现有模板中哪些可以直接复用到短剧场景。
4. 列出必须新增的 service 层接口。

### 4.3 涉及文件

1. `services/workflowEngine.ts`
2. `services/agentOrchestrator.ts`
3. `components/nodeflow/templates.ts`
4. `components/NodeWorkflowPanel.tsx`
5. `App.tsx`
6. `types.ts`

### 4.4 输出物

1. 短剧任务类型定义草案。
2. 流程阶段图。
3. 现有能力映射表。

### 4.5 验证方式

1. 能明确列出“已有能力 / 缺失能力 / 新增入口”。
2. 不修改现有功能行为。

---

## 五、Phase 1：执行入口层

### 5.1 目标

把“短剧样片生产”从 UI 事件逻辑中抽出来，形成一个稳定的 service 层执行入口。

### 5.2 核心改造

新增一组短剧 service：

```text
services/
  shortDramaTypes.ts
  shortDramaPipeline.ts
  shortDramaPlanner.ts
  shortDramaExecution.ts
  shortDramaReview.ts
```

### 5.3 各文件职责

#### `services/shortDramaTypes.ts`

定义：

1. `ShortDramaTask`
2. `ShortDramaScene`
3. `StoryboardShot`
4. `VisualConstraint`
5. `ProductionBatch`
6. `ReviewIssue`
7. `PipelineCheckpoint`

#### `services/shortDramaPlanner.ts`

负责：

1. 把一句话创意或长文转为剧情结构。
2. 把剧情结构转为分镜清单。
3. 生成角色/风格/节奏约束。

优先复用：

1. `services/agentOrchestrator.ts`
2. `services/aiGateway.ts`
3. `components/nodeflow/templates.ts` 中短剧相关模板逻辑

#### `services/shortDramaExecution.ts`

负责：

1. 把分镜转成图像生成任务。
2. 把关键镜头转成视频生成任务。
3. 构建可并行执行的 batch。
4. 处理单镜头重试。

优先复用：

1. `services/workflowEngine.ts`
2. `services/runningHubService.ts`
3. `services/aiGateway.ts`

#### `services/shortDramaReview.ts`

负责：

1. 检查缺镜头。
2. 检查角色与风格漂移。
3. 检查节奏异常。
4. 输出补拍任务。

#### `services/shortDramaPipeline.ts`

负责：

1. 统一调度 planner、execution、review。
2. 维护阶段状态。
3. 支持暂停、恢复、补拍。
4. 暴露 UI 与 Claude Code 共同调用的标准入口。

### 5.4 需要改动的现有文件

#### `services/workflowEngine.ts`

计划改动：

1. 增加对短剧 batch 执行所需的统一包装函数。
2. 增加任务级状态回调接口。
3. 保留现有节点执行逻辑不动，新增上层包装而不是重写底层执行器。

#### `services/agentOrchestrator.ts`

计划改动：

1. 从“群聊后出最终 prompt”扩展为“按阶段输出结构化结果”。
2. 支持剧情、分镜、视觉、审片几个角色模式。
3. 输出 `storyOutline`、`shotList`、`visualConstraints` 等结构化字段。

### 5.5 验证方式

1. 输入一句话后，能得到结构化剧情与分镜数据。
2. 不依赖 UI，也能从 service 层触发一条短剧任务。
3. 不破坏原有图像生成入口。

### 5.6 风险闸门

如果这一阶段做完仍然只能返回自由文本，而没有结构化分镜对象，就不能进入下一阶段。

---

## 六、Phase 2：项目内 Claude Code 骨架

### 6.1 目标

先用项目内 `.claude` 验证 Claude Code 编排能力，再考虑分发。

### 6.2 新增目录

```text
.claude/
  settings.json
  skills/
    run-shortdrama/
      SKILL.md
    generate-storyboard/
      SKILL.md
    review-dailies/
      SKILL.md
  agents/
    story-architect.md
    storyboard-director.md
    visual-supervisor.md
    production-runner.md
    dailies-reviewer.md
  hooks/
    validate-shortdrama-command.ps1
    after-shortdrama-write.ps1
```

### 6.3 首批 skills 设计

#### `run-shortdrama`

职责：

1. 接收一句话或长文。
2. 调用剧情拆解、分镜规划、批量执行。
3. 输出当前任务状态。

设计原则：

1. `disable-model-invocation: true`，避免模型无意中自动触发。
2. 初期允许用户手动调用，降低误触风险。

#### `generate-storyboard`

职责：

1. 只生成剧情与分镜包。
2. 不直接执行视频与图像生产。

#### `review-dailies`

职责：

1. 检查当前任务结果。
2. 输出补拍清单。

### 6.4 首批 agents 设计

#### `story-architect`

职责：剧情拆解与冲突结构设计。

#### `storyboard-director`

职责：镜头设计、景别、节奏、镜头叙事功能。

#### `visual-supervisor`

职责：角色一致性、风格统一、服化道连续性。

#### `production-runner`

职责：调用具体图像/视频工作流执行。

#### `dailies-reviewer`

职责：输出缺口与补拍建议。

### 6.5 hooks 设计

#### `.claude/settings.json`

建议首期只启用两类 hooks：

1. `PreToolUse`
说明：约束高风险命令或错误路径调用。

2. `PostToolUse`
说明：当短剧相关文件或任务状态写入后，自动做格式校验、日志记录或轻量验证。

### 6.6 Windows 约束

由于当前用户环境是 Windows，首期 hook 脚本优先使用 PowerShell。

### 6.7 验证方式

1. Claude Code 能识别并调用短剧 skill。
2. 能触发结构化短剧任务，而不是只输出说明文字。
3. Hook 不会造成死循环或阻断正常编辑流程。

### 6.8 风险闸门

如果 `.claude` 骨架只能“描述流程”而不能真正调用 service 层入口，则不能进入 UI 闭环阶段。

---

## 七、Phase 3：Flovart UI 闭环

### 7.1 目标

把短剧任务从后台能力变成用户可见、可控、可接管的界面流程。

### 7.2 主要改动点

#### `App.tsx`

新增：

1. `shortDramaTask` 状态。
2. `pipelineCheckpoint` 状态。
3. 任务暂停与恢复入口。
4. 与画布元素的映射维护。

#### `components/RightPanel.tsx`

新增：

1. 短剧任务面板。
2. 批次进度展示。
3. 失败镜头列表。
4. 单镜头重生成入口。
5. 节奏与镜头顺序调整入口。

#### `components/NodeWorkflowPanel.tsx`

新增：

1. 短剧工作流模板快速启动入口。
2. 从 `ShortDramaTask` 自动实例化 workflow 的能力。

#### `components/AssetLibraryPanel.tsx` 或素材相关逻辑

增强：

1. 按角色 / 场景 / 道具 / 镜头结果自动归档。
2. 支持从补拍任务快速回到对应素材。

### 7.3 画布回写规则

所有生成结果必须：

1. 有镜头 ID。
2. 有所属 scene ID。
3. 有生成时间与批次信息。
4. 能被用户直接拖拽、替换、删除、重跑。

### 7.4 暂停/继续机制

必须支持：

1. 在剧情确认后暂停。
2. 在分镜确认后暂停。
3. 在批量出图后暂停。
4. 在补拍前暂停。

### 7.5 验证方式

1. 用户能从 UI 看到完整任务状态。
2. 所有结果都能进入画布。
3. 用户可在关键节点修改后继续执行。
4. 单镜头失败不导致整条流程重跑。

---

## 八、Phase 4：插件化迁移

### 8.1 目标

把项目内 `.claude` 验证成果迁移为可分发插件。

### 8.2 新增目录

```text
claude-plugin/
  .claude-plugin/
    plugin.json
  skills/
  agents/
  hooks/
  README.md
  settings.json
```

### 8.3 迁移策略

1. 先复制 `.claude/skills` 到插件目录。
2. 再迁移 `.claude/agents`。
3. 最后把 `.claude/settings.json` 中通用 hooks 迁移为 `hooks/hooks.json`。

### 8.4 注意事项

根据 2026 文档：

1. 插件的 `agents/skills/hooks` 必须在插件根目录，不可放进 `.claude-plugin/`。
2. 插件内资源要通过 `${CLAUDE_PLUGIN_ROOT}` 访问。
3. 插件内 subagent 不支持 `hooks`、`mcpServers`、`permissionMode` 这类前置字段时，要用项目级 `.claude` 或 settings 配合补足。

### 8.5 验证方式

1. `--plugin-dir` 能加载插件。
2. Skills / agents / hooks 在 Claude Code 中可见。
3. 不依赖项目内 `.claude` 也能运行基础能力。

---

## 九、Phase 5：第二阶段增强项

这部分不进入第一轮施工，但需要预留接口。

### 9.1 可选增强

1. MCP server 对接，标准化外部工作流能力。
2. Marketplace 分发。
3. Agent Teams 并行生产。
4. 更强的自动审片与节奏评估。
5. 更完整的样片导出与版本管理。

---

## 十、第一批代码施工清单

这是第一批建议直接动手的范围。

### 10.1 新增文件

1. `services/shortDramaTypes.ts`
2. `services/shortDramaPlanner.ts`
3. `services/shortDramaExecution.ts`
4. `services/shortDramaPipeline.ts`
5. `.claude/settings.json`
6. `.claude/skills/run-shortdrama/SKILL.md`
7. `.claude/skills/generate-storyboard/SKILL.md`
8. `.claude/agents/story-architect.md`
9. `.claude/agents/storyboard-director.md`

### 10.2 第一批改动文件

1. `services/agentOrchestrator.ts`
2. `services/workflowEngine.ts`
3. `types.ts`

### 10.3 第一批不动的文件

1. `App.tsx`
2. `RightPanel.tsx`
3. 大部分画布 UI 组件

原因：

先把能力层打通，再改用户界面，避免前后端一起漂移。

---

## 十一、每批交付后的验证清单

### 11.1 功能验证

1. 是否能从输入文本得到结构化短剧任务。
2. 是否能产出分镜对象列表。
3. 是否能执行最小批次生成。
4. 是否能记录任务状态。

### 11.2 工程验证

1. `npm run build`
2. `npm run test` 中与改动相关的测试
3. 新增类型没有破坏原有调用

### 11.3 产品验证

1. 用户是否一眼知道这是短剧样片能力。
2. 用户是否知道哪里可以暂停。
3. 用户是否知道哪里可以改单镜头。

---

## 十二、Dario 级强约束问题

在开始第一批代码施工前，必须继续盯住以下问题：

1. 首期样片的最低可接受质量标准到底是什么。
2. 角色一致性和节奏质量冲突时，优先级怎么排。
3. 批量吞吐的预算上限是多少。
4. 默认策略是自动补拍，还是先暂停给用户确认。
5. Claude Code 首期是“项目内能力层”，还是要同时考虑对外分发叙事。

---

## 十三、结论

最合理的施工顺序不是先改 UI，也不是先写 marketplace，而是：

1. 先把短剧能力沉到 service 层。
2. 再用 `.claude` 跑通 Claude Code 调用链。
3. 再把状态、暂停、补拍、回写接到 Flovart UI。
4. 最后再把能力迁移成可分发插件。

这条路径最慢的地方不在写代码，而在定义结构化短剧任务和稳定执行边界。只要这两件事没定住，后面的技能、代理、插件、MCP 都会是空壳。
