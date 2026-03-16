<p align="center">
  <img src="displayphoto1.png" alt="MakingLovart" width="100%" />
</p>

<h1 align="center">🎨 MakingLovart</h1>

<p align="center">
  <strong>AI-Native Infinite Canvas for Creative Minds</strong>
</p>

<p align="center">
  <em>用一句话描述你的想象，AI 帮你画出来</em>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Gemini-2.5-4285F4?logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## ✨ What is MakingLovart?

MakingLovart 是一个 **AI 驱动的无限画布创作工具**，灵感来源于 Miro + Lovart。你可以在白板上自由绘制、拖放素材，然后用自然语言提示词让 AI 生成图片、编辑图片、甚至生成视频——一切都在一个流畅的画布体验中完成。

> **Think of it as**: Figma's infinite canvas + ChatGPT's intelligence + Stable Diffusion's creativity — all in your browser.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- A Gemini API Key ([get one here](https://aistudio.google.com/apikey))

### Install & Run

```bash
# Clone
git clone https://github.com/Paker-kk/MakingLovart.git
cd MakingLovart

# Install dependencies
npm install

# Configure your API key
cp env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start creating 🎉

---

## 🎯 Features

### 🖌️ Infinite Canvas
- 无限缩放与平移的白板画布
- 自由绘制、形状、文字、箭头、线条等基础工具
- 多元素选择、对齐辅助线、图层管理
- 亮色 / 暗色主题自适应

### 🤖 AI-Powered Generation
- **文生图**: 输入提示词，Gemini / DALL-E / SDXL 直接生成图片到画布
- **图生图**: 选中画布上的图片 + 提示词 → AI 编辑
- **文生视频**: Veo 2.0 视频生成，支持 16:9 / 9:16
- **首尾帧动画**: 关键帧模式生成过渡动画
- **LLM 提示词润色**: 一键开关自动润色，生成前用 AI 优化你的提示词

### 📎 @Mention 引用系统
- 在输入框中 `@` 引用画布上的任意元素
- 支持 `@图片1 和 @图片2 生成新视频` 多图引用工作流
- 引用的元素自动作为参考图注入生成流程

### 🔑 多 Provider API 管理
- 支持 **Google (Gemini/Imagen/Veo)**、**OpenAI (GPT/DALL-E)**、**Anthropic (Claude)**、**Stability (SDXL)**、**Qwen**、**Banana** 等多家 AI 服务
- 按 Provider 自动推断可用模型，底部输入栏只显示已配置的模型
- API Key 验证 + 状态指示 + 生成前预检

### 🎭 角色锁定 (Character Lock)
- 选中一张角色图片 → 锁定为参考角色
- 后续生成自动注入角色描述，保持面部、发型、服装、体态一致性

### 📦 素材库 & 灵感面板
- 角色 / 场景 / 道具分类素材管理
- 生成历史自动记录
- 一键将素材拖入画布

### 🛠️ 更多能力
- 多画板管理，自由切换工作空间
- 右键菜单快捷操作
- 拖拽 / 粘贴上传参考图
- 效果预设保存与复用
- 国际化 (中/英双语)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript 5.8 |
| **Build** | Vite 6 |
| **Rich Text** | Tiptap 3 (@mention, suggestion) |
| **AI SDK** | @google/genai (Gemini, Imagen, Veo) |
| **Multi-Provider** | OpenAI, Anthropic, Stability, Qwen, Banana |
| **Styling** | Tailwind CSS + CSS Custom Properties |
| **Deployment** | Docker + Nginx / Vercel / Static |

---

## 📁 Project Structure

```
MakingLovart/
├── App.tsx                    # 主应用（画布、状态、生成逻辑）
├── index.tsx                  # 入口文件
├── types.ts                   # 全局类型定义
├── translations.ts            # 国际化文案
├── styles.css                 # 全局样式 & CSS 变量
├── components/
│   ├── PromptBar.tsx          # 底部智能输入栏
│   ├── Toolbar.tsx            # 左侧工具栏
│   ├── CanvasSettings.tsx     # 设置面板 & API Key 管理
│   ├── LayerPanel.tsx         # 图层管理面板
│   ├── InspirationPanel.tsx   # 灵感 & 历史面板
│   ├── AssetLibraryPanel.tsx  # 素材库
│   ├── RichPromptEditor.tsx   # Tiptap 富文本编辑器
│   ├── CanvasMentionExtension.tsx  # @mention 扩展
│   ├── MentionList.tsx        # @mention 下拉列表
│   └── ...
├── services/
│   ├── geminiService.ts       # Google Gemini/Imagen/Veo API
│   ├── aiGateway.ts           # 多 Provider 路由网关
│   └── bananaService.ts       # Banana Vision Agent
├── utils/
│   ├── assetStorage.ts        # 素材持久化
│   ├── fileUtils.ts           # 文件处理工具
│   └── generationHistory.ts   # 生成历史管理
├── Dockerfile                 # 多阶段 Docker 构建
├── docker-compose.yml         # Docker Compose 编排
└── nginx.conf                 # Nginx 生产配置
```

---

## 🐳 Deployment

### Docker (推荐)

```bash
# 一键启动
docker-compose up -d

# 访问
open http://localhost:3000
```

### Static Build

```bash
npm run build
# 产物在 dist/ 目录，部署到任意静态服务
```

### Vercel / Netlify

直接连接 GitHub 仓库即可自动部署，零配置。

> 📖 详细部署指南请参考 [DOCKER_GUIDE.md](./DOCKER_GUIDE.md)

---

## ⚙️ Configuration

在项目根目录创建 `.env` 文件:

```env
# Required: Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Alternative: Vite-prefixed (auto-exposed to client)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

更多 Provider 的 API Key 可在应用内 **设置 → API 配置** 中动态添加。

---

## 🤝 Contributing

我们欢迎所有形式的贡献！

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 **Pull Request**

> 📖 详细贡献指南请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)
>
> 📖 行为准则请参考 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

---

## 📄 License

本项目基于 [MIT License](./LICENSE) 开源。

Copyright © 2025 Making Team

---

<p align="center">
  <sub>Built with ❤️ and AI by <a href="https://github.com/Paker-kk">@Paker-kk</a></sub>
</p>
