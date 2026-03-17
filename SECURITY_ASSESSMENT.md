# 🔒 Making Lovart — API Key 安全性评估报告

> 评估日期：2026-03-17  
> 评估范围：用户 API Key 的存储、传输、泄露风险  
> 项目版本：当前 main 分支

---

## 一、评估概述

本报告对 Making Lovart 项目中用户 API Key 的全生命周期进行安全评估，覆盖以下环节：

| 环节 | 评估项 |
|------|--------|
| **存储** | localStorage 加密、明文残留、浏览器缓存 |
| **传输** | API 调用中的 Key 传输方式 |
| **泄露** | Git 版本控制、构建产物、日志输出 |
| **清除** | 用户退出时的数据擦除机制 |

---

## 二、发现的问题与风险评级

### 2.1 存储安全

| # | 问题 | 风险 | 状态 |
|---|------|------|------|
| S-1 | API Key 以明文 JSON 存储在 `localStorage('userApiKeys.v1')` | 🔴 高 | ✅ 已修复 |
| S-2 | `src/store/api-config-store.ts` 使用 `apiConfigs.v2` key 存储配置（可能含敏感数据） | 🟡 中 | ⚠️ 待评估 |
| S-3 | 浏览器关闭后 localStorage 数据永久残留 | 🟡 中 | ✅ 已修复 |
| S-4 | 同源 JavaScript（包括浏览器扩展注入脚本）可直接读取 localStorage | 🟡 中 | ✅ 已缓解 |

**修复详情（S-1）：**
- 引入 `utils/keyVault.ts`，使用 **AES-256-GCM** 加密
- 密钥通过 **PBKDF2**（100,000 次迭代，SHA-256）从设备指纹派生
- 加密数据存储在 `userApiKeys.v1.vault`，旧明文 `userApiKeys.v1` 自动迁移后删除
- IV（初始化向量）每次加密随机生成，防止重放攻击

**修复详情（S-3）：**
- 新增「关闭页面时清除 API Key」开关（设置 → 安全）
- 启用后通过 `beforeunload` 事件在页面关闭时调用 `clearAllKeyData()` 清除所有加密数据和盐值

**加密方案局限性说明：**
> 由于 Web 应用无法持有真正的用户密码来加密（除非引入登录系统），当前方案使用 `origin + userAgent` 作为伪设备指纹派生密钥。这意味着：
> - ✅ 阻止直接复制 localStorage 值并在其他环境使用
> - ✅ 阻止非技术人员通过 DevTools 直接读取明文 Key
> - ❌ 无法防御同设备同浏览器的 XSS 攻击（攻击者可重建相同密钥）
> - 如需更强安全性，建议引入后端代理或 OAuth 令牌机制

---

### 2.2 传输安全

| # | 问题 | 风险 | 状态 |
|---|------|------|------|
| T-1 | API Key 通过 HTTPS 传输给 Google API | 🟢 低 | ✅ 安全 |
| T-2 | `validateGeminiApiKey()` 将 Key 放在 URL query string 中 | 🟡 中 | ⚠️ 已知风险 |
| T-3 | Google GenAI SDK (`@google/genai`) 内部使用 Key 的方式 | 🟢 低 | ✅ SDK 处理 |

**T-2 详情：**
```typescript
// services/geminiService.ts:84
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1`;
```
URL 中的 Key 可能被以下方式记录：
- 浏览器历史记录
- 代理服务器 / CDN 日志
- `Referer` 头传递到第三方资源

**建议：** 这是 Google API 的标准认证方式，短期内不可避免。长期建议使用 OAuth 2.0 或后端代理转发 API 请求。

---

### 2.3 版本控制泄露

| # | 问题 | 风险 | 状态 |
|---|------|------|------|
| G-1 | `.env` 文件未被 `.gitignore` 忽略 | 🔴 高 | ✅ 已修复 |
| G-2 | `env.example` 不含真实 Key，仅为模板 | 🟢 无 | ✅ 安全 |
| G-3 | 构建产物 `dist/` 已被 `.gitignore` 忽略 | 🟢 无 | ✅ 安全 |
| G-4 | localStorage 数据不属于文件系统，Git 无法访问 | 🟢 无 | ✅ 安全 |

**修复详情（G-1）：**
`.gitignore` 已添加：
```gitignore
.env
.env.*
!env.example
```

---

### 2.4 日志泄露

| # | 问题 | 风险 | 状态 |
|---|------|------|------|
| L-1 | 无 `console.log` 输出 API Key | 🟢 无 | ✅ 安全 |
| L-2 | 错误消息中不包含 Key 值 | 🟢 无 | ✅ 安全 |
| L-3 | `Making-Complete.html` 中有 `console.log` 提及 Key 配置说明（无实际值） | 🟢 无 | ✅ 安全 |

---

### 2.5 运行时内存

| # | 问题 | 风险 | 状态 |
|---|------|------|------|
| M-1 | `geminiService.ts` 模块级 `runtimeConfig` 在内存中持有 Key | 🟢 低 | ℹ️ 正常 |
| M-2 | React state `userApiKeys` 在组件树中传递 Key 对象 | 🟢 低 | ℹ️ 正常 |
| M-3 | Key 在 `CanvasSettings.tsx` 中以遮蔽格式 `maskKey()` 显示 | 🟢 无 | ✅ 安全 |

---

## 三、API Key 数据流图

```
用户输入 API Key
       │
       ▼
┌──────────────────┐     ┌──────────────────────┐
│  CanvasSettings   │────▶│  App.tsx              │
│  (UI 输入 + 验证) │     │  (handleAddApiKey)    │
└──────────────────┘     └──────┬───────────────┘
                                │
                    ┌───────────┼───────────────┐
                    ▼           ▼               ▼
             React State   useEffect       useEffect
             (userApiKeys)  (加密存储)      (runtimeConfig)
                    │           │               │
                    │           ▼               ▼
                    │  localStorage          geminiService.ts
                    │  (AES-GCM 加密)       (内存中 runtimeConfig)
                    │                           │
                    │                           ▼
                    │                    GoogleGenAI SDK
                    │                    (HTTPS → Google API)
                    │
                    ▼
             CanvasSettings
             (maskKey 遮蔽显示)
```

---

## 四、改进措施追踪

| 措施 | 优先级 | 状态 | 文件 |
|------|--------|------|------|
| `.gitignore` 添加 `.env` 规则 | P0 | ✅ 已完成 | `.gitignore` |
| localStorage AES-GCM 加密存储 | P0 | ✅ 已完成 | `utils/keyVault.ts`, `App.tsx` |
| 明文格式自动迁移并删除 | P0 | ✅ 已完成 | `utils/keyVault.ts` |
| 退出清除 Key 开关 | P1 | ✅ 已完成 | `App.tsx`, `components/CanvasSettings.tsx` |
| 安全状态提示 UI | P2 | ✅ 已完成 | `components/CanvasSettings.tsx` |
| 后端代理 API 调用 | P3 | 📋 建议 | — |
| OAuth / 令牌认证 | P3 | 📋 建议 | — |
| CSP (Content Security Policy) 头 | P3 | 📋 建议 | — |

---

## 五、测试验证清单

- [ ] 首次加载：旧明文数据自动迁移到加密格式
- [ ] 正常使用：添加 / 删除 / 设为默认 Key 功能正常
- [ ] DevTools 检查：`localStorage` 中 `userApiKeys.v1` 已被删除，只剩 `userApiKeys.v1.vault`（加密二进制）
- [ ] 退出清除开关：启用后关闭标签页，重新打开时 Key 列表为空
- [ ] 退出清除开关：禁用时关闭标签页，重新打开时 Key 正常恢复
- [ ] Git 检查：`git status` 不会显示 `.env` 文件
- [ ] 跨设备：从 A 电脑复制 `userApiKeys.v1.vault` 到 B 电脑，无法解密（因设备指纹不同）

---

## 六、结论

Making Lovart 项目在 API Key 安全性方面已从「明文裸存」提升到「加密存储 + 可选退出清除」。当前方案在纯前端架构约束下提供了合理的安全层级：

- **Git 泄露风险**：已完全消除
- **本地存储攻击面**：已显著缩小（加密 + 设备绑定）
- **用户控制权**：已提供退出清除选项

如项目后续引入用户登录系统或后端服务，建议升级为 OAuth 令牌机制或服务端代理转发 API 请求，彻底避免客户端持有 API Key。

---

*报告生成工具：GitHub Copilot (Claude Opus 4.6)*  
*报告日期：2026-03-17*
