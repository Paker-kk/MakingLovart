# Project Guidelines

## Code Style
- Keep changes minimal and consistent with the current React + TypeScript style used in App.tsx, components/, and services/.
- Prefer existing utility functions and shared types from types.ts, translations.ts, and utils/ instead of introducing parallel abstractions.
- For UI work, preserve the current CSS-variable driven styling in styles.css. Reuse existing compact layout helpers such as utils/uiScale.ts and existing compactMode-style props before adding new layout systems.
- Keep user-facing copy aligned with the bilingual translation flow in translations.ts.

## Architecture
- The active app entry is index.tsx, which mounts the root-level App.tsx. Default to editing that path for product behavior and layout changes.
- Treat root-level components/ as the primary UI layer used by the running app.
- The services/ directory contains provider integrations and routing logic. Keep API-specific behavior there rather than inside UI components.

## Build and Test
- Install dependencies with `npm install`.
- Start local development with `npm run dev`.
- Build production output with `npm run build`.
- There is a test script: `npm run test` (vitest). Use `npm run build` for production validation.
- `npx tsc --noEmit` is useful for extra checking but currently surfaces pre-existing repository issues, so do not treat a failing typecheck as proof that a small isolated change is wrong unless the error points to files you touched.

## Conventions
- This project mixes canvas state management, AI generation orchestration, and layout orchestration in the root App.tsx. Refactor only when necessary for the task; otherwise keep edits narrowly scoped.
- When changing generation behavior, follow the existing provider inference and config flow in services/aiGateway.ts and services/geminiService.ts.
- For prompt and attachment UX, prefer extending the current bottom-bar patterns in components/PromptBar.tsx instead of adding a second prompt surface.
- For workspace chrome changes such as sidebars, floating panels, and compact layout behavior, update shared sizing and motion consistently across App.tsx, components/Toolbar.tsx, components/WorkspaceSidebar.tsx, components/RightPanel.tsx, and components/PromptBar.tsx so the UI scale remains coherent across desktop and mobile.