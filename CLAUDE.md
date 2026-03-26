# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Image Rename AI — an Electron desktop app for batch image renaming (with AI-powered Chinese→English translation), naming format conversion, and image compression. The UI is in Chinese.

## Development Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Typecheck + production build
npm run lint         # ESLint (cached)
npm run format       # Prettier formatting
npm run typecheck    # TypeScript check (both node and web targets)
npm run build:win    # Package Windows installer (NSIS)
npm run build:mac    # Package macOS installer (DMG)
npm run build:linux  # Package Linux installer (AppImage + deb)
```

No test framework is configured. Node.js 24.14.0 (.nvmrc).

## Architecture

**Electron three-process model** built with electron-vite:

- **Main process** (`src/main/index.ts`) — Electron app lifecycle, IPC handlers for file ops, rename, and compression. Services: `FileService`, `RenameService`, `ImageService`, `TaskService`.
- **Preload** (`src/preload/index.ts`) — Bridges main↔renderer via `window.api`, exposing typed IPC methods.
- **Renderer** (`src/renderer/`) — Vue 3 + TypeScript + Composition API. State: Pinia stores. UI: Element Plus. Routing: Vue Router (hash mode, 3 routes: `/workspace`, `/format`, `/settings`).

### Renderer Structure

- **Views**: `WorkspaceView` (main rename/compress UI), `FormatView` (sync naming converter), `SettingsView` (AI model download config)
- **Stores** (Pinia, `src/renderer/src/stores/`): `file.store`, `rename.store`, `compress.store`, `task.store`, `ai.store`, `workspace.store`
- **Composables** (`src/renderer/src/composables/`): `useFileImport`, `useRename`, `useWorkspace` — orchestration logic extracted from views
- **Services**: `aiTranslator` — runs Xenova/opus-mt-zh-en model via @huggingface/transformers entirely in the renderer process (offline after initial download)
- **Utils**: `template-engine` (rule-based filename generation with `{original}`, `{index}`, `{ai}`, etc.), `nameConverter` (camelCase/snake_case/kebab-case conversions), `filename-sanitizer`, `conflict-detector`

### IPC Communication Pattern

```
Renderer → window.api.method() → ipcRenderer.invoke("channel") → Main process handler → returns result
Main → event.sender.send("task:progress", data) → Renderer listener for progress updates
```

### Key Data Flow (Rename)

1. Files imported → `file.store` populated, AI auto-translates Chinese filenames
2. User configures template rules in `rename.store`
3. Template engine generates preview names with conflict detection
4. Execute → IPC to main process `RenameService` → progress via `task:progress` channel
5. Results update file statuses in store

## Tech Stack

- **Desktop**: Electron 41, electron-vite, electron-builder
- **Frontend**: Vue 3.5, Pinia 3, Vue Router 5, Element Plus, TypeScript 5.9
- **Image processing**: Sharp (main process, via IPC)
- **AI**: @huggingface/transformers (ONNX, runs in renderer), supports HuggingFace mirror config for China
- **Auto-imports**: `unplugin-auto-import` + `unplugin-vue-components` (Vue APIs and Element Plus components are auto-imported — no manual imports needed)
