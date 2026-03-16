# Copilot Instructions — MakingLovart

## Architecture

This is a **single-page React 19 + TypeScript** app (Vite 6). There is no router — the entire canvas lives in one monolithic `App.tsx` (~3 300 lines). State is managed with plain `useState` / `useEffect` hooks; there is **no Redux / Zustand** in the main canvas. The node-workflow subsystem uses a custom hook store (`components/nodeflow/useNodeWorkflowStore.ts`).

### Key structural decisions

- **All canvas state lives in `App.tsx`** — elements, boards, selection, zoom, pan, tool, history, theme, language, API-key state. Child components receive callbacks via props.
- **Board = self-contained workspace.** Each `Board` (see `types.ts`) holds its own `elements[]`, undo `history[][]`, `panOffset` and `zoom`. Boards are serialized to `localStorage` under versioned keys (`boards.v1`).
- **AI service layer is provider-agnostic.** `services/aiGateway.ts` dispatches to `geminiService.ts`, `bananaService.ts`, or any OpenAI-compatible endpoint depending on the model name (regex-based `inferProviderFromModel`).

## File map

| Path | Purpose |
|---|---|
| `App.tsx` | Canvas rendering, event handling, all top-level state |
| `types.ts` | Every shared type (`Element`, `Board`, `AssetLibrary`, `UserApiKey`, etc.) |
| `translations.ts` | EN/ZH i18n (flat key maps + 25+ quick-prompt templates) |
| `services/geminiService.ts` | Gemini / Imagen 4 / Veo 2.0 API calls |
| `services/aiGateway.ts` | Multi-provider router (OpenAI, Anthropic, Qwen, Stability) |
| `services/bananaService.ts` | Banana split-layer & image-agent API |
| `utils/assetStorage.ts` | Inspiration library CRUD → localStorage |
| `components/nodeflow/*` | Visual node workflow editor (separate state store) |

## Conventions

- **ID generation:** `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` — keep this pattern for new element/board IDs.
- **localStorage keys** are always versioned: `boards.v1`, `making.assetLibrary.v1`, `makinglovart.nodeflow.v1`, `themeMode.v1`.
- **i18n:** Use `t('toolbar.undo')` style lookups. All user-facing strings must exist in both `en` and `zho` blocks in `translations.ts`.
- **Env vars:** Vite injects `process.env.API_KEY` / `process.env.GEMINI_API_KEY` via `define` in `vite.config.ts`. New env vars must start with `VITE_` or be explicitly mapped in `define`.
- **CSS:** Tailwind utility classes inline. Global theming via CSS custom properties in `styles.css` (`:root` and `:root[data-theme='dark']`). Avoid adding new CSS files — extend `styles.css` if needed.
- **No external state library.** When adding new features, use `useState` in `App.tsx` or create a custom hook like `useNodeWorkflowStore`. Do not introduce Redux/Zustand.

## Data flow for AI generation

1. User types prompt in `PromptBar` → optional `@mention` elements via `RichPromptEditor` (TipTap)
2. `App.tsx` resolves mentioned element images, builds `ImageInput[]`
3. Calls `editImage()` / `generateImageFromText()` / `generateVideo()` from `geminiService.ts` — or routes through `aiGateway.ts` for non-Google models
4. Result (base64 image) is added as a new `ImageElement` to `elements[]`

## Dev workflow

```bash
npm install        # install deps
npm run dev        # Vite dev server → http://localhost:5173 (or :3000 with vite.config)
npm run build      # production build → dist/
```

No test framework is configured. Verify changes manually in the browser.

## Common pitfalls

- `App.tsx` is huge — search by function name rather than scrolling. Key functions: `handleGenerate`, `handleEditImage`, `handleDrop`, `renderElement`.
- Images are stored as **base64 Data URLs** in `elements[].href` and in localStorage. Large libraries can hit the ~5 MB localStorage limit.
- `geminiService.ts` uses a runtime-config pattern (`setGeminiRuntimeConfig`) so API keys can be changed at runtime from the Settings panel without a page reload.
- The node workflow store persists to its own localStorage key and is independent of the board system.
