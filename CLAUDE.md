# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 项目概述

Image Rename AI —— 一款 Electron 桌面应用，支持批量图片重命名（AI 中文→英文翻译）、命名格式转换、图片压缩与格式转码。界面语言为中文。

## 开发命令

```bash
npm run dev          # 启动开发服务器（热更新）
npm run build        # 类型检查 + 生产构建
npm run lint         # ESLint（缓存模式）
npm run format       # Prettier 格式化
npm run typecheck    # TypeScript 类型检查（node + web 两个目标）
npm run build:win    # 打包 Windows 安装程序（NSIS）
npm run build:mac    # 打包 macOS 安装程序（DMG）
npm run build:linux  # 打包 Linux 安装程序（AppImage + deb）
npm run download:model         # 从 HuggingFace 下载 AI 模型
npm run download:model:mirror  # 通过 hf-mirror.com 下载（国内镜像）
```

未配置测试框架。Node.js 24.14.0（.nvmrc）。

## 架构

**Electron 三进程模型**，基于 electron-vite 构建：

- **主进程** (`src/main/index.ts`) —— Electron 应用生命周期、IPC 处理器（文件操作、重命名、压缩）。服务：`FileService`、`RenameService`、`ImageService`、`TaskService`。
- **Preload** (`src/preload/index.ts`) —— 通过 `window.api` 桥接主进程与渲染进程，暴露类型化的 IPC 方法。
- **渲染进程** (`src/renderer/`) —— Vue 3 + TypeScript + Composition API。状态管理：Pinia。UI 组件：Element Plus。路由：Vue Router（hash 模式，2 个路由：`/workspace`、`/settings`）。

### 渲染进程结构

- **视图**：`WorkspaceView`（主重命名/压缩界面）、`SettingsView`（AI 模型下载 + 命名格式配置）
- **Store**（Pinia，`src/renderer/src/stores/`）：`file.store`、`rename.store`、`compress.store`、`task.store`、`ai.store`、`workspace.store`、`theme.store`、`update.store`
- **Composables**（`src/renderer/src/composables/`）：`useFileImport`、`useWorkspace` —— 从视图中抽取的编排逻辑
- **Services**：`aiTranslator` —— 在渲染进程中运行 Xenova/opus-mt-zh-en 模型（@huggingface/transformers，ONNX 格式），初始下载后完全离线
- **Utils**：`template-engine`（基于规则的文件名生成）、`nameConverter`（6 种命名格式）、`filename-sanitizer`、`conflict-detector`

### IPC 通信模式

```
渲染进程 → window.api.method() → ipcRenderer.invoke("channel") → 主进程处理器 → 返回结果
主进程 → event.sender.send("task:progress", data) → 渲染进程监听器接收进度更新
```

所有 IPC 通道使用 `ipcMain.handle()`（基于 Promise）。进度通知通过 `webContents.send()` 单向推送。

### 核心数据流（重命名）

1. 导入文件 → 填充 `file.store`，AI 自动翻译中文文件名（非阻塞）
2. 用户在 `workspace.store` 中配置模板规则（重命名配置、压缩配置、输出配置）
3. `useWorkspace.previewItems` 响应式计算：模板引擎 → 命名格式转换 → 文件名清理 → 冲突检测
4. 执行 → IPC 调用主进程 `RenameService` → 通过 `task:progress` 通道推送进度
5. 若启用压缩，在重命名后对输出文件执行压缩
6. 结果更新 store 中的文件状态；部分失败时优雅处理

### AI 模型与自定义协议

AI 翻译模型（Helsinki-NLP/opus-mt-zh-en，约 150MB 量化 ONNX）本地打包在 `resources/models/` 中。通过自定义 `local-model://` Electron 协议向渲染进程提供模型文件，初始设置后无需网络。协议会剥离 HuggingFace 的 `/resolve/main/` 路径前缀以匹配本地目录结构。ONNX WASM 文件也通过自定义 Vite 插件（`electron.vite.config.ts` 中的 `serveOnnxWasm`）本地打包。

### 模板引擎变量

模板引擎（`src/renderer/src/utils/template-engine.ts`）支持以下重命名模板变量：

- `{original}` —— 不含扩展名的文件名（如有 AI 翻译则使用翻译后的名称）
- `{index}` —— 批次中的位置，带填充格式（startIndex + position × indexStep，零填充至 indexDigits 位）
- `{date}` —— 当前日期，YYYYMMDD 格式
- `{type}`、`{module}` —— 用户自定义上下文字段
- `{width}`、`{height}` —— 图片尺寸（如果可用）

后处理：合并连续分隔符、去除首尾分隔符，若为空则回退为 `unnamed-{index}`。

### 命名格式转换器

`nameConverter` 支持 6 种格式：`camelCase`（小驼峰）、`PascalCase`（大驼峰）、`snake_case`（下划线）、`SCREAMING_CASE`（大写下划线）、`kebab-case`（短横线）、`package.case`（点分）。分词时按驼峰边界拆分并规范化分隔符；中文字符作为独立 token 保留。

### 冲突检测

两阶段：`useWorkspace` 中的内存检测（预览时，不区分大小写），然后是 `RenameService` 中的磁盘检测（执行时）。策略：`autoNumber`（追加 `-1`、`-2`）、`skip`（跳过）、`overwrite`（覆盖）。

### 主题系统

应用支持浅色/深色/跟随系统三种主题模式，以及自定义主色。

**架构**：`theme.store`（Pinia）管理 `mode`（`light` | `dark` | `system`）和 `primaryColor`（hex），持久化到 `localStorage`。在 `main.ts` 中通过 `themeStore.init()` 初始化，确保首屏即应用正确主题。

**CSS 变量体系**（`src/renderer/src/styles/global.css`）：

- 布局变量：`--nav-height`、`--statusbar-height`
- 背景：`--app-bg`、`--app-bg-secondary`、`--app-bg-tertiary`
- 文字：`--app-text-primary`、`--app-text-regular`、`--app-text-secondary`、`--app-text-placeholder`
- 边框：`--app-border`、`--app-border-light`、`--app-border-dashed`
- 语义色：`--app-primary`、`--app-primary-light`、`--app-success`、`--app-warning`、`--app-danger`
- 滚动条：`--app-scrollbar`、`--app-scrollbar-hover`

**暗色模式**：通过在 `<html>` 上切换 `dark` class 激活。Element Plus 暗色变量由 `element-plus/theme-chalk/dark/css-vars.css` 提供，应用自定义变量在 `html.dark` 选择器下覆盖。

**自定义主色**：`theme.store` 将用户选择的 hex 色值转换为 HSL，生成 `--el-color-primary-light-1` 至 `light-9` 和 `dark-2` 共 11 个 Element Plus 主色梯度变量，通过 `document.documentElement.style.setProperty()` 动态注入。

**开发规则**：
- **禁止在组件中硬编码颜色值**，必须使用 `var(--app-*)` CSS 变量或 Element Plus 内置 CSS 变量
- 新增 CSS 变量时需同时在 `:root`（浅色）和 `html.dark`（深色）中定义
- 外观设置 UI 位于 `SettingsView.vue` 的"外观"卡片中

### 系统托盘

应用支持最小化到系统托盘（Windows 任务栏 / macOS 菜单栏）。关闭窗口时隐藏而非退出，右键托盘图标提供"打开主页面"和"退出"菜单。实现在 `src/main/index.ts` 中，使用模块级 `mainWindow`、`tray`、`isQuitting` 变量管理生命周期。托盘菜单随语言切换自动更新。

### 国际化（i18n）

应用使用 `vue-i18n` 实现多语言支持，当前支持：简体中文（`zh-CN`，默认）、日语（`ja`）、韩语（`ko`）。

**架构**：

- **Locale 文件**（`src/renderer/src/locales/`）：每种语言一个 TypeScript 文件（`zh-CN.ts`、`ja.ts`、`ko.ts`），导出嵌套对象结构的翻译文本
- **i18n 配置**（`src/renderer/src/i18n.ts`）：创建 `vue-i18n` 实例，non-legacy 模式，fallback 到 `zh-CN`
- **语言持久化**：通过 `localStorage`（`app-locale` key）保存用户选择
- **主进程同步**：渲染进程切换语言时通过 `window.api.setLocale()` → `ipcMain.on("app:setLocale")` 通知主进程重建托盘菜单

**开发规则**：
- **禁止在 Vue 模板和 JS 中硬编码用户可见的文本字符串**，必须使用 `$t('key')` 或 `t('key')` 调用
- Vue 模板中使用 `$t('key')`，`<script setup>` / composables 中使用 `const { t } = useI18n()` 后调用 `t('key')`
- 新增用户可见文本时，需同时在 **所有 locale 文件** 中添加对应翻译
- locale 文件的 key 结构按功能模块组织：`app`、`nav`、`workspace`、`import`、`fileList`、`settings`、`panel`、`task`、`format`、`tray`
- 主进程中的少量文本（托盘菜单）通过 `trayLabels` 对象按 locale 查找，不使用 vue-i18n
- 新增语言时需要：① 创建 `src/renderer/src/locales/<code>.ts` ② 在 `i18n.ts` 的 `messages` 和 `LOCALE_OPTIONS` 中注册 ③ 在 `src/main/index.ts` 的 `trayLabels` 中添加对应翻译

### 版本更新

`update.store`（Pinia）管理版本检测与下载安装流程。当前为 **模拟实现**（mock），状态机：`idle` → `checking` → `available`/`up-to-date` → `downloading` → `ready` → 安装。UI 位于 `SettingsView.vue` 的"版本更新"卡片中。后续接入真实 API 时替换 store 中的 mock 逻辑即可，无需修改 UI。

## 技术栈

- **桌面端**：Electron 41、electron-vite、electron-builder
- **前端**：Vue 3.5、Pinia 3、Vue Router 5、Element Plus、TypeScript 5.9
- **国际化**：vue-i18n 11（Composition API 模式）
- **图片处理**：Sharp（主进程，通过 IPC 调用）
- **AI**：@huggingface/transformers（ONNX 格式，在渲染进程运行），支持 HuggingFace 国内镜像配置
- **自动导入**：`unplugin-auto-import` + `unplugin-vue-components`（Vue API 和 Element Plus 组件自动导入，无需手动 import）

## 构建与打包

- 模型和 Sharp 原生二进制文件从 ASAR 中解包（`electron-builder.yml` 中的 `asarUnpack`）
- 打包前须先运行 `npm run download:model` 以打包 AI 模型
- Preload API 的类型定义在 `src/renderer/src/types/electron-api.d.ts`
- 路径别名：`@/` 映射到渲染进程的 `src/renderer/src/`

## 修复记录规则

每次修复 bug 或解决问题后，必须在 `docs/fix-log.md` 中追加一条记录，包含日期、问题描述和修复方案。此文件按时间递增记录，用于防止误修复和回归。
