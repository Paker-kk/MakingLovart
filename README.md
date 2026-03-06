<div align="center">

# MakingLovart | AI Creative Whiteboard

Modern infinite canvas + AI agents + node workflow.

[![Built with Nano Banana](https://img.shields.io/badge/Built%20with-Nano%20Banana-yellow?style=flat-square)](https://github.com/JimLiu/nanoBanana)
[![Inspired by Lovart](https://img.shields.io/badge/UI%20Inspired%20by-Lovart-ff69b4?style=flat-square)](https://lovart.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

---

## 项目简介

`MakingLovart` 是一个面向创作场景的 AI 白板应用：在无限画布上完成绘制、图层管理、提示词编辑、图像/视频生成，并支持 ComfyUI 风格的节点工作流。

当前包含两种工作模式：
- `自由白板 (Whiteboard)`：常规绘制、图层编辑、Prompt 输入与 AI 生成
- `节点工作流 (Node Workflow)`：节点连接、图像拖拽输入、图生图/图生视频链路

![MakingLovart preview](show.jpg)

## 最近更新 (2026)

- `@ 元素引用`：在 Prompt 富文本中输入 `@` 可引用画布元素作为 AI 参考
- `BANANA Agent`：支持图片内容识别拆层、高清放大、去背景等图像处理
- `Prompt Enhancer`：支持 `smart / style / precise / translate` 四种提示词增强模式
- `Character Lock`：从选中图层锁定角色一致性，跨轮次生成保持设定稳定
- `ComfyUI 风格节点画布`：支持节点拖拽、端口连线、画布平移缩放、Queue Prompt 运行
- `图像输入增强`：支持画板图片拖入 Chat/工作流，也支持本地上传作为参考图
- `自适应布局优化`：节点模式下自动隐藏遮挡面板，主交互区域更干净

## 核心能力

- 无限画布：路径、形状、文本、图片、视频等元素编辑
- 图层系统：重命名、显示/隐藏、锁定、排序、分组
- AI 生成：
  - 文生图
  - 图像编辑 / 局部重绘 (inpainting)
  - 图生视频
- Agent 协同：
  - Prompt 增强
  - 角色一致性锁定
  - BANANA 图像处理 Agent
- 节点工作流：
  - Prompt / Load Image / Enhancer / Generator / Preview 节点
  - 节点输入输出连线与基础运行编排

## 目录说明

- `App.tsx`: 主应用状态与工作流编排
- `components/NodeWorkflowPanel.tsx`: ComfyUI 风格节点编辑器
- `components/RichPromptEditor.tsx`: Prompt 富文本编辑器（含 `@引用`）
- `services/geminiService.ts`: Gemini 图像/视频/提示词增强服务
- `services/bananaService.ts`: BANANA 拆层与图像 Agent 服务
- `types.ts`: 核心类型定义
- `n8n-temp/`: 本地 n8n `editor-ui` 参考目录（用于架构对齐与复刻研究）

## 快速启动

前置环境：`Node.js 18+`（建议）

1) 安装依赖

```bash
npm install
```

2) 配置环境变量

复制 `env.example` 为 `.env.local`，至少配置：

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

3) 启动开发环境

```bash
npm run dev
```

4) 构建生产包

```bash
npm run build
```

## Docker

完整双语部署文档见 `DOCKER_GUIDE.md`（含 Nginx/Caddy/Traefik 示例与常见问题排查）。

## 技术栈

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Tiptap / ProseMirror（Prompt 富文本 + @引用）
- Google Gemini (`@google/genai`)
- localStorage（本地持久化）

## 路线图

- 对齐 `n8n editor-ui` 的节点交互细节（连接规则、群组、MiniMap、选择框）
- 抽象画布与节点数据模型，减少模式切换成本
- 增强工作流执行可视化（运行状态、错误定位、回放）

## 贡献

欢迎提交 Issue / PR。贡献指南见 `CONTRIBUTING.md`。

## 致谢

- BananaPod: https://github.com/ZHO-ZHO-ZHO/BananaPod
- Nano Banana: https://github.com/JimLiu/nanoBanana
- Lovart: https://lovart.com/
- n8n editor-ui: https://github.com/n8n-io/n8n/tree/master/packages/editor-ui

---

<div align="center">

If this project helps you, please give it a ⭐️

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>
