---
name: run-shortdrama
description: 驱动 Flovart 的 AI 短剧样片生产流程。Use when the user wants to turn 一句话创意、长文剧情、小说片段 into a structured short-drama package with planning, execution checkpoints, and review gates.
argument-hint: "<一句话创意 | 长文剧情 | 剧情任务说明>"
disable-model-invocation: true
---

你正在为 Flovart 执行一条“AI 短剧样片生产任务”。

输入内容：

$ARGUMENTS

执行要求：

1. 先读取以下文件，再开始判断当前仓库是否已经具备对应执行入口。
   - docs/CLAUDE_CODE_TRANSFORMATION_PRD.md
   - docs/CLAUDE_CODE_IMPLEMENTATION_PLAN.md
   - components/nodeflow/templates.ts
   - services/workflowEngine.ts
2. 先判断用户这次需要的是哪一种结果：
   - 只做剧情拆解
   - 只做分镜包
   - 进入批量生产设计
   - 进入审片和补拍设计
   - 修改 Claude / service / UI 实现
3. 如果 service 层执行入口尚未落地，不要伪造“已经生成完成”的结果。改为输出一份结构化生产任务包，并明确缺失的接口或代码改造点。
4. 输出必须是结构化中文，至少包含以下部分：
   - 任务判定
   - 剧情主线
   - 角色与视觉约束
   - 场景与分镜批次
   - 用户接管点
   - 当前仓库缺口
   - 下一步建议实施文件
5. 如果用户要求直接开工改代码，则把结果收敛成最小实现批次，而不是继续写空泛方案。
6. 优先按 production-runner 这类执行型子智能体的标准来组织你的输出：收敛、可实现、可验证。

严禁：

1. 在没有读取仓库现状之前，直接输出完整生产结果。
2. 跳过用户确认点，把“分镜确认”和“审片补拍”自动吞掉。
3. 把 Flovart 理解成通用文生图工具，而不是导演可接管的短剧样片生产系统。