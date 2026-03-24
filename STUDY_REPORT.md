# Tapnow Studio — 项目学习报告 & PRD 指导手册

> **版本**: v3.8.8-rc7 | **分析日期**: 2026-03-19  
> **定位**: AI 驱动的多模态内容创作工作流编辑器（图像/视频/分镜/对话）

---

## 目录

- [一、项目总览与定位](#一项目总览与定位)
- [二、技术栈全景](#二技术栈全景)
- [三、代码结构详解](#三代码结构详解)
- [四、核心架构设计](#四核心架构设计)
- [五、核心算法与实现思路](#五核心算法与实现思路)
- [六、API 调用处理（原生 & 第三方）](#六api-调用处理原生--第三方)
- [七、边界处理与容错机制](#七边界处理与容错机制)
- [八、易错点与踩坑总结](#八易错点与踩坑总结)
- [九、核心代码参考索引](#九核心代码参考索引)
- [十、PRD 指导：如何开发类似项目](#十prd-指导如何开发类似项目)
- [十一、学习路径建议](#十一学习路径建议)

---

## 一、项目总览与定位

### 1.1 产品定义

Tapnow Studio 是一个基于 **可视化节点画布** 的 AI 多模态内容创作平台，核心能力包括：

| 功能模块 | 说明 |
|---------|------|
| **AI 图像生成** | 支持 GPT-4o-image、Jimeng、Midjourney 等多供应商 |
| **AI 视频生成** | 支持 Sora-2、Jimeng-Video、Grok-Video 等 |
| **智能分镜系统** | 可视化分镜编辑器，批量生成、首尾帧控制 |
| **AI 对话** | 多模型聊天，支持文件上传、流式输出 |
| **节点画布编辑器** | 拖拽式工作流设计，节点连接与数据流 |
| **蒙版/局部重绘** | Canvas 绘制蒙版，支持 inpainting |
| **本地缓存与导出** | IndexedDB 存储、ZIP 批量导出、本地服务器对接 |
| **模型库管理** | 统一模型配置、请求模板、参数体系 |

### 1.2 项目演进

```
原始版本 (HTML 单文件) → Vite + React 重构 → Provider 架构 → 分镜系统 → 性能优化 → 数据持久化 → Docker 部署
         v2.6.1                  v3.x               v3.7.20          v3.6.0        v3.5.20        v3.7.36
```

### 1.3 核心数据

- **主文件**: `src/App.jsx` — **37,589 行**（单文件巨石架构）
- **状态变量**: 80+ `useState` + 60+ `useRef` + 140+ `useEffect`
- **支持供应商**: 7+ API 供应商
- **节点类型**: 10+ 种
- **构建产物**: 单 HTML 文件（`vite-plugin-singlefile`）

---

## 二、技术栈全景

### 2.1 前端核心

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.2 | UI 框架，函数式组件 + Hooks |
| **Vite** | 5.1 | 构建工具，HMR 开发 |
| **Tailwind CSS** | 3.4 | 原子化 CSS，快速样式开发 |
| **Lucide React** | 0.344 | 图标系统，直接导入优化 |
| **i18next** | 23.12 | 国际化框架 |
| **react-i18next** | 14.1 | React i18n 绑定 |

### 2.2 数据处理

| 技术 | 用途 |
|------|------|
| **JSZip** | ZIP 文件打包与批量导出 |
| **file-saver** | 客户端文件下载 (`saveAs`) |
| **marked** | Markdown 解析渲染 |
| **DOMPurify** | HTML 净化防 XSS |
| **OpenAI SDK** (v6.16) | 官方 SDK，Chat/Image API |

### 2.3 构建与部署

| 技术 | 用途 |
|------|------|
| **vite-plugin-singlefile** | 构建为单 HTML 文件 |
| **PostCSS + Autoprefixer** | CSS 后处理 |
| **Docker** | 双容器部署（前端 Nginx + Python 本地服务器） |
| **Nginx** | SPA 静态资源服务，`try_files` fallback |
| **Playwright** | E2E 冒烟测试 |

### 2.4 后端（本地服务器）

| 技术 | 用途 |
|------|------|
| **Python 3.11** | 本地接收/代理服务 |
| **http.server** (标准库) | HTTP 服务器基础 |
| **Pillow** | PNG 转 JPG 图像处理 |
| **websocket-client** | ComfyUI WebSocket 中间件 |

### 2.5 关键设计决策

| 决策 | 原因 |
|------|------|
| **单文件架构** (`App.jsx` 37K 行) | 历史演进产物，从 HTML 单文件迁移而来，保持构建为单 HTML 的特性 |
| **vite-plugin-singlefile** | 支持离线运行、文件协议打开、便捷分发 |
| **IndexedDB 替代 localStorage** | Base64 图片存储量大（localStorage 5-10MB 限制），IndexedDB 支持数百 MB |
| **多 Provider 架构** | 统一 API 调用接口，支持快速接入新供应商 |
| **Blob URL → Base64 回退** | 解决 `blob:null` 在 `file://` 协议下的安全限制 |

---

## 三、代码结构详解

### 3.1 项目根目录

```
Tapnow-Studio-Study/
├── src/                          # 前端源码
│   ├── App.jsx                   # ⭐ 核心主文件 (37,589行)
│   ├── main.jsx                  # 入口文件 + 启动错误捕获
│   ├── index.css                 # Tailwind + 自定义动画
│   ├── performanceBenchmark.js   # 性能基准测试工具
│   ├── downloadSelectedHistory_stub.js  # 下载导出逻辑
│   ├── package.json              # (子目录 package.json, 用途待确认)
│   └── i18n/
│       ├── index.js              # i18n 初始化配置
│       └── locales/
│           ├── en.json           # 英文翻译
│           └── en.extracted.json # 提取的翻译键
├── localserver/                  # Python 本地服务器
│   ├── tapnow-server-full.py    # ⭐ 本地服务器主文件
│   ├── tapnow-local-config.json # 安全配置（白名单等）
│   ├── requirements.txt          # Python 依赖
│   ├── start_server.bat          # Windows 启动脚本
│   └── workflows/                # ComfyUI 工作流模板
├── docker/
│   └── nginx/default.conf        # Nginx SPA 配置
├── Dockerfile                    # 本地服务器容器
├── Dockerfile.web                # 前端 Nginx 容器
├── docker-compose.yml            # 双容器编排
├── package.json                  # 根依赖 & 脚本
├── vite.config.js                # Vite 构建配置
├── tailwind.config.js            # Tailwind 配置
└── postcss.config.js             # PostCSS 配置
```

### 3.2 App.jsx 内部结构（37,589 行分层）

```
App.jsx 内部架构
├── L1-70       全局设置：控制台过滤、导入声明、常量
│
├── L74-132     MaskVisualFeedback 组件（蒙版实时反馈）
├── L134-335    LocalImageManager（IndexedDB 图像存储管理 IIFE）
├── L337-410    URL/Base64 辅助函数
├── L412-538    LazyBase64Image 组件（智能图片加载）
├── L540-651    ResolvedVideo / HistoryMjImageCell 组件
├── L654-791    TagListEditor 标签编辑器
├── L794-828    ArtisticProgress 进度条组件
├── L831-1289   HistoryItem 组件（历史记录卡片，memo 优化）
├── L1294-1587  MaskEditor 蒙版编辑器组件
├── L1588-1793  全局 CSS 样式字符串
│
├── L1794-2200  常量定义：画布尺寸、默认配置、Provider、模型列表
├── L2200-2800  分辨率、比例、预设提示词
├── L2800-4100  请求模板、异步配置模板、规范化函数
├── L4100-4300  自动保存 IndexedDB 辅助函数
├── L4303-4351  Modal 模态框组件
├── L4360-4704  Lightbox 灯箱/图像查看器组件
│
├── L4736-37589 ⭐ TapnowApp 主组件函数
│   ├── L4737-5300   状态声明（80+ useState + 60+ useRef）
│   │   ├── L4737-4851   UI/主题/语言状态
│   │   ├── L4901-4976   节点/连接/画布状态
│   │   ├── L5112-5300   批处理/撤销栈状态
│   │   ├── L5339-5629   模型库/API配置/Provider 状态
│   │   └── L5661-5800   缓存/本地资源/性能模式状态
│   │
│   ├── L5800-6500   useEffect 初始化 & 数据加载
│   │   ├── L5800-6000   配置文件加载
│   │   ├── L6145-6237   历史记录/聊天会话恢复
│   │   └── L6315-6500   分镜计时器/API 检测
│   │
│   ├── L6500-9000   核心业务函数
│   │   ├── L6500-7500   缓存管理/本地服务器交互
│   │   ├── L7500-8400   节点操作（增删改查）
│   │   ├── L8400-9000   连接管理/聊天会话持久化
│   │   └── L9000-9700   辅助计算/状态派生
│   │
│   ├── L9700-14000  事件处理系统
│   │   ├── L10446-10960 画布交互（拖拽/平移/缩放）
│   │   ├── L10960-11050 连接创建逻辑
│   │   ├── L11763-12000 API 测试/模型列表
│   │   ├── L12420-12500 聊天消息发送
│   │   └── L13600-14000 拖放/文件导入
│   │
│   ├── L14000-19000  AI 生成核心
│   │   ├── L15261-15400 异步任务轮询 (pollAsyncTask)
│   │   ├── L16071-16550 ⭐ startGeneration 主函数
│   │   ├── L17500-17600 图像 API 错误处理
│   │   └── L18690-18800 视频 API 错误处理
│   │
│   ├── L19000-25000  UI 子面板渲染
│   │   ├── 模型库面板
│   │   ├── 配置面板
│   │   ├── 历史记录面板
│   │   └── 聊天面板
│   │
│   └── L25000-37589  JSX 主渲染
│       ├── L25904-26250 连接线 SVG 渲染
│       ├── L26250-35000 节点卡片渲染
│       └── L35000-37589 工具栏、侧边栏等 UI
```

---

## 四、核心架构设计

### 4.1 节点-画布体系

```
┌─────────────────────────────────────────────────────────┐
│                     Canvas Viewport                      │
│  ┌──────────┐    SVG连接线    ┌──────────┐              │
│  │ gen-image │ ────────────→ │ gen-video │              │
│  │  节点     │               │  节点     │              │
│  └──────────┘               └──────────┘              │
│       ↑                                                 │
│  ┌──────────┐    ┌────────────────┐                     │
│  │input-image│   │ storyboard-node│                     │
│  │  节点     │   │   分镜节点      │                     │
│  └──────────┘   └────────────────┘                     │
│                                                         │
│  View: { x, y, zoom }  ← 平移/缩放变换                  │
└─────────────────────────────────────────────────────────┘
```

**节点数据模型**:
```javascript
{
  id: "node-1710000000000",    // 时间戳 ID
  type: "gen-image",           // 节点类型
  x: 200, y: 150,             // 画布坐标
  width: 440, height: 420,    // 尺寸
  content: "...",             // 内容（图片URL/文本等）
  dimensions: { w: 1024, h: 1024 },  // 媒体尺寸
  maskContent: "data:...",    // 蒙版数据
  settings: {
    model: "jimeng-4.5",      // 选用模型
    prompt: "...",            // 提示词
    ratio: "1:1",             // 比例
    resolution: "1080P",      // 分辨率
    duration: "5s",           // 视频时长
    // ...其他模型特定参数
  }
}
```

**连接数据模型**:
```javascript
{
  id: "conn-1710000000000",
  from: "node-source",        // 来源节点 ID
  to: "node-target",          // 目标节点 ID
  inputType: "default"        // "default" | "oref" | "sref" (Midjourney特有)
}
```

### 4.2 API 供应商抽象层

```
┌─────────────────────────────────────────┐
│           Unified API Layer             │
│  startGeneration(prompt, type, ...)     │
├──────────┬──────────┬───────────────────┤
│ Provider │ apiType  │   异步模式         │
├──────────┼──────────┼───────────────────┤
│ OpenAI   │ openai   │ 同步              │
│ Jimeng   │ openai   │ 同步/强制异步       │
│ Grok     │ openai   │ 同步              │
│ Yunwu    │ gemini   │ 同步              │
│ ModelScope│ modelscope│ forceAsync轮询    │
│ BizyAir  │ (模板)    │ asyncConfig轮询   │
│ ComfyUI  │ (本地)    │ WebSocket轮询     │
└──────────┴──────────┴───────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        Multi-Key 负载均衡 & 容错         │
│  1. 逗号分隔 Key → 随机选择              │
│  2. 黑名单过滤（1006 积分耗尽）           │
│  3. 暂停列表过滤（登录失效 60min）         │
│  4. 熔断器保护（2min 内 10 次触发）       │
└─────────────────────────────────────────┘
```

### 4.3 数据持久化层

```
┌──────────────────────────────────────────────────┐
│                 持久化策略                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  IndexedDB (tapnow_images_db)                    │
│  ├── images store: 图片 Blob 存储                 │
│  └── 容量: 数百 MB                               │
│                                                  │
│  IndexedDB (tapnow_autosave_db)                  │
│  ├── autosave store: 节点/连接快照                 │
│  └── 触发: 状态变化时自动写入                      │
│                                                  │
│  localStorage                                     │
│  ├── tapnow_nodes: 节点数据 (降级存储)             │
│  ├── tapnow_connections: 连接数据                  │
│  ├── tapnow_api_blacklist: API 黑名单 (日重置)     │
│  ├── tapnow_api_suspend: 暂停列表 (TTL 60min)     │
│  ├── tapnow_prompt_library: 提示词库               │
│  ├── tapnow_chat_*: 聊天会话数据                   │
│  ├── tapnow_providers: Provider 配置               │
│  └── tapnow_model_library: 模型库                  │
│                                                  │
│  本地服务器 (port 9527)                            │
│  ├── /save: 文件持久化到磁盘                       │
│  ├── /save-thumbnail: 缩略图缓存                   │
│  └── /list-files: 文件列表                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 五、核心算法与实现思路

### 5.1 多 Key 负载均衡算法

**实现位置**: App.jsx L16250-16275

**算法思路**:
```
输入: apiKeyRaw (逗号分隔的多个 Key)
1. 分割为数组 allKeys
2. 过滤黑名单: availableKeys = allKeys.filter(k => !blacklist[k])
3. 随机选择: apiKey = random(availableKeys)
4. 降级: 若全部被拉黑 → 随机选一个（带告警）
```

**核心代码参考**:
```javascript
if (apiKeyRaw && apiKeyRaw.includes(',')) {
    const allKeys = apiKeyRaw.split(',').map(k => k.trim()).filter(k => k);
    const currentBlacklist = apiBlacklistRef.current || {};
    const availableKeys = allKeys.filter(k => !currentBlacklist[k]);
    if (availableKeys.length > 0) {
        apiKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    } else if (allKeys.length > 0) {
        apiKey = allKeys[Math.floor(Math.random() * allKeys.length)];
        console.warn(`All ${allKeys.length} keys are blacklisted`);
    }
}
```

### 5.2 API 黑名单与熔断器

**实现位置**: App.jsx L5557-5660

**三级容错机制**:

| 级别 | 机制 | 触发条件 | 恢复方式 |
|------|------|---------|---------|
| **L1: 暂停列表** | TTL 60min | 登录失效 (34010105) | 时间到期自动恢复 |
| **L2: 黑名单** | 日重置 | 积分耗尽 (1006) | 次日零点自动清空 |
| **L3: 熔断器** | 全局暂停 | 2min 内 10 次 1006 错误 | 需人工确认 |

**熔断器核心代码**:
```javascript
const CIRCUIT_BREAKER_WINDOW_MS = 2 * 60 * 1000;  // 2分钟窗口
const CIRCUIT_BREAKER_THRESHOLD = 10;              // 10次阈值

const checkCircuitBreaker = () => {
    const now = Date.now();
    const recentErrors = error1006WindowRef.current
        .filter(t => now - t < CIRCUIT_BREAKER_WINDOW_MS);
    error1006WindowRef.current = recentErrors;       // 滑动窗口清理
    return recentErrors.length >= CIRCUIT_BREAKER_THRESHOLD;
};
```

### 5.3 异步任务轮询（通用 Polling 模式）

**实现位置**: App.jsx L15261-15400

**算法流程**:
```
1. 提交生成请求 → 获取 requestId
2. 进入轮询循环:
   a. 构建状态查询请求 (statusRequest)
   b. 发送 fetch → 解析响应 JSON
   c. 通过 statusPath 提取状态值 (如 "data.status")
   d. 判断:
      - successValues 包含 → 进入步骤 3
      - failureValues 包含 → 标记失败
      - 401/402/403 → 立即失败 + 黑名单
      - 其他 → 等待 pollIntervalMs 后重试
   e. 超过 maxAttempts → 超时失败
3. 获取结果:
   a. 构建结果查询请求 (outputsRequest)
   b. 通过 outputsPath 提取数据
   c. 通过 outputsUrlField 提取 URL
   d. 更新历史记录
```

**模板变量替换**:
```javascript
// 支持 {{provider.key}}, {{requestId}}, {{baseUrl}} 等变量
const resolveTemplateVar = (template, vars) => {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
        return getValueByPath(vars, path) || '';
    });
};
```

### 5.4 分镜 Shot-ID 匹配算法

**实现位置**: App.jsx L2163-2180

**问题**: 分镜的 shot ID 可能是字符串或数字，需要安全比较。

**算法**:
```javascript
const isSameShotId = (a, b) => {
    const rawA = normalizeShotIdValue(a);  // String(value).trim()
    const rawB = normalizeShotIdValue(b);
    if (!rawA || !rawB) return false;
    if (rawA === rawB) return true;        // 字符串精确匹配（优先）
    // 仅对纯数字 ID 进行数值比较（兼容历史数据）
    if (!SIMPLE_NUMERIC_SHOT_ID_RE.test(rawA) || !SIMPLE_NUMERIC_SHOT_ID_RE.test(rawB)) return false;
    const numA = Number(rawA);
    const numB = Number(rawB);
    if (!Number.isFinite(numA) || !Number.isFinite(numB)) return false;
    return Math.abs(numA - numB) < 1e-6;  // 浮点精度容差
};
```

**设计思路**: 先走字符串精确匹配（防止 token 类 ID 被误判），仅在双方都是纯数字时进行数值比较。

### 5.5 IndexedDB 图像存储 + 三层缓存

**实现位置**: App.jsx L134-335

**架构思路**:
```
请求图片 getImage(id)
    │
    ├── 命中 → Map 内存缓存 (blobUrlCache) → 直接返回 Base64
    │
    └── 未命中 → IndexedDB 查询 → FileReader 转 Base64
                                 → 写入 blobUrlCache
                                 → 返回 Base64
```

**关键设计**:
- **Base64 存入**: 前端上传的 data URL → `atob()` → `Uint8Array` → `Blob` → IndexedDB
- **Base64 读取**: IndexedDB Blob → `FileReader.readAsDataURL()` → Base64 字符串
- **为什么不用 Blob URL**: `file://` 协议下 `blob:null` 会触发安全错误（V3.7.32 修复）
- **ID 格式**: `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

### 5.6 智能分镜候选解析（模糊匹配）

**实现位置**: App.jsx L2087-2130

**算法**: 当 shotId 无法直接匹配时，使用评分系统找最佳候选：

```
评分规则:
+5  prompt 精确匹配
+4  prompt 匹配 shot.description
+3  description 匹配
+2  生成时间戳 < 20秒（线性衰减）
+1  状态为 generating
-2  已有输出图片（不太可能是目标）

降级策略（按优先级）:
1. 最高分 > 0 的 shot
2. 仅剩 1 个 shot 时直接返回
3. 仅有 1 个 generating 状态 shot
4. 仅有 1 个无输出的 shot
5. 全部不匹配 → 返回 null
```

### 5.7 批量生成并发控制

**实现位置**: App.jsx L16420-16480

**两种模式**:

| 模式 | 标识 | 行为 |
|------|------|------|
| `parallel_aggregate` | 并发聚合 | N 个独立请求，每次 1 张，结果聚合到同一任务卡 |
| `standard_batch` | 原生批次 | 单请求返回 N 张（需 API 支持） |

**并发聚合核心流程**:
```javascript
// 1. 检测是否需要并发分派
if (effectiveImageConcurrency > 1 && mode === PARALLEL_AGGREGATE) {
    
    // 2. 注册批次追踪
    imageBatchTaskMapRef.current.set(taskId, {
        total: effectiveImageConcurrency,
        completed: 0, failed: 0,
        intervalMs: requestedDispatchIntervalMs
    });
    
    // 3. 递归分派子任务（带间隔）
    for (let idx = 0; idx < effectiveImageConcurrency; idx++) {
        if (idx > 0 && dispatchInterval > 0) {
            await waitForMilliseconds(dispatchInterval);  // 防 429
        }
        startGeneration(prompt, type, images, nodeId, {
            _batchImageDispatched: true,
            _batchAggregate: true,
            _existingTaskId: taskId,
            imageConcurrency: 1
        });
    }
}
```

**原生多图探测**: 自动尝试 `standard_batch` 模式，如果 API 返回多图则标记为 `supported`，后续直接使用原生批次。

### 5.8 Canvas 蒙版绘制

**实现位置**: App.jsx L1294-1587 (MaskEditor)

**绘制流程**:
```
1. 初始化 Canvas (宽高 = 图片原始分辨率)
2. 加载已有蒙版 (maskContent → drawImage)
3. 鼠标事件处理:
   mousedown → 记录起始点, 开始绘制
   mousemove → 坐标转换(屏幕→画布), lineTo 连线
   mouseup   → 结束绘制, 保存历史帧
4. 坐标转换 (关键!):
   scaleX = canvas.width / rect.width
   scaleY = canvas.height / rect.height
   canvasX = (clientX - rect.left) * scaleX
   canvasY = (clientY - rect.top) * scaleY
5. 撤销: 历史帧栈 (maxHistory=10), getImageData/putImageData
6. 导出: canvas.toDataURL() → maskContent
```

---

## 六、API 调用处理（原生 & 第三方）

### 6.1 统一调用入口

**入口函数**: `startGeneration()` (App.jsx L16071)

```
startGeneration(prompt, type, sourceImages, nodeId, options)
    │
    ├── 1. 解析源图（IndexedDB / URL / Base64）
    ├── 2. 解析蒙版（当前节点 / 上游节点）
    ├── 3. 确定模型配置 & Provider
    ├── 4. 多 Key 负载均衡
    ├── 5. 检查黑名单 & 暂停列表
    ├── 6. 检查熔断器
    ├── 7. 批量分派判断
    │
    ├── type === 'image'
    │   ├── apiType === 'openai'  → OpenAI 兼容 API
    │   ├── apiType === 'gemini'  → Gemini Native API
    │   └── requestTemplate       → 自定义模板
    │
    ├── type === 'video'
    │   ├── Jimeng Video API (本地代理)
    │   ├── OpenAI Sora API
    │   └── asyncConfig → 异步轮询
    │
    └── type === 'chat'
        └── OpenAI Chat Completions (流式)
```

### 6.2 OpenAI 兼容 API（主要通道）

**适用供应商**: OpenAI, Jimeng, Grok, DeepSeek, Midjourney

**请求构建**:
```javascript
// 图像生成
fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        model: modelId,
        prompt: prompt,
        size: `${width}x${height}`,
        n: imageCount,           // 生成张数
        response_format: 'url',  // 或 'b64_json'
        // 可能的附加参数...
    })
});

// 图像编辑 (带参考图)
fetch(`${baseUrl}/v1/images/edits`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData  // multipart/form-data: image, mask, prompt, model
});
```

**响应解析**:
```javascript
// 标准 OpenAI 响应
{
  data: [
    { url: "https://...", b64_json: "..." },
    // ...
  ]
}

// 非标准响应兼容（多路径提取）
const urls = extractImageUrls(responseData);
// 尝试: data[].url → data[].b64_json → data.images → data.output → ...
```

### 6.3 Gemini Native API

**适用供应商**: Yunwu (gemini apiType)

**请求格式**:
```javascript
fetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
        contents: [
            {
                parts: [
                    { text: prompt },
                    // 如有参考图:
                    { inline_data: { mime_type: 'image/png', data: base64Data } }
                ]
            }
        ],
        generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            // ...
        }
    })
});
```

### 6.4 Jimeng 视频 API（本地代理模式）

**请求格式**:
```javascript
// 提交视频生成任务
fetch(`${jimengBaseUrl}/v1/videos/generations`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`
    },
    body: JSON.stringify({
        model: 'jimeng-video-3.5-pro',
        content: prompt,
        duration: '5s',
        // 首尾帧:
        first_frame_image: base64OrUrl,
        last_frame_image: base64OrUrl
    })
});

// 轮询任务状态 → 获取视频 URL
```

### 6.5 自定义请求模板（模型库扩展）

**用途**: 接入任意第三方 API（BizyAir、ComfyUI 等）

**模板结构**:
```javascript
{
  enabled: true,
  endpoint: '/v1/custom/generate',
  method: 'POST',
  headers: { 'Authorization': 'Bearer {{provider.key}}' },
  bodyType: 'json',  // 'json' | 'multipart' | 'formdata'
  body: {
    model: '{{model}}',
    prompt: '{{prompt}}',
    image_url: '{{imageUrl1}}'
  }
}
```

**模板变量**:
| 变量 | 含义 |
|------|------|
| `{{provider.key}}` | 当前供应商 API Key |
| `{{provider.url}}` | 供应商 Base URL |
| `{{model}}` | 模型 ID |
| `{{prompt}}` | 用户提示词 |
| `{{imageUrl1}}` ~ `{{imageUrl4}}` | 参考图 URL |
| `{{width}}`, `{{height}}` | 输出尺寸 |
| `{{requestId}}` | 异步任务 ID |

### 6.6 请求链（多步骤 API 调用）

**用途**: 需要先上传文件再生成的场景

```javascript
const REQUEST_CHAIN_TEMPLATE = {
    enabled: false,
    steps: [
        {
            id: 'upload_file',
            type: 'http',
            onError: 'stop',  // 'stop' | 'continue' | 'fallback'
            request: {
                endpoint: '/v1/files',
                method: 'POST',
                bodyType: 'multipart',
                files: { file: '{{fileBlob1:blob}}' },
                body: {}
            },
            extract: {
                uploadedFileId: 'id'  // 从响应提取变量供后续步骤使用
            }
        }
    ]
};
```

### 6.7 聊天 API（流式输出）

**实现位置**: App.jsx L12420+

```javascript
// 使用 OpenAI SDK (v6)
const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl + '/v1',
    dangerouslyAllowBrowser: true  // 浏览器端使用
});

const stream = await openai.chat.completions.create({
    model: chatModel,
    messages: formattedMessages,
    stream: true
});

for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    // 累积到消息内容，实时更新 UI
    accumulatedContent += content;
    updateChatMessage(messageId, accumulatedContent);
}
```

---

## 七、边界处理与容错机制

### 7.1 API 调用边界

| 边界场景 | 处理方式 | 位置 |
|---------|---------|------|
| **无可用 Key** | 降级到随机 Key + 告警 | L16258 |
| **全部 Key 黑名单** | 允许使用但记录警告 | L16260 |
| **熔断触发** | 抛出全局错误，停止发送 | L5650 |
| **HTTP 401/402/403** | 立即失败，不重试 + 黑名单（轮询中） | L15300 |
| **HTTP 429 (Too Many Requests)** | 记录 throttleStats，用户可见 | L2990 |
| **网络超时** | 图片 60s / 视频 300s 超时上限 | L1797 |
| **JSON 解析失败** | 轮询时自动重试，非轮询时标记失败 | L15380 |
| **参数错误 (1000)** | 立即终止，不进入重试 | L17537 |
| **responseFormat 不支持** | 自动回退到 url 格式 | L16400+ |

### 7.2 图片/URL 边界

| 边界场景 | 处理方式 |
|---------|---------|
| **Blob URL 失效** | 自动从 IndexedDB 重新加载 |
| **`blob:null` 安全错误** | FileReader 转 Base64 替代 (V3.7.32) |
| **data URL 过大** | 存入 IndexedDB，返回 img_xxx ID |
| **外部 URL 跨域** | 本地服务器 `/proxy` 代理 |
| **图片 404** | LazyBase64Image 组件降级处理 |
| **img_xxx ID 无法解析** | `getAssetFallbackUrl()` 回退链 |

### 7.3 存储边界

| 边界场景 | 处理方式 |
|---------|---------|
| **localStorage 超限** | 自动切换到 IndexedDB 存储 |
| **IndexedDB 不可用** | 降级到内存存储 (Map) |
| **历史记录过多** | `historySaveLimit` 可配置上限 + 90% 预警 |
| **自动保存冲突** | 时间戳快照 + 恢复确认对话框 |
| **黑名单跨日期** | 每日零点自动重置 (`Date.toDateString()`) |

### 7.4 画布交互边界

| 边界场景 | 处理方式 |
|---------|---------|
| **超出画布范围** | 虚拟画布尺寸 4000x4000 |
| **多节点同时拖动** | 多选集合统一偏移 |
| **连接端口冲突** | 同一输入点仅允许一个连接（image-compare 除外） |
| **缩放极限** | zoom 有上下限约束 |
| **性能模式下渲染** | ultra 模式禁用动画，使用缩略图 |

### 7.5 分镜边界

| 边界场景 | 处理方式 |
|---------|---------|
| **Shot ID 模糊匹配** | 先精确匹配 → 纯数字才走数值比较 |
| **输出快照历史满** | 最大 20 条 (`MAX_STORYBOARD_OUTPUT_HISTORY`) |
| **参考图隔离** | `isSameShotId` 严格匹配防止串写 |
| **生成超时** | 图片 60s / 视频 300s 超时，最后一镜兜底 |
| **小图删除** | 优先提升下一张为主图，仅无剩余时清空 |

---

## 八、易错点与踩坑总结

### 8.1 闭包陷阱 (Stale Closure)

**问题**: React 函数组件中，`useCallback` / `useEffect` 捕获的是创建时刻的状态值，后续状态更新不会反映在闭包内。

**本项目应对**:
```javascript
// 使用 useRef 同步最新值
const apiBlacklistRef = useRef(apiBlacklist);
useEffect(() => { apiBlacklistRef.current = apiBlacklist; }, [apiBlacklist]);

// 在回调中读取 ref.current 而非闭包中的 state
const handleGenerate = useCallback(() => {
    const currentBlacklist = apiBlacklistRef.current;  // ✅ 最新值
    // ...
}, []);  // 依赖数组为空，函数引用稳定
```

**易错点**: 60+ `useRef` 中相当一部分是为了解决闭包陷阱，初学者容易忽略。

### 8.2 Blob URL 生命周期

**问题**: `URL.createObjectURL(blob)` 创建的 Blob URL 在页面刷新后失效，且在 `file://` 协议下格式为 `blob:null/xxx`。

**踩坑历史**:
- V3.5.16: 引入 IndexedDB 替代 localStorage 存储图片
- V3.7.32: 发现 Blob URL 在 file 协议下产生安全错误，改用 FileReader 返回 Base64
- V3.7.36: 所有资产同步到本地存储，彻底解决 Blob 失效

**教训**: 浏览器端文件存储不能依赖 Blob URL 的持久性。

### 8.3 Passive Event Listener

**问题**: 滚轮事件默认为 passive，调用 `preventDefault()` 会抛出控制台错误。

**处理**: 全局过滤控制台错误 (App.jsx L1-44)

```javascript
// 启动即屏蔽 passive 相关的 console.error/warn/log
const shouldFilter = (args) => {
    for (let arg of args) {
        if (msg.includes('Unable to preventDefault inside passive event listener')) {
            return true;
        }
    }
};
```

### 8.4 单文件巨石架构的局限

**现状**: 37,589 行的 App.jsx

**影响**:
- IDE 性能下降（IntelliSense 缓慢）
- 模块边界模糊，状态管理颗粒度低
- 无法做 Code Splitting（一次加载全部代码）
- 改动风险高（全局副作用难以预测）

**缓解措施**（项目已采用）:
- `memo()` 优化子组件（HistoryItem, HistoryMjImageCell）
- `useCallback` + `useMemo` 减少不必要渲染
- 性能模式三档控制
- 注释标记分区（`// --- Section ---`）

### 8.5 API 错误码正则提取

**问题**: 不同 API 的错误格式不统一，错误码可能嵌套在消息字符串中。

**解决**: 正则提取 + 多路径检测
```javascript
const errorCodeMatch = errorMessage.match(/错误码[：:]\s*(\d+)/);
if (errorCodeMatch) {
    realErrorCode = parseInt(errorCodeMatch[1], 10);
}
```

### 8.6 i18n 翻译缺失

**现状**: 中文为默认语言，翻译键直接使用中文。当 key 找不到翻译时，i18n 返回 key 本身（即中文），所以中文不需要翻译文件。

**风险**: 如果中文文案中恰好和翻译键不一致，会导致回退失败。

### 8.7 DOMPurify 安全净化

**使用场景**: Markdown 渲染前通过 DOMPurify 净化，防止 XSS

```javascript
import DOMPurify from 'dompurify';
const safeHtml = DOMPurify.sanitize(marked.parse(rawMarkdown));
```

**易错点**: 必须在 `dangerouslySetInnerHTML` 前调用 `DOMPurify.sanitize()`。

---

## 九、核心代码参考索引

### 9.1 按功能模块

| 功能 | 文件 | 行号范围 | 关键函数/组件 |
|------|------|---------|--------------|
| **应用入口 & 错误捕获** | main.jsx | L1-50 | 启动守卫 + 错误记录 |
| **IndexedDB 图像管理** | App.jsx | L134-335 | `LocalImageManager` IIFE |
| **智能图片加载** | App.jsx | L412-538 | `LazyBase64Image` |
| **历史记录卡片** | App.jsx | L831-1289 | `HistoryItem` (memo) |
| **蒙版编辑器** | App.jsx | L1294-1587 | `MaskEditor` |
| **Provider 配置** | App.jsx | L1808-1843 | `DEFAULT_PROVIDERS` |
| **模型定义** | App.jsx | L1844-1900 | `DEFAULT_API_CONFIGS` |
| **异步配置模板** | App.jsx | L1952-2137 | `ASYNC_CONFIG_TEMPLATE` |
| **分镜辅助函数** | App.jsx | L2000-2160 | `isSameShotId`, `resolveStoryboardShotCandidate` |
| **请求模板规范化** | App.jsx | L2782-4138 | `normalizeRequestTemplate`, `normalizeAsyncConfig` |
| **自动保存 IDB** | App.jsx | L3968-4070 | `openAutoSaveDb`, `writeAutoSaveToIdb` |
| **灯箱组件** | App.jsx | L4360-4704 | `Lightbox` |
| **状态初始化** | App.jsx | L4737-5800 | 80+ useState 声明 |
| **API 黑名单** | App.jsx | L5557-5660 | 黑名单 + 暂停列表 + 熔断器 |
| **节点操作** | App.jsx | L8396-8451 | `deleteNode`, `addNode` |
| **画布拖拽** | App.jsx | L10446-10960 | `handleMouseDown/Move/Up` |
| **连接创建** | App.jsx | L10971-11050 | `handlePortMouseUp` |
| **聊天消息** | App.jsx | L12420-12500 | `sendChatMessage` |
| **异步轮询** | App.jsx | L15261-15400 | `pollAsyncTask` |
| **⭐ 核心生成函数** | App.jsx | L16071-16550 | `startGeneration` |
| **图像 API 错误** | App.jsx | L17500-17600 | 1000/1006/34010105 处理 |
| **视频 API 错误** | App.jsx | L18690-18800 | 视频特有错误分类 |
| **连接线渲染** | App.jsx | L25904-26250 | SVG 贝塞尔曲线 |
| **批量下载** | downloadSelectedHistory_stub.js | 全文 | JSZip 打包下载 |
| **性能基准** | performanceBenchmark.js | 全文 | 渲染/事件/内存测试 |
| **i18n 初始化** | i18n/index.js | 全文 | i18next 配置 |
| **本地服务器** | localserver/tapnow-server-full.py | 全文 | Python HTTP 服务 |
| **安全配置** | localserver/tapnow-local-config.json | 全文 | 白名单 + 功能开关 |

### 9.2 按设计模式

| 设计模式 | 应用场景 | 位置 |
|---------|---------|------|
| **IIFE 单例** | LocalImageManager | L134-335 |
| **策略模式** | API 类型分发 (openai/gemini/modelscope) | L16375+ |
| **观察者模式** | useEffect 监听状态变化自动保存 | L8916+ |
| **模板方法** | 请求模板变量替换 | L2782+ |
| **熔断器模式** | API 1006 错误保护 | L5644-5660 |
| **降级策略** | 黑名单全满时降级随机选 Key | L16258 |
| **滑动窗口** | 熔断器 2min 错误计数 | L5650 |
| **发布-订阅** | Toast 通知系统 | L4753 |
| **缓存代理** | blobUrlCache Map → IndexedDB | L140-260 |
| **命令模式** | Undo/Redo 栈 | L4948-4952 |

---

## 十、PRD 指导：如何开发类似项目

### 10.1 技术选型建议

**如果从零开始**:

| 层面 | 推荐方案 | 原因 |
|------|---------|------|
| **框架** | React 18 + TypeScript | 类型安全，大型项目必需 |
| **构建** | Vite 5 | 快速 HMR，生态丰富 |
| **状态管理** | Zustand 或 Jotai | 比 80+ useState 更可维护 |
| **样式** | Tailwind CSS | 原子化，响应式开发快 |
| **画布** | React Flow 或自研 SVG | 节点图编辑器的标准方案 |
| **持久化** | Dexie.js (IndexedDB 封装) | 比原生 API 更人性化 |
| **API 层** | TanStack Query | 请求缓存、重试、乐观更新 |
| **i18n** | react-i18next | 本项目已验证 |
| **测试** | Vitest + Playwright | 单元 + E2E |

### 10.2 架构改进方向

**从单文件到模块化**:

```
src/
├── components/
│   ├── Canvas/              # 画布核心
│   │   ├── CanvasViewport.tsx
│   │   ├── NodeCard.tsx
│   │   ├── ConnectionLine.tsx
│   │   └── hooks/useCanvasDrag.ts
│   ├── Nodes/               # 节点类型
│   │   ├── GenImageNode.tsx
│   │   ├── GenVideoNode.tsx
│   │   ├── StoryboardNode.tsx
│   │   └── ChatNode.tsx
│   ├── Panels/              # 侧面板
│   │   ├── HistoryPanel.tsx
│   │   ├── ModelLibrary.tsx
│   │   └── ConfigPanel.tsx
│   ├── Editor/              # 编辑器
│   │   ├── MaskEditor.tsx
│   │   └── Lightbox.tsx
│   └── Chat/                # 聊天系统
│       ├── ChatPanel.tsx
│       └── ChatMessage.tsx
├── services/
│   ├── api/
│   │   ├── ApiClient.ts         # 统一 API 客户端
│   │   ├── OpenAIProvider.ts    # OpenAI 适配器
│   │   ├── GeminiProvider.ts    # Gemini 适配器
│   │   ├── JimengProvider.ts    # Jimeng 适配器
│   │   └── AsyncPoller.ts       # 异步轮询器
│   ├── storage/
│   │   ├── ImageStorage.ts      # IndexedDB 图像管理
│   │   ├── AutoSave.ts          # 自动保存
│   │   └── ConfigStorage.ts     # 配置持久化
│   └── keyManager/
│       ├── KeyRotation.ts       # Key 轮换
│       ├── Blacklist.ts         # 黑名单
│       └── CircuitBreaker.ts    # 熔断器
├── stores/
│   ├── canvasStore.ts           # 画布状态
│   ├── nodeStore.ts             # 节点状态
│   ├── apiStore.ts              # API 配置状态
│   └── historyStore.ts          # 历史记录状态
├── hooks/
│   ├── useGeneration.ts         # 生成逻辑 Hook
│   ├── useStoryboard.ts         # 分镜逻辑 Hook
│   └── useLocalServer.ts        # 本地服务器交互 Hook
└── utils/
    ├── urlHelpers.ts            # URL/Base64 处理
    ├── templateEngine.ts        # 模板变量替换
    └── errorClassifier.ts       # 错误分类器
```

### 10.3 开发阶段规划

```
Phase 1: 基础画布 (2-3 周)
├── 节点渲染、拖拽、缩放
├── 连接线绘制
├── 节点增删改
└── 多选操作

Phase 2: API 集成 (2-3 周)
├── Provider 抽象层
├── 图像生成 API
├── Key 管理（黑名单、轮换）
└── 异步任务轮询

Phase 3: 高级功能 (3-4 周)
├── 视频生成
├── 蒙版编辑
├── 分镜系统
└── 聊天集成

Phase 4: 数据与稳定性 (2-3 周)
├── IndexedDB 持久化
├── 自动保存/恢复
├── 批量导出
└── 性能优化

Phase 5: 生产化 (1-2 周)
├── Docker 部署
├── 国际化
├── 性能模式
└── E2E 测试
```

### 10.4 关键技术决策清单

| # | 决策点 | 推荐选择 | 本项目选择 | 备注 |
|---|--------|---------|-----------|------|
| 1 | 状态管理方案 | Zustand | 原生 useState/useRef | 大量 Ref 解决闭包问题 |
| 2 | 画布引擎 | React Flow | 自研 SVG+DOM | 更灵活但维护成本高 |
| 3 | API Key 在前端 | 代理服务器 | `dangerouslyAllowBrowser: true` | 安全隐患，适合本地/私有场景 |
| 4 | 文件存储 | IndexedDB (Dexie) | 原生 IndexedDB | 工作但 API 繁琐 |
| 5 | 构建产物 | 常规 SPA | 单 HTML 文件 | 便于分发但体积大 |
| 6 | CSS 方案 | Tailwind + CSS Modules | Tailwind + 内联样式 | 部分样式硬编码在 JS |
| 7 | 错误处理 | 错误边界 + 全局监控 | try-catch + toast | 无系统化错误边界 |
| 8 | TypeScript | 强烈推荐 | 未使用 | 对 37K 行项目影响巨大 |

---

## 十一、学习路径建议

### 11.1 入门路线

```
Step 1: 理解项目定位
├── 阅读 README.md
├── 运行 npm run dev 查看 UI
└── 尝试创建节点、连接、生成图片

Step 2: 理解构建系统
├── package.json 脚本分析
├── vite.config.js → singlefile 插件
├── tailwind + postcss 配置
└── npm run build 查看产物

Step 3: 理解入口链路
├── index.html → main.jsx → App.jsx
├── 启动守卫 (boot guard) 机制
├── 错误捕获 + 复制按钮
└── i18n 初始化
```

### 11.2 进阶路线

```
Step 4: 理解核心状态
├── App.jsx L4737-5800 所有 useState
├── 节点/连接/画布 状态模型
├── useRef 解决闭包陷阱的模式
└── useEffect 的初始化链路

Step 5: 理解 API 层
├── Provider 架构 (L1808-1843)
├── startGeneration 主函数 (L16071)
├── 多 Key 负载均衡 (L16250)
├── 黑名单/暂停/熔断 三级容错
└── 异步轮询 pollAsyncTask (L15261)

Step 6: 理解画布系统
├── 节点拖拽 handleMouseDown/Move/Up
├── SVG 连接线渲染 (L25904)
├── 节点创建 addNode (L20511)
└── 多选/框选操作
```

### 11.3 高级路线

```
Step 7: 理解分镜系统
├── 分镜数据结构 (shots 数组)
├── Shot ID 匹配算法
├── 候选解析与评分系统
├── 批量生成与计时器

Step 8: 理解持久化
├── LocalImageManager (IndexedDB)
├── 自动保存 (localStorage + IDB 双通道)
├── Blob URL → Base64 回退
├── ZIP 批量导出

Step 9: 理解性能优化
├── memo / useCallback / useMemo
├── 性能模式三档 (off/high/ultra)
├── 缩略图缓存策略
├── requestAnimationFrame 画布绘制

Step 10: 理解部署
├── Docker 双容器编排
├── Nginx SPA 配置
├── 本地服务器安全配置
├── 代理白名单机制
```

### 11.4 关键学习资源对照

| 概念 | 本项目实现 | 推荐学习资源 |
|------|-----------|-------------|
| React Hooks 最佳实践 | App.jsx 全文 | React 官方文档 - Hooks |
| IndexedDB API | LocalImageManager | MDN IndexedDB Guide |
| Canvas 2D 绘图 | MaskEditor | MDN Canvas Tutorial |
| SVG 路径绘制 | 连接线渲染 | MDN SVG Path |
| Fetch API + 错误处理 | startGeneration | MDN Fetch API |
| 流式 SSE/Stream | Chat 功能 | OpenAI Streaming Docs |
| 熔断器模式 | checkCircuitBreaker | 《微服务设计模式》 |
| Docker 多阶段构建 | Dockerfile.web | Docker 官方文档 |
| Vite 构建优化 | vite.config.js | Vite 官方文档 |
| Tailwind CSS | index.css + JSX | Tailwind CSS 文档 |

---

## 附录 A: 本地服务器 API 速查

| 端点 | 方法 | 功能 | 鉴权 |
|------|------|------|------|
| `/ping` | GET | 健康检查 | 无 |
| `/status` | GET | 服务状态 + 功能开关 | 无 |
| `/config` | GET | 保存路径等配置 | 无 |
| `/list-files` | GET | 已保存文件列表 | 无 |
| `/file/{path}` | GET | 文件下载 | 路径白名单 |
| `/save` | POST | 保存单个文件 | 路径白名单 |
| `/save-batch` | POST | 批量保存 | 路径白名单 |
| `/save-thumbnail` | POST | 保存缩略图 | 路径白名单 |
| `/delete-file` | POST | 删除文件 | 路径白名单 |
| `/proxy` | POST | HTTP 代理 | Host 白名单 |
| `/comfy/queue` | POST | ComfyUI 任务提交 | 本地 |
| `/comfy/outputs/{id}` | GET | ComfyUI 结果获取 | 本地 |

## 附录 B: 安全配置说明

**tapnow-local-config.json**:
```json
{
    "allowed_roots": ["~/Downloads", "D:\\TapnowData"],  // 文件操作白名单路径
    "proxy_allowed_hosts": [                             // 代理白名单域名
        "api.openai.com", "ai.comfly.chat",
        "127.0.0.1:8188", "localhost:8188"
    ],
    "proxy_timeout": 300,                                // 代理超时(秒)
    "features": {                                        // 功能开关
        "file_server": true,
        "proxy_server": true,
        "comfy_middleware": true,
        "log_console": true
    }
}
```

**安全设计要点**:
- 文件操作限制在 `allowed_roots` 内，防止路径遍历
- 代理请求仅允许访问 `proxy_allowed_hosts` 中的域名，防止 SSRF
- 功能开关可禁用不需要的服务
- 默认监听端口 9527，仅供本地使用

## 附录 C: 测试脚本说明

| 脚本 | 命令 | 功能 |
|------|------|------|
| `test:k87` | `node scripts/k87_feature_tests.cjs` | K87 特性回归测试 |
| `test:storyboard-parser` | `node scripts/storyboard_project_parser_regression.cjs` | 分镜解析器回归测试 |
| `test:storyboard-roundtrip` | `node scripts/storyboard_save_load_roundtrip_regression.cjs` | 分镜保存/加载往返测试 |
| `test:smoke-playwright` | `node scripts/smoke_playwright_fallback.cjs` | Playwright 冒烟测试 |
| `test:release:gates` | 组合上述三个测试 | 发布门禁（所有回归测试通过） |

---

---

## 十二、深度专题：节点式画布系统实现详解

> 本章面向正在开发 AI 白板/节点编辑器的开发者，结合 Tapnow Studio 源代码，提供可直接复用的实现参考。

### 12.1 节点数据模型设计

**核心数据结构** (App.jsx L4901-4940):

```javascript
// 节点数据结构 —— 每个节点就是一个带坐标和设置的对象
const nodeStructure = {
    id: `node-${Date.now()}`,       // 唯一ID，用时间戳保证唯一性
    type: 'gen-image',              // 节点类型，决定渲染方式和行为
    x: 200, y: 150,                 // 画布世界坐标（不是屏幕坐标！）
    width: 440, height: 420,        // 节点尺寸（像素）
    content: 'https://...',         // 主要内容（图片URL/文本/视频等）
    dimensions: { w: 1024, h: 1024 }, // 输出媒体尺寸
    maskContent: 'data:image/png;base64,...', // 蒙版数据（可选）
    settings: {                     // 节点特定配置
        model: 'jimeng-4.5',       // 使用的模型
        prompt: '...',             // 提示词
        ratio: '1:1',             // 比例
        resolution: '1080P',       // 分辨率
        imageConcurrency: 1,       // 并发数
        customParams: { ... }      // 自定义参数
    }
};

// 连接数据结构 —— 描述两个节点之间的数据流
const connectionStructure = {
    id: `conn-${Date.now()}`,       // 唯一ID
    from: 'node-source-id',         // 源节点ID（输出端）
    to: 'node-target-id',           // 目标节点ID（输入端）
    inputType: 'default'            // 输入类型：'default' | 'oref' | 'sref' | 'veo_start' | 'veo_end'
};
```

**节点类型注册表** (App.jsx L20511-20540):

```javascript
// addNode 函数中根据类型分配默认尺寸
// 核心思路：不同类型节点有不同的最佳展示尺寸
const addNode = (type, worldX, worldY, sourceId, initialContent, initialDimensions, targetId, inputType) => {
    saveToUndoStack(); // 关键！每次修改前必须保存撤销栈

    // 根据类型确定默认尺寸 —— 使用嵌套三元运算符（实际项目建议用 Map）
    const defaultSize = type === 'gen-video'      ? { w: 400, h: 500 }
                      : type === 'gen-image'      ? { w: 440, h: 420 }
                      : type === 'video-input'    ? { w: 580, h: 460 }
                      : type === 'storyboard-node'? { w: 720, h: 500 }
                      : type === 'image-compare'  ? { w: 400, h: 300 }
                      : type === 'preview'        ? { w: 320, h: 260 }
                      : type === 'text-node'      ? { w: 280, h: 200 }
                      : type === 'novel-input'    ? { w: 400, h: 500 }
                      : type === 'local-save'     ? { w: 320, h: 380 }
                      : { w: 260, h: 260 };       // 默认

    const newNode = {
        id: `node-${Date.now()}`,
        type,
        // 关键：以点击位置为中心放置节点（而不是左上角）
        x: worldX - defaultSize.w / 2,
        y: worldY - defaultSize.h / 2,
        width: defaultSize.w,
        height: defaultSize.h,
        content: initialContent,
        // 根据类型初始化对应的 settings
        settings: type === 'gen-image'
            ? {
                model: resolveModelKey(lastUsedImageModel),  // 记住上次使用的模型
                ratio: lastUsedRatio,                         // 记住上次使用的比例
                resolution: lastUsedImageResolution,
                prompt: '',
                imageConcurrency: fallbackImageConcurrency
              }
            : type === 'gen-video'
            ? { model: resolveModelKey(lastUsedVideoModel), duration: '5s', ... }
            : type === 'storyboard-node'
            ? { projectTitle: '未命名分镜', shots: [], mode: 'default', ... }
            : {}
    };

    // 状态更新：追加新节点
    setNodes(prev => [...prev, newNode]);

    // 自动连接逻辑 —— 从哪个端口创建的节点，就自动建立连接
    if (sourceId) {
        // 从输出端口拖出 → 从源到新节点
        setConnections(prev => [...prev, {
            id: `conn-${Date.now()}`,
            from: sourceId,
            to: newNode.id
        }]);
    }
    if (targetId) {
        // 从输入端口拖出 → 从新节点到目标
        setConnections(prev => {
            // 特定输入点先删旧连接（一个输入点只能接一条线）
            if (inputType && inputType !== 'default') {
                const filtered = prev.filter(c =>
                    !(c.to === targetId && (c.inputType || 'default') === inputType)
                );
                return [...filtered, { id: `conn-${Date.now()}`, from: newNode.id, to: targetId, inputType }];
            }
            return [...prev, { id: `conn-${Date.now()}`, from: newNode.id, to: targetId }];
        });
    }

    return newNode;
};
```

### 12.2 画布坐标系统

**核心概念：屏幕坐标 vs 世界坐标**

```
屏幕坐标 (Screen)            世界坐标 (World)
┌─────────────────┐          ┌─────────────────────────────────┐
│  浏览器可见区域   │    →     │  虚拟画布 4000x4000              │
│  (CSS 像素)      │  变换    │  (可平移、缩放)                  │
│  0,0 在左上角    │          │  0,0 在画布中心                  │
└─────────────────┘          └─────────────────────────────────┘

变换公式:
  worldX = (screenX - view.x) / view.zoom
  worldY = (screenY - view.y) / view.zoom

反变换:
  screenX = worldX * view.zoom + view.x
  screenY = worldY * view.zoom + view.y
```

**视图状态** (App.jsx L5309):

```javascript
const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
// view.x, view.y: 画布偏移量（屏幕像素）
// view.zoom: 缩放倍率 (0.2 ~ 3.0)

// 屏幕→世界坐标转换函数
const screenToWorld = useCallback((screenX, screenY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
        x: (screenX - (rect?.left || 0) - view.x) / view.zoom,
        y: (screenY - (rect?.top || 0) - view.y) / view.zoom
    };
}, [view]);
```

### 12.3 拖拽系统完整实现

**状态机设计** (App.jsx L6293-6300):

```javascript
// 拖拽相关的全部状态
const [isPanning, setIsPanning] = useState(false);       // 画布平移中？
const [isDragging, setIsDragging] = useState(false);      // 任何拖拽中？
const [dragNodeId, setDragNodeId] = useState(null);       // 正在拖的节点ID
const [resizingNodeId, setResizingNodeId] = useState(null); // 正在调整尺寸的节点ID
const [isSelecting, setIsSelecting] = useState(false);    // 框选中？
const [selectionBox, setSelectionBox] = useState(null);   // 框选矩形

// ⭐ 关键：用 ref 同步状态，避免闭包陷阱
const isPanningRef = useRef(false);
const isSelectingRef = useRef(false);
const lastMousePos = useRef({ x: 0, y: 0 });
const multiNodeDragStartPos = useRef(null);  // 多选拖动起点
```

**鼠标按下处理** (App.jsx L10446-10500):

```javascript
const handleMouseDown = (e) => {
    if (e.button === 0 || e.button === 1) {
        if (e.currentTarget.id === 'canvas-bg') {
            // 1. 忽略交互元素上的点击（input/textarea/button 等）
            const target = e.target;
            if (target.closest('input, textarea, select, button, [contenteditable="true"]')) {
                return;
            }

            // 2. 清除文本选择（防止拖拽被卡住）
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                selection.removeAllRanges();
            }

            // 3. Ctrl + 左键 → 框选模式
            if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setIsSelecting(true);
                isSelectingRef.current = true;
                const rect = canvasRef.current?.getBoundingClientRect();
                const startX = e.clientX - (rect?.left || 0);
                const startY = e.clientY - (rect?.top || 0);
                setSelectionBox({ startX, startY, endX: startX, endY: startY });
                setSelectedNodeIds(new Set());
                return;
            }

            // 4. 否则 → 画布平移模式
            if (!isSelectingRef.current) {
                setIsPanning(true);
                isPanningRef.current = true;
                lastMousePos.current = { x: e.clientX, y: e.clientY };
            }
        }
    }
};
```

**鼠标移动处理 + RAF 节流** (App.jsx L10627-10810):

```javascript
const handleMouseMove = useCallback((e) => {
    const { clientX, clientY } = e;

    // === 画布平移 ===
    if (isPanning || isPanningRef.current) {
        setIsDragging(true);
        const dx = clientX - lastMousePos.current.x;
        const dy = clientY - lastMousePos.current.y;

        // 忽略微小移动（<1px），减少不必要的重渲染
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

        // ⭐ 关键优化：累积移动距离，RAF 节流
        if (pendingPanUpdate.current) {
            pendingPanUpdate.current.dx += dx;  // 累积！不是覆盖
            pendingPanUpdate.current.dy += dy;
        } else {
            pendingPanUpdate.current = { dx, dy };
        }

        if (!panRafRef.current) {
            panRafRef.current = requestAnimationFrame(() => {
                if (!pendingPanUpdate.current) { panRafRef.current = null; return; }
                const { dx, dy } = pendingPanUpdate.current;
                setView(prev => ({
                    ...prev,
                    // 精度处理：极端缩放时使用更高精度
                    x: Math.round((prev.x + dx) * 100) / 100,
                    y: Math.round((prev.y + dy) * 100) / 100
                }));
                pendingPanUpdate.current = null;
                panRafRef.current = null;
            });
        }
        lastMousePos.current = { x: clientX, y: clientY };
        return;
    }

    // === 单节点拖动 ===
    if (dragNodeId) {
        const safeZoom = Math.max(0.2, Math.min(3.0, view.zoom));
        // 使用 movementX/Y 更平滑（浏览器提供的增量值）
        const deltaX = e.movementX / safeZoom;
        const deltaY = e.movementY / safeZoom;

        // 阈值过滤
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

        const currentSelectedNodeIds = selectedNodeIdsRef.current;

        // === 多节点拖动 ===
        if (currentSelectedNodeIds?.size > 1 && currentSelectedNodeIds.has(dragNodeId)) {
            // ⭐ 核心技巧：使用起始位置 + 总偏移量，而不是逐帧累加
            // 这避免了浮点数累积误差！
            if (!multiNodeDragStartPos.current) {
                const currentNodes = nodesRef.current;
                multiNodeDragStartPos.current = {
                    mouseX: clientX,  // 记录鼠标起始位置
                    mouseY: clientY,
                    // 记录每个节点的起始世界坐标
                    nodes: new Map(Array.from(currentSelectedNodeIds).map(nodeId => {
                        const node = currentNodes.find(n => n.id === nodeId);
                        return node ? [nodeId, { x: node.x, y: node.y }] : null;
                    }).filter(Boolean))
                };
            }

            // 计算从起始到当前的总偏移（世界坐标）
            const totalDeltaX = (clientX - multiNodeDragStartPos.current.mouseX) / safeZoom;
            const totalDeltaY = (clientY - multiNodeDragStartPos.current.mouseY) / safeZoom;

            // 每个节点 = 起始位置 + 总偏移
            const updates = Array.from(multiNodeDragStartPos.current.nodes.entries())
                .map(([nodeId, startPos]) => ({
                    nodeId,
                    updater: (node) => ({
                        ...node,
                        x: startPos.x + totalDeltaX,
                        y: startPos.y + totalDeltaY
                    })
                }));
            scheduleMultiNodeUpdate(updates);  // 批量更新
        } else {
            // 单节点：直接加增量
            scheduleNodeUpdate(dragNodeId, (node) => ({
                ...node,
                x: node.x + deltaX,
                y: node.y + deltaY
            }));
        }
    }
}, [isPanning, dragNodeId, view.zoom, ...]);
```

**节点更新 RAF 批处理** (App.jsx L10500-10560):

```javascript
// ⭐ 高性能节点更新机制
// 问题：拖动时每帧可能触发多次 setNodes，导致大量重渲染
// 解决：用 requestAnimationFrame 合并为单次更新

const nodeUpdateRef = useRef(null);     // 单节点待更新
const multiNodeUpdateRef = useRef(null); // 多节点待更新
const nodeUpdateRaf = useRef(null);      // RAF 句柄

const flushNodeUpdate = useCallback(() => {
    // 优先处理多节点更新
    if (multiNodeUpdateRef.current) {
        const updates = multiNodeUpdateRef.current;

        setNodes(prev => {
            // ⭐ 大量节点（50+）时用 Map 优化查找
            if (prev.length > 50 && updates.length > 10) {
                const nodeIndexMap = new Map();
                prev.forEach((node, idx) => nodeIndexMap.set(node.id, idx));

                const next = [...prev];
                let hasChanges = false;
                updates.forEach(({ nodeId, updater }) => {
                    const idx = nodeIndexMap.get(nodeId);
                    if (idx !== undefined) {
                        const updatedNode = updater(next[idx]);
                        if (updatedNode !== next[idx]) {
                            next[idx] = updatedNode;
                            hasChanges = true;
                        }
                    }
                });
                return hasChanges ? next : prev; // 无变化时返回原引用
            }
            // 少量节点用简单遍历
            // ...
        });
        multiNodeUpdateRef.current = null;
        return;
    }
    // 单节点更新
    if (nodeUpdateRef.current) {
        const { nodeId, updater } = nodeUpdateRef.current;
        setNodes(prev => {
            const idx = prev.findIndex(n => n.id === nodeId);
            if (idx === -1) return prev;
            const updatedNode = updater(prev[idx]);
            if (updatedNode === prev[idx]) return prev; // 引用相等 → 跳过
            const next = [...prev];
            next[idx] = updatedNode;
            return next;
        });
        nodeUpdateRef.current = null;
    }
}, []);

// 调度单节点更新
const scheduleNodeUpdate = useCallback((nodeId, updater) => {
    nodeUpdateRef.current = { nodeId, updater };
    if (!nodeUpdateRaf.current) {
        nodeUpdateRaf.current = requestAnimationFrame(flushNodeUpdate);
    }
}, [flushNodeUpdate]);

// 调度多节点更新（带合并）
const scheduleMultiNodeUpdate = useCallback((updates) => {
    // ⭐ 竞态处理：如果已有待处理更新，合并而不是覆盖
    if (multiNodeUpdateRef.current && nodeUpdateRaf.current) {
        const existingUpdates = multiNodeUpdateRef.current;
        const updateMap = new Map();
        existingUpdates.forEach(({ nodeId, updater }) => updateMap.set(nodeId, updater));
        updates.forEach(({ nodeId, updater }) => updateMap.set(nodeId, updater)); // 新值覆盖旧值
        multiNodeUpdateRef.current = Array.from(updateMap.entries())
            .map(([nodeId, updater]) => ({ nodeId, updater }));
    } else {
        multiNodeUpdateRef.current = updates;
    }
    if (!nodeUpdateRaf.current) {
        nodeUpdateRaf.current = requestAnimationFrame(flushNodeUpdate);
    }
}, [flushNodeUpdate]);
```

### 12.4 连接系统实现

**连接创建逻辑** (App.jsx L10970-11050):

```javascript
const handleNodeMouseUp = useCallback((targetId, e, inputType = 'default') => {
    e.stopPropagation();

    // 情况1：从输出端口拖到输入端口（正向连接）
    if (connectingSource && connectingSource !== targetId) {
        // 去重检查
        const exists = connections.some(c =>
            c.from === connectingSource &&
            c.to === targetId &&
            (c.inputType || 'default') === inputType
        );
        if (!exists) {
            // ⭐ 关键规则：非 default 输入点先删旧连接
            // 一个特定输入点只能接一条线（如 oref、sref）
            if (inputType !== 'default') {
                setConnections(prev => prev.filter(c =>
                    !(c.to === targetId && (c.inputType || 'default') === inputType)
                ));
            }
            setConnections(prev => [...prev, {
                id: `conn-${Date.now()}`,
                from: connectingSource,
                to: targetId,
                inputType: inputType !== 'default' ? inputType : undefined
            }]);
        }
    }

    // 情况2：从输入端口拖到输出端口（反向连接）
    else if (connectingTarget && connectingTarget !== targetId) {
        const actualInputType = connectingInputType || inputType;
        const exists = connections.some(c =>
            c.from === targetId &&
            c.to === connectingTarget &&
            (c.inputType || 'default') === actualInputType
        );
        if (!exists) {
            if (actualInputType !== 'default') {
                setConnections(prev => prev.filter(c =>
                    !(c.to === connectingTarget && (c.inputType || 'default') === actualInputType)
                ));
            }
            setConnections(prev => [...prev, {
                id: `conn-${Date.now()}`,
                from: targetId,
                to: connectingTarget,
                inputType: actualInputType !== 'default' ? actualInputType : undefined
            }]);
        }
    }

    // 清理连接状态
    setConnectingSource(null);
    setConnectingTarget(null);
    setConnectingInputType(null);
}, [connectingSource, connectingTarget, connectingInputType, connections]);
```

### 12.5 SVG 连接线渲染

**贝塞尔曲线绘制** (App.jsx L25904-26197):

```javascript
const ConnectionLayer = memo(({ connections, nodesMap, connectionsByNode, selectedNodeId, ... }) => {
    // ⭐ 连接线虚拟化：只渲染可见节点的连接线
    const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);
    const visibleConnections = useMemo(() =>
        connections.filter(conn => visibleNodeIds.has(conn.from) || visibleNodeIds.has(conn.to)),
        [connections, visibleNodeIds]
    );

    return (
        <svg className="absolute inset-0 overflow-visible pointer-events-none">
            {visibleConnections.map(conn => {
                const fromNode = nodesMap.get(conn.from);  // O(1) 查找
                const toNode = nodesMap.get(conn.to);
                if (!fromNode || !toNode) return null;

                // 透明度：与选中节点相关的高亮，其他半透明
                const isRelated = selectedNodeId &&
                    (fromNode.id === selectedNodeId || toNode.id === selectedNodeId);
                const opacity = isRelated ? 1 : 0.35;

                // 连接线起点：源节点右侧中央
                const startX = fromNode.x + fromNode.width - 4;
                const startY = fromNode.y + fromNode.height / 2;

                // 连接线终点：目标节点左侧中央
                const endX = toNode.x + 4;
                let endY = toNode.y + toNode.height / 2;

                // ⭐ 特殊输入点位置计算
                // image-compare 节点有两个输入点（上1/3 和 下2/3）
                if (toNode.type === 'image-compare') {
                    const relevantConns = connectionsByNode.to.get(toNode.id) || [];
                    const idx = relevantConns.findIndex(c => c.id === conn.id);
                    if (idx === 0) endY = toNode.y + toNode.height * 0.33;
                    else if (idx >= 1) endY = toNode.y + toNode.height * 0.66;
                }

                // Midjourney 节点的 oref/sref 特殊输入点（精确像素偏移）
                if (toNode.type === 'gen-image' && conn.inputType === 'oref') {
                    const baseOffset = 12 + 16 + 8 + 60 + 8 + 100 + 8; // padding + title + ref + prompt
                    endY = toNode.y + baseOffset + 8; // oref 位置
                }

                // ⭐ 贝塞尔曲线控制点计算
                const dist = Math.abs(endX - startX);
                const cp1X = startX + dist * 0.5;  // 控制点1：水平中间偏右
                const cp2X = endX - dist * 0.5;    // 控制点2：水平中间偏左
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                return (
                    <g key={conn.id} style={{ opacity }}>
                        {/* 双层线条：深色底 + 浅色面 → 视觉立体感 */}
                        <path d={`M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`}
                              stroke="#18181b" strokeWidth="4" fill="none" />
                        <path d={`M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`}
                              stroke="#71717a" strokeWidth="2" fill="none" />
                        {/* 端点圆点 */}
                        <circle cx={startX} cy={startY} r="2" fill="#71717a" />
                        <circle cx={endX} cy={endY} r="2" fill="#71717a" />
                        {/* 中点删除按钮 */}
                        <g onClick={() => onDisconnectConnection(conn.id)}>
                            <circle cx={midX} cy={midY} r="25" fill="transparent" /> {/* 热区 */}
                            <circle cx={midX} cy={midY} r="8" fill="#ef4444" />       {/* 视觉 */}
                        </g>
                    </g>
                );
            })}

            {/* 正在拖拽的连接线（虚线） */}
            {connectingSource && (() => {
                const node = nodesMap.get(connectingSource);
                if (!node) return null;
                return <path
                    d={`M ${node.x + node.width - 4} ${node.y + node.height / 2}
                        C ${node.x + node.width + 100} ${node.y + node.height / 2},
                          ${mousePos.x - 100} ${mousePos.y},
                          ${mousePos.x} ${mousePos.y}`}
                    stroke="#60a5fa" strokeWidth="2" fill="none"
                    strokeDasharray="4,4"   // 虚线表示"未完成的连接"
                />;
            })()}
        </svg>
    );
// ⭐ 自定义 memo 比较函数，避免不必要的重渲染
}, (prevProps, nextProps) => {
    return (
        prevProps.connections === nextProps.connections &&
        prevProps.visibleNodes === nextProps.visibleNodes &&
        prevProps.selectedNodeId === nextProps.selectedNodeId &&
        prevProps.connectingSource === nextProps.connectingSource &&
        prevProps.mousePos.x === nextProps.mousePos.x &&
        prevProps.mousePos.y === nextProps.mousePos.y
    );
});
```

### 12.6 视口裁剪优化（虚拟化）

**只渲染可见节点** (App.jsx L9657-9700):

```javascript
const visibleNodes = useMemo(() => {
    if (!canvasRef.current) return nodes;
    const rect = canvasRef.current.getBoundingClientRect();
    const padding = 200; // 额外渲染区域，防止边缘闪烁
    const currentView = viewRef.current;

    // 计算视口在世界坐标系中的范围
    const viewportLeft = (-currentView.x - padding) / currentView.zoom;
    const viewportRight = (rect.width - currentView.x + padding) / currentView.zoom;
    const viewportTop = (-currentView.y - padding) / currentView.zoom;
    const viewportBottom = (rect.height - currentView.y + padding) / currentView.zoom;

    // AABB 碰撞检测：节点矩形是否与视口相交
    return nodes.filter(node => {
        const nodeRight = node.x + (node.width || 0);
        const nodeBottom = node.y + (node.height || 0);
        return node.x < viewportRight && nodeRight > viewportLeft &&
               node.y < viewportBottom && nodeBottom > viewportTop;
    });
}, [nodes, view.x, view.y, view.zoom]);
```

### 12.7 撤销/重做系统

```javascript
// App.jsx L4948-4960
const [maxUndoSteps] = useState(5);   // 可配置步数
const [undoStack, setUndoStack] = useState([]);     // { nodes, connections }[]
const [redoStack, setRedoStack] = useState([]);
const isUndoRedoRef = useRef(false);  // 防止 undo 操作本身被记录

const saveToUndoStack = useCallback(() => {
    if (isUndoRedoRef.current) return;  // ← 关键守卫
    setUndoStack(prev => {
        const snapshot = { nodes: nodesRef.current, connections: connectionsRef.current };
        const next = [snapshot, ...prev];
        return next.slice(0, maxUndoSteps);  // 限制栈深度
    });
    setRedoStack([]);  // 新操作清空 redo 栈
}, [maxUndoSteps]);

const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    isUndoRedoRef.current = true;  // 标记，防止触发 saveToUndoStack
    const [snapshot, ...rest] = undoStack;
    setRedoStack(prev => [{ nodes, connections }, ...prev]);  // 当前状态入 redo
    setNodes(snapshot.nodes);
    setConnections(snapshot.connections);
    setUndoStack(rest);
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
}, [undoStack, nodes, connections]);
```

### 12.8 节点系统开发者 Checklist

| # | 要点 | 本项目实现 | 建议改进 |
|---|------|-----------|---------|
| 1 | 坐标系统 | screen ↔ world 双向转换 | 封装为 `useCoordinateSystem` Hook |
| 2 | 拖拽节流 | RAF + 累积 delta | 正确做法，无需改进 |
| 3 | 多节点拖动精度 | 起始位置+总偏移量（非逐帧累加） | 正确做法，避免累积误差 |
| 4 | 连接去重 | 创建前检查 `connections.some()` | 可用 Set 加速 |
| 5 | 输入点约束 | 特定 inputType 只允许一条连接 | 正确的业务规则 |
| 6 | 视口裁剪 | AABB 碰撞检测 + padding | 可引入空间哈希进一步优化 |
| 7 | 连接线渲染 | 三次贝塞尔曲线 + 双层描边 | 可考虑 WebGL 加速 |
| 8 | 撤销系统 | 快照栈 + isUndoRedoRef 守卫 | 可改用 Command 模式减少内存 |
| 9 | 闭包陷阱 | Ref 同步最新状态 | 用 Zustand 可避免此问题 |
| 10 | 全局事件监听 | `pointermove/pointerup` | 正确，支持触摸 |

---

## 十三、深度专题：API 调用体系完整实现

> 本章提供从 "用户点击生成" 到 "结果显示在画布" 的完整调用链代码参考。

### 13.1 调用链全景

```
用户点击"生成" → startGeneration()
    │
    ├── 1. 源图解析 (IndexedDB/URL/Base64)
    ├── 2. 蒙版处理 (当前节点/上游节点)
    ├── 3. 模型配置解析 (getApiConfigByKey)
    ├── 4. Provider 凭据获取 (getApiCredentials)
    ├── 5. 多Key负载均衡 + 黑名单过滤
    ├── 6. 批量模式判断 (standard_batch / parallel_aggregate)
    │
    ├── [图像] ─→ callImageAPI() ─→ 直接返回URL
    │                   │
    │                   └─→ 带 asyncConfig → pollAsyncTask() → 轮询直到完成
    │
    ├── [视频] ─→ callVideoAPI() ─→ 通常需要异步轮询
    │
    └── [聊天] ─→ OpenAI SDK stream → 逐块更新
```

### 13.2 API 凭据获取

```javascript
// 统一凭据获取（只从 Provider 获取）
const getApiCredentials = useCallback((modelId) => {
    const config = getApiConfigByKey(modelId);
    const providerKey = config?.provider;
    const provider = providers[providerKey] || {};

    return {
        key: provider.key || '',        // API Key
        url: provider.url || DEFAULT_BASE_URL,  // Base URL
        apiType: provider.apiType || 'openai',  // API 类型
        useProxy: !!provider.useProxy,  // 是否使用代理
        forceAsync: !!provider.forceAsync,  // 是否强制异步
        provider: providerKey || 'unknown'
    };
}, [providers, getApiConfigByKey]);
```

### 13.3 多 Key 负载均衡完整代码

```javascript
// App.jsx L16250-16290 — startGeneration 内部

let apiKey = apiKeyRaw;
if (apiKeyRaw && apiKeyRaw.includes(',')) {
    // 步骤1：分割为数组
    const allKeys = apiKeyRaw.split(',').map(k => k.trim()).filter(k => k);

    // 步骤2：用 Ref 获取最新黑名单（⭐ 避免闭包陷阱！）
    const currentBlacklist = apiBlacklistRef.current || {};

    // 步骤3：过滤被拉黑的 key
    const availableKeys = allKeys.filter(k => !currentBlacklist[k]);

    if (availableKeys.length > 0) {
        // 步骤4：随机选择一个可用 key
        apiKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    } else if (allKeys.length > 0) {
        // 步骤5：全部被拉黑 → 降级到随机选择
        apiKey = allKeys[Math.floor(Math.random() * allKeys.length)];
        console.warn(`All ${allKeys.length} keys are blacklisted, using random selection`);
    }
}

// 同样支持多 baseUrl 负载均衡
let baseUrl = baseUrlRaw;
if (baseUrlRaw.includes(',')) {
    const urls = baseUrlRaw.split(',').map(u => u.trim()).filter(u => u);
    if (urls.length > 0) {
        baseUrl = urls[Math.floor(Math.random() * urls.length)];
    }
}
```

### 13.4 三级容错机制完整实现

```javascript
// === 第1级：暂停列表 (TTL 60分钟) ===
// App.jsx L5608-5642

const [apiSuspendList, setApiSuspendList] = useState(() => {
    try {
        const saved = localStorage.getItem('tapnow_api_suspend');
        if (!saved) return {};
        const parsed = JSON.parse(saved);
        const now = Date.now();
        // ⭐ TTL 清理：丢弃超过 60 分钟的条目
        return Object.fromEntries(
            Object.entries(parsed).filter(([, v]) => now - v.timestamp < 60 * 60 * 1000)
        );
    } catch (e) { return {}; }
});

const addToSuspendList = useCallback((key, reason, ttlMs = 60 * 60 * 1000) => {
    setApiSuspendList(prev => ({
        ...prev,
        [key]: { reason, timestamp: Date.now(), ttlMs }
    }));
}, []);

// === 第2级：黑名单 (日重置) ===
// App.jsx L5557-5577

const [apiBlacklist, setApiBlacklist] = useState(() => {
    try {
        const saved = localStorage.getItem('tapnow_api_blacklist');
        if (!saved) return {};
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        // ⭐ 次日自动清空
        if (parsed.date !== today) return {};
        return parsed.blacklist || {};
    } catch (e) { return {}; }
});

const addToBlacklist = useCallback((key, reason) => {
    setApiBlacklist(prev => {
        const next = { ...prev, [key]: { reason, time: Date.now() } };
        localStorage.setItem('tapnow_api_blacklist', JSON.stringify({
            date: new Date().toDateString(),
            blacklist: next
        }));
        return next;
    });
}, []);

// === 第3级：熔断器 (滑动窗口) ===
// App.jsx L5644-5660

const error1006WindowRef = useRef([]);          // 时间戳数组
const CIRCUIT_BREAKER_WINDOW_MS = 2 * 60 * 1000; // 2 分钟窗口
const CIRCUIT_BREAKER_THRESHOLD = 10;             // 10 次触发

const record1006Error = useCallback(() => {
    error1006WindowRef.current.push(Date.now());
}, []);

const checkCircuitBreaker = useCallback(() => {
    const now = Date.now();
    // ⭐ 滑动窗口：只保留 2 分钟内的记录
    const recentErrors = error1006WindowRef.current.filter(t => now - t < CIRCUIT_BREAKER_WINDOW_MS);
    error1006WindowRef.current = recentErrors;
    return recentErrors.length >= CIRCUIT_BREAKER_THRESHOLD;
}, []);
```

### 13.5 错误分类处理（图像 API）

```javascript
// App.jsx L17500-17600 — 图像 API 错误处理核心代码

// ❌ 致命错误：参数错误 (1000) → 立即终止
if (isJimeng && (realErrorCode === 1000 || data?.message?.includes('invalid parameter'))) {
    throw new Error(`参数错误: ${data.message} (错误码 1000)`);
    // 注意：throw 后不会进入下面的 continue，直接终止整个生成流程
}

// ⏳ 可恢复错误：登录失效 (34010105) → 暂停60分钟，换下一个 Key
if (isJimeng && (realErrorCode === 34010105 || data?.message?.includes('34010105'))) {
    addToSuspendList(combo.key, '登录失效 (34010105)', 60 * 60 * 1000);
    lastError = new Error(`登录失效: 请刷新 session`);
    continue;  // ⭐ 跳到下一个 Key 重试
}

// 🚫 永久错误：积分耗尽 (1006) → 黑名单 + 检查熔断
if (isJimeng && realErrorCode === 1006) {
    record1006Error();                     // 记录到熔断窗口
    if (checkCircuitBreaker()) {           // 检查是否触发熔断
        throw new Error('⚡ 熔断保护: 短时间内多个账号积分耗尽');
    }
    addToBlacklist(combo.key, '积分耗尽 (1006)');  // 今日不再使用
    lastError = new Error(`积分耗尽: ${data.message}`);
    continue;  // ⭐ 换下一个 Key
}

// 📊 节流信号检测（用于统计显示）
const detectThrottleSignalsFromError = (message) => {
    if (!message || typeof message !== 'string')
        return { http429Count: 0, timeoutCount: 0 };
    return {
        http429Count: (message.includes('429') || message.includes('Too Many Requests')) ? 1 : 0,
        timeoutCount: (message.includes('timeout') || message.includes('timed out')) ? 1 : 0
    };
};
```

### 13.6 异步轮询完整实现

```javascript
// App.jsx L15261-15400

const pollAsyncTask = (taskId, requestId, asyncConfig, baseVars, w, h, sourceNodeId, providerKey, attempt = 0) => {
    const maxAttempts = asyncConfig?.maxAttempts || 300;
    const delayMs = asyncConfig?.pollIntervalMs || 3000;

    // 步骤1：超时检查
    if (attempt > maxAttempts) {
        setHistory(prev => prev.map(hItem => {
            if (hItem.id !== taskId) return hItem;
            return { ...hItem, status: 'failed', errorMsg: '异步任务轮询超时' };
        }));
        return;
    }

    // 步骤2：构建状态查询请求（模板变量替换）
    const vars = { ...baseVars, requestId };
    const statusReq = buildAsyncRequest(asyncConfig.statusRequest, vars, providerKey);

    // 步骤3：发起轮询
    fetch(statusReq.url, {
        method: statusReq.method,
        headers: statusReq.headers,
        body: statusReq.body
    })
    .then(async (resp) => {
        // 步骤4：认证错误 → 立即失败
        if (resp.status === 401 || resp.status === 402 || resp.status === 403) {
            setHistory(prev => prev.map(hItem => {
                if (hItem.id !== taskId) return hItem;
                return { ...hItem, status: 'failed', errorMsg: `认证失败 (${resp.status})` };
            }));
            return;
        }

        // 步骤5：解析状态
        const text = await resp.text();
        const statusData = JSON.parse(text);
        const statusValue = normalizeAsyncStatusValue(
            getValueByPath(statusData, asyncConfig.statusPath)  // 如 "data.status"
        );

        // 步骤6：判断结果
        const isCompleted = asyncConfig.successValues.includes(statusValue);
        const isFailed = asyncConfig.failureValues.includes(statusValue);

        if (isFailed) {
            const errorMsg = getValueByPath(statusData, asyncConfig.errorPath) || '任务失败';
            setHistory(prev => prev.map(hItem => {
                if (hItem.id !== taskId) return hItem;
                return { ...hItem, status: 'failed', errorMsg };
            }));
            return;
        }

        if (isCompleted) {
            // 步骤7：获取最终结果
            if (asyncConfig.outputsRequest?.endpoint) {
                const outputsReq = buildAsyncRequest(asyncConfig.outputsRequest, vars, providerKey);
                const outputsResp = await fetch(outputsReq.url, {
                    method: outputsReq.method,
                    headers: outputsReq.headers
                });
                const outputsData = await outputsResp.json();
                const outputsArr = getValueByPath(outputsData, asyncConfig.outputsPath);

                // 提取结果 URL
                const resultUrls = Array.isArray(outputsArr)
                    ? outputsArr.map(item => item[asyncConfig.outputsUrlField] || item.url || '').filter(Boolean)
                    : [];

                // 更新历史记录
                setHistory(prev => prev.map(hItem => {
                    if (hItem.id !== taskId) return hItem;
                    return {
                        ...hItem,
                        status: 'completed',
                        url: resultUrls[0] || '',
                        durationMs: Date.now() - (hItem.startTime || Date.now())
                    };
                }));
            }
            return;
        }

        // 步骤8：仍在处理中 → 更新进度，延迟后重试
        setHistory(prev => prev.map(hItem => {
            if (hItem.id !== taskId) return hItem;
            const progress = Math.min(90, 5 + (attempt / maxAttempts) * 85);
            return { ...hItem, progress };
        }));

        setTimeout(() => {
            pollAsyncTask(taskId, requestId, asyncConfig, baseVars, w, h, sourceNodeId, providerKey, attempt + 1);
        }, delayMs);
    })
    .catch((err) => {
        // JSON 解析失败等错误 → 自动重试
        console.warn('[Async Task] 状态响应解析失败，重新轮询');
        setTimeout(() => {
            pollAsyncTask(taskId, requestId, asyncConfig, baseVars, w, h, sourceNodeId, providerKey, attempt + 1);
        }, delayMs);
    });
};
```

### 13.7 模板变量替换引擎

```javascript
// 请求模板支持的变量列表和替换逻辑（简化版）

const TEMPLATE_VARIABLES = {
    '{{provider.key}}':   '当前供应商 API Key',
    '{{provider.url}}':   '供应商 Base URL',
    '{{model}}':          '模型 ID',
    '{{prompt}}':         '用户提示词',
    '{{width}}':          '输出宽度',
    '{{height}}':         '输出高度',
    '{{imageUrl1}}':      '第1张参考图 URL',
    '{{imageUrl2}}':      '第2张参考图 URL',
    '{{requestId}}':      '异步任务 ID',
    '{{ratio}}':          '输出比例',
    '{{duration}}':       '视频时长'
};

// 替换引擎核心
const resolveTemplateVars = (template, vars) => {
    if (typeof template !== 'string') return template;
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        // 支持点号路径，如 {{provider.key}}
        const value = getValueByPath(vars, path);
        return value !== undefined ? String(value) : match;
    });
};

// JSON 对象深度替换
const resolveTemplateObject = (obj, vars) => {
    if (typeof obj === 'string') return resolveTemplateVars(obj, vars);
    if (Array.isArray(obj)) return obj.map(item => resolveTemplateObject(item, vars));
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = resolveTemplateObject(value, vars);
        }
        return result;
    }
    return obj;
};
```

### 13.8 聊天 API 流式调用

```javascript
// App.jsx L12420-12500 — 聊天消息发送核心代码

const sendChatMessage = async () => {
    const openai = new OpenAI({
        apiKey: chatApiKey,
        baseURL: chatBaseUrl + '/v1',
        dangerouslyAllowBrowser: true // ⚠️ 仅限本地/私有场景
    });

    // 构建消息历史（保持上下文）
    const formattedMessages = currentSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    try {
        // ⭐ 流式调用
        const stream = await openai.chat.completions.create({
            model: chatModel,
            messages: formattedMessages,
            stream: true
        });

        let accumulatedContent = '';

        // 逐块读取
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            accumulatedContent += content;

            // 实时更新 UI（每个 chunk 都更新一次）
            setChatSessions(prev => prev.map(session => {
                if (session.id !== currentSessionId) return session;
                return {
                    ...session,
                    messages: session.messages.map(msg => {
                        if (msg.id !== assistantMessageId) return msg;
                        return { ...msg, content: accumulatedContent };
                    })
                };
            }));
        }

        // 完成后标记状态
        setChatSessions(prev => prev.map(session => {
            if (session.id !== currentSessionId) return session;
            return {
                ...session,
                messages: session.messages.map(msg => {
                    if (msg.id !== assistantMessageId) return msg;
                    return { ...msg, isStreaming: false };
                })
            };
        }));
    } catch (error) {
        // 错误处理：更新消息为错误状态
        setChatSessions(prev => prev.map(session => {
            if (session.id !== currentSessionId) return session;
            return {
                ...session,
                messages: session.messages.map(msg => {
                    if (msg.id !== assistantMessageId) return msg;
                    return { ...msg, content: `Error: ${error.message}`, isError: true, isStreaming: false };
                })
            };
        }));
    }
};
```

### 13.9 API 调用开发者 Checklist

| # | 要点 | 本项目实现 | 你的项目建议 |
|---|------|-----------|-------------|
| 1 | **统一入口** | `startGeneration()` 一个函数处理所有类型 | 建议保持统一入口，内部按 type 分发 |
| 2 | **凭据隔离** | `getApiCredentials()` 统一获取 | 不要把 Key 散落各处 |
| 3 | **多 Key 轮换** | 逗号分隔 + 随机选择 + 黑名单过滤 | 直接复用此模式 |
| 4 | **错误分级** | 致命/可恢复/永久 三级分类 | 必须分级，不要只 catch |
| 5 | **熔断保护** | 滑动窗口计数器 | 防止无限消耗 |
| 6 | **异步轮询** | 配置化模板 + 通用 poller | 抽成独立模块 |
| 7 | **超时控制** | 图片 60s / 视频 300s | 必须设超时，避免永久等待 |
| 8 | **重试策略** | `continue` 换 Key 重试 | 区分可重试和不可重试 |
| 9 | **结果解析** | 多路径提取 URL | 适配不同 API 的响应格式 |
| 10 | **流式输出** | `for await of` + 逐块更新 | OpenAI SDK 标准做法 |
| 11 | **代理模式** | 本地 `/proxy` 绕 CORS | 生产环境需要后端代理 |
| 12 | **模板引擎** | `{{var}}` 替换 | 支持新 API 只需写模板 |

---

> **文档版本**: v2.0 | **生成日期**: 2026-03-19  
> **适用版本**: Tapnow Studio v3.8.8-rc7
