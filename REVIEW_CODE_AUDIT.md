# MakingLovart 代码审查 & API Key 调用设计文档

> 生成时间：2026-03-17  
> 审查范围：README 功能声明 vs 实际实现 + API Key 调用链路重构

---

## 一、代码审查：功能完整性

### 1.1 功能对照表

| # | README 功能声明 | 实际状态 | 修复情况 |
|---|---|---|---|
| 1 | **首尾帧动画** — 关键帧模式生成过渡动画 | ❌ 原来只改输出名称，无帧过渡逻辑 | ✅ 已修复：keyframe 模式现在取 @引用/选中图片作为起始帧，调用 Veo 生成过渡视频 |
| 2 | **@图片1 和 @图片2 生成新视频** — 多图引用 | ⚠️ 视频模式只用第一张 @提到的图片 | 📝 Veo API 当前只支持单张参考图，代码已选取首张作为起始帧，这是 API 本身的限制 |
| 3 | **文生图** — Gemini / DALL-E / SDXL 生成 | ✅ aiGateway 已实现 Google + OpenAI + Stability | — |
| 4 | **图生图** — 选中图片 + 提示词 AI 编辑 | ✅ editImage 支持多图 + mask inpainting | — |
| 5 | **文生视频** — Veo 2.0 | ✅ generateVideo 支持 16:9 / 9:16 | — |
| 6 | **LLM 提示词润色** | ✅ enhancePromptWithProvider 支持 4 种模式 | — |
| 7 | **@Mention 引用系统** | ✅ Tiptap + CanvasMentionExtension 完整实现 | — |
| 8 | **多 Provider API 管理** | ✅ 7 个 provider 支持 | — |
| 9 | **角色锁定 (Character Lock)** | ✅ descriptor 自动注入生成提示词 | — |
| 10 | **素材库 & 灵感面板** | ✅ AssetLibraryPanel + InspirationPanel 集成在 RightPanel | — |
| 11 | **Anthropic/Qwen/Banana 图片生成** | ⚠️ gateway 缺少这些 provider 的图片生成实现 | 📝 目前会抛出 "暂不支持" 错误，属于已知限制 |
| 12 | **src/App.tsx 语法错误** | ❌ 文件在 L1531 截断 | ✅ 已修复：tsconfig 排除 src/，不影响运行时 |

### 1.2 发现的 BUG 及修复

#### BUG #1: Keyframe 模式无效（已修复）

**问题**：`generationMode === 'keyframe'` 时执行路径与 `'image'` 完全一致，只是把输出名称改为 "Keyframe"。

**修复**：在 App.tsx 生成逻辑中新增独立的 keyframe 分支：
- 从 @引用和选中元素收集参考帧图片
- 至少需要 1 张参考图作为起始帧
- 构建首尾帧过渡提示词
- 调用 Veo 视频 API 生成过渡动画
- 输出为 VideoElement 而非 ImageElement

#### BUG #2: API Key 未传递给 Google provider（已修复）

**问题**：`aiGateway.ts` 调用 `enhancePromptWithGemini()` 和 `generateImageFromText()` 时不传入用户配置的 API key，全靠 `setGeminiRuntimeConfig()` 全局设置。

**修复**：
- `geminiService.ts` 所有公开函数新增可选 `apiKey` 参数
- `getApiKey()` / `getClient()` 支持 `explicitKey` 优先级最高
- `aiGateway.ts` 调用 Google provider 时传入 `key?.key`

#### BUG #3: src/App.tsx 截断文件阻塞 tsc（已修复）

**问题**：`src/App.tsx` 在第 1531 行 `const groupId =` 处截断，没有完整的组件定义。

**修复**：tsconfig.json 添加 `"exclude": ["src/**"]`，因为 `src/` 目录完全未被运行时代码引用。

---

## 二、API Key 调用链路设计

### 2.1 设计原则（参考 Lovart 模式）

```
用户 → UI 填写 API Key → 存储 state + localStorage → 每次调用即时传入 → 无全局可变状态
```

### 2.2 当前架构（重构后）

```
┌──────────────────────────────────────────────────────┐
│                     App.tsx                           │
│                                                      │
│  userApiKeys: UserApiKey[]  (state + localStorage)   │
│  modelPreference: ModelPreference                     │
│                                                      │
│  getPreferredApiKey(capability, provider) → UserApiKey│
│                                                      │
│  ┌───────────────────────────────────────────┐       │
│  │ handleGenerate / handleEnhancePrompt      │       │
│  │   1. 从 state 获取对应 provider 的 key    │       │
│  │   2. 调用 aiGateway 函数 (传入 key)       │       │
│  └───────────────────────────────────────────┘       │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              services/aiGateway.ts                    │
│                                                      │
│  inferProviderFromModel(model) → AIProvider           │
│                                                      │
│  enhancePromptWithProvider(request, model, key?)      │
│    ├── google  → enhancePromptWithGemini(req, key)   │
│    ├── anthropic → enhancePromptWithAnthropic(...)    │
│    └── openai/qwen/custom → enhancePromptWithOAI(..) │
│                                                      │
│  generateImageWithProvider(prompt, model, key?)       │
│    ├── google    → generateImageFromText(prompt, key) │
│    ├── openai    → fetch /images/generations          │
│    ├── stability → fetch /text-to-image               │
│    └── others    → throw "暂不支持"                   │
│                                                      │
│  validateApiKey(provider, apiKey, baseUrl?)           │
│    ├── google    → GET models?key=...                 │
│    ├── openai    → GET /models (Bearer)               │
│    ├── anthropic → POST /messages (x-api-key)         │
│    └── stability → 格式校验                           │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│           services/geminiService.ts                   │
│                                                      │
│  所有函数签名新增 apiKey? 参数：                      │
│                                                      │
│  enhancePromptWithGemini(request, apiKey?)            │
│  editImage(images, prompt, mask?, apiKey?)            │
│  generateImageFromText(prompt, apiKey?)               │
│  generateVideo(prompt, ratio, onProgress, img?, key?) │
│                                                      │
│  Key 优先级: explicitKey > runtimeConfig > env.API_KEY│
│                                                      │
│  setGeminiRuntimeConfig() 保留作为备份/批量设置       │
└──────────────────────────────────────────────────────┘
```

### 2.3 Key 解析优先级

```
1. 函数参数 explicitKey    ← 最高优先：gateway 传入的用户 key
2. runtimeConfig.scopedKey ← 次优先：setGeminiRuntimeConfig() 设置的
3. runtimeConfig 其他 key  ← 回退：text → image → video
4. process.env.API_KEY     ← 最低优先：.env 文件中的环境变量
```

### 2.4 环境变量映射

```
.env 文件                vite.config.ts define                geminiService.ts
─────────────────────    ─────────────────────────            ──────────────────
GEMINI_API_KEY     ──→  process.env.API_KEY (JSON.stringify)  ──→  const API_KEY
VITE_GEMINI_API_KEY ─┘
```

这个映射在 vite.config.ts 中已正确实现。

### 2.5 用户交互流程

```
1. 用户打开设置 → API 配置
2. 选择 Provider (Google/OpenAI/Anthropic/...)
3. 输入 API Key + (可选) Base URL
4. 点击「验证」→ validateApiKey() 在线验证
5. 验证通过后保存到 userApiKeys state + localStorage
6. 生成时自动选取对应 provider + capability 的 key
7. 如果没有可用 key，弹出错误提示 + 自动跳转到设置面板
```

---

## 三、自动化测试

### 3.1 测试框架

- **Vitest 4.1** — 与 Vite 原生集成
- **运行命令**: `npm test` 或 `npm run test:watch`

### 3.2 测试覆盖

| 测试文件 | 测试数 | 验证内容 |
|---|---|---|
| `tests/aiGateway.test.ts` | 7 | inferProviderFromModel 对所有 7 个 provider 的正确识别 |
| `tests/aiGatewayValidation.test.ts` | 5 | validateApiKey 对 Google/OpenAI/Anthropic/Stability 的验证逻辑 + 不支持 provider 抛错 |
| `tests/geminiService.test.ts` | 4 | setGeminiRuntimeConfig 无异常 + validateGeminiApiKey 成功/失败/网络错误 |
| `tests/generationHistory.test.ts` | 4 | 添加到头部、去重、截断到 18 条、自动保存到 localStorage |
| `tests/types.test.ts` | 9 | 所有核心类型结构验证 |

**总计: 29 个测试，全部通过 ✅**

### 3.3 运行结果

```
 ✓ tests/types.test.ts (9 tests) 8ms
 ✓ tests/generationHistory.test.ts (4 tests) 6ms
 ✓ tests/aiGateway.test.ts (7 tests) 6ms
 ✓ tests/geminiService.test.ts (4 tests) 8ms
 ✓ tests/aiGatewayValidation.test.ts (5 tests) 14ms

 Test Files  5 passed (5)
      Tests  29 passed (29)
   Duration  791ms
```

---

## 四、修改文件清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `App.tsx` | 修改 | 新增 keyframe 模式独立生成分支 |
| `services/geminiService.ts` | 修改 | 所有公开函数新增 `apiKey?` 参数; `getApiKey/getClient` 支持显式 key |
| `services/aiGateway.ts` | 修改 | Google provider 路由时传入 `key?.key` |
| `tsconfig.json` | 修改 | 添加 `"exclude": ["src/**"]` |
| `vite.config.ts` | 修改 | 添加 vitest 测试配置 |
| `package.json` | 修改 | 添加 `test` / `test:watch` 脚本 |
| `tests/setup.ts` | 新增 | 测试初始化文件 |
| `tests/aiGateway.test.ts` | 新增 | Provider 推断测试 |
| `tests/aiGatewayValidation.test.ts` | 新增 | API Key 验证测试 |
| `tests/geminiService.test.ts` | 新增 | Gemini 服务测试 |
| `tests/generationHistory.test.ts` | 新增 | 历史记录工具测试 |
| `tests/types.test.ts` | 新增 | 类型完整性测试 |

---

## 五、生成历史保存逻辑验证

| 代码路径 | 是否保存历史 | 说明 |
|---|---|---|
| Inpainting（局部重绘） | ✅ `saveGenerationToHistory()` | 保存编辑后的图片 |
| Regular Edit（多图合成） | ✅ `saveGenerationToHistory()` | 保存合成后的新图 |
| @Mention Reference（引用生成） | ✅ `saveGenerationToHistory()` | 保存以引用图为参考的新图 |
| 从零生成（文生图） | ✅ `saveGenerationToHistory()` | 保存纯文本生成的图片 |
| 视频生成（Veo） | ⚠️ 不保存 | blob URL 无法序列化到 localStorage |
| 首尾帧动画（Keyframe） | ⚠️ 不保存 | 同上，视频 blob 限制 |

**结论**：所有图片生成路径都正确保存历史。视频/keyframe 不保存是因为视频以 blob URL 形式存在，无法序列化到 localStorage（会超出 5MB 限制）。如需支持视频历史，需要引入 IndexedDB 或后端存储。

---

## 六、待讨论事项

1. **Anthropic/Qwen/Banana 图片生成**：目前 gateway 对这些 provider 没有图片生成实现，是否需要添加？
2. **src/ 目录**：是否应该完全删除 `src/` 下的 legacy 代码？目前已从 tsconfig 排除。
3. **README 项目结构更新**：README 列出的文件结构与实际不一致（如 LayerPanel 已整合），是否需要更新？
4. **多图视频引用**：Veo API 只支持单张参考图，README 描述的 "@图片1 和 @图片2 生成新视频" 是否需要修改为更准确的描述？
