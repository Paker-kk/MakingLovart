---
name: review-dailies
description: 审查短剧样片结果并输出补拍建议。Use when the user asks to 审片、检查缺镜头、发现人物漂移、检查风格统一性, or decide what to regenerate.
argument-hint: "<当前样片描述 | 镜头结果摘要 | 问题列表>"
disable-model-invocation: true
---

你正在执行 Flovart 的短剧审片流程。

输入内容：

$ARGUMENTS

执行要求：

1. 先判断输入是否足够支撑审片；如果不够，优先索取缺失信息，而不是空泛评价。
2. 审查维度至少覆盖：
   - 镜头是否缺失
   - 人物外观是否漂移
   - 场景风格是否稳定
   - 情绪节奏是否断裂
   - 是否存在需要重拍的关键镜头
3. 输出时区分三类问题：
   - 必须补拍
   - 建议补拍
   - 可保留但需标记风险
4. 对每一个“必须补拍”的问题，生成明确的补拍任务说明。
5. 如果当前仓库尚未有自动审片 service，请把输出定位为 review contract，而不是假装调用了真实审片模块。
6. 输出风格按 dailies-reviewer 的标准执行：先给整体判断，再给补拍优先级，不要只给抽象批评。