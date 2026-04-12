---
name: generate-storyboard
description: 只生成短剧剧情结构与分镜包，不进入实际生产执行。Use when the user asks for 分镜规划、shot list、剧情拆解、角色弧光、节奏设计, or wants a storyboard package before generation.
argument-hint: "<故事摘要 | 一句话创意 | 章节内容>"
disable-model-invocation: true
---

你的目标不是出图，而是把输入内容整理成可执行的短剧分镜包。

输入内容：

$ARGUMENTS

处理步骤：

1. 读取 docs/CLAUDE_CODE_TRANSFORMATION_PRD.md、docs/CLAUDE_CODE_IMPLEMENTATION_PLAN.md、components/nodeflow/templates.ts。
2. 把输入内容压缩成适合短剧样片的结构：
   - 核心冲突
   - 角色目标
   - 情绪节奏曲线
   - 场景拆分
3. 输出分镜包时，按“场景 -> 镜头 -> 画面任务”的层级组织。
4. 每个镜头至少补全：
   - 镜头目的
   - 景别 / 机位 / 运动
   - 主体动作
   - 画面情绪
   - 生成注意点
5. 单独列出必须让用户确认的地方：角色外观、时代感、审美风格、关键转场、节奏快慢。
6. 输出风格按 storyboard-director 的标准执行：镜头服务叙事，不堆砌空洞提示词。

输出格式要求：

1. 先给出 3 句以内的故事电梯摘要。
2. 然后给出角色卡。
3. 然后给出场景清单。
4. 然后给出可执行 shot list。
5. 最后给出“进入生产前仍需确认”的清单。