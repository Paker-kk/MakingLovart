# MakingLovart

AI creative whiteboard for image and video ideation.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-20232a?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)

</div>

![MakingLovart preview](show.jpg)

## Overview

MakingLovart is a local-first AI whiteboard inspired by Lovart-style creative workflows. It combines:

- an infinite canvas for arranging images, video, text, and shapes
- a prompt editor that can reference canvas elements with `@mentions`
- AI generation and image editing hooks
- layer management, asset collection, and board switching
- a visual settings panel for API keys and model preferences

The project is still evolving, but it already works well as a playground for AI-assisted visual composition.

## What It Can Do

### Canvas

- Pan and zoom across an infinite workspace
- Draw paths, shapes, text, arrows, and lines
- Upload images and place them on the canvas
- Select, move, resize, rename, hide, lock, reorder, group, copy, and delete elements
- Undo and redo editing history per board

### AI Workflow

- Generate images from prompts
- Generate videos from prompt + image context
- Edit existing images with prompt-based refinement
- Enhance prompts with multiple modes:
  - `smart`
  - `style`
  - `precise`
  - `translate`
- Bind selected canvas elements into prompts via `@mentions`
- Lock a selected character reference for more consistent generation
- Run BANANA image actions such as:
  - split layers
  - upscale
  - remove background

### Workspace UI

- Left-side layer panel with visibility and lock controls
- Right-side assistant / inspector / asset panel
- Floating prompt composer
- Board switcher for managing multiple canvases
- Local asset library backed by browser storage

## Current Status

This repository is usable, but it is not yet a polished production app.

- The main whiteboard experience is the primary focus.
- Some older or experimental workflow-related code still exists in the repo.
- Persistence is currently local-first and browser-based.
- A few internal files still need cleanup and modularization.

If you are evaluating the project, treat it as an active prototype rather than a finished SaaS product.

## Quick Start

### Requirements

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Start the app

```bash
npm run dev
```

Vite will print the local address in the terminal.

If your machine has port permission conflicts, try:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## API Configuration

AI features require API keys.

The most reliable way to configure them in the current app is:

1. Start the app
2. Open the settings panel
3. Add your API key there
4. Choose the model you want to use

The settings UI already supports provider records for:

- Google Gemini
- OpenAI
- Anthropic
- Stability
- Qwen
- BANANA
- Custom endpoints

Important note:

- The current generation pipeline is primarily wired to Gemini and BANANA services.
- Other providers are present in the settings UI as configuration groundwork, not as fully completed generation adapters.

## Supported AI Capabilities

### Implemented now

- Gemini prompt enhancement
- Gemini image generation
- Gemini image editing
- Gemini video generation
- BANANA layer split
- BANANA image agent actions

### In progress / partial

- richer multi-provider routing
- cleaner workflow orchestration
- more modular panel architecture

## Project Structure

```text
.
|-- App.tsx                      # Main application shell and state
|-- index.tsx                    # React entry
|-- components/
|   |-- PromptBar.tsx            # Floating prompt composer
|   |-- RichPromptEditor.tsx     # Tiptap-based rich prompt editor
|   |-- RightPanel.tsx           # Assistant / inspector / asset panel
|   |-- LayerPanelMinimizable.tsx# Layer management UI
|   |-- Toolbar.tsx              # Main editing toolbar
|   |-- CanvasSettings.tsx       # Settings and API key management
|   |-- BoardPanel.tsx           # Board switcher
|   `-- NodeWorkflowPanel.tsx    # Experimental workflow panel
|-- services/
|   |-- geminiService.ts         # Gemini image/video/prompt helpers
|   `-- bananaService.ts         # BANANA vision helpers
|-- utils/
|   |-- assetStorage.ts          # Local asset persistence
|   `-- fileUtils.ts             # File helpers
|-- translations.ts              # UI copy
`-- types.ts                     # Shared app types
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Tiptap / ProseMirror
- `@google/genai`
- Browser `localStorage` for current persistence

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview built app locally |

## Roadmap

- Refactor the shell into clearer panel and canvas modules
- Improve toolbar and panel layout to better match Lovart-style UX
- Reduce monolithic state inside `App.tsx`
- Expand provider adapter support
- Replace part of the current local persistence with a stronger storage layer
- Improve export, project save/load, and asset management flows

## Docker

Deployment examples are available in [DOCKER_GUIDE.md](DOCKER_GUIDE.md).

## Contributing

Issues and pull requests are welcome.

Before opening a large PR, it helps to describe:

- what user problem you are solving
- whether the change is UI-only or behavior-changing
- any API or storage assumptions

You can also check [CONTRIBUTING.md](CONTRIBUTING.md) for project conventions.

## Acknowledgements

- [Lovart](https://lovart.com/)
- [Google Gemini](https://ai.google.dev/)
- [Nano Banana](https://github.com/JimLiu/nanoBanana)
- [BananaPod](https://github.com/ZHO-ZHO-ZHO/BananaPod)
- [n8n editor-ui](https://github.com/n8n-io/n8n/tree/master/packages/editor-ui)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
