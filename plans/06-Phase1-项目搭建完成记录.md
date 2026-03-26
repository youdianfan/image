# Phase 1 项目搭建完成记录

## 执行日期

2026-03-26

## 实际技术栈

| 层级      | 技术             | 版本    |
| --------- | ---------------- | ------- |
| 桌面框架  | Electron         | 35.7.5  |
| 前端框架  | Vue 3            | 3.5.25  |
| 语言      | TypeScript       | 5.9.3   |
| 状态管理  | Pinia            | 3.0.4   |
| UI 组件库 | Element Plus     | 2.13.6  |
| 路由      | Vue Router       | 5.0.4   |
| 构建工具  | electron-vite    | 5.0.0   |
| Vite      | Vite             | 7.2.6   |
| 打包      | electron-builder | 26.0.12 |

## 项目结构

```
image-rename-ai/
├── src/
│   ├── main/                        # Electron 主进程
│   │   ├── index.ts                 # 主进程入口 + IPC handlers
│   │   └── services/                # 后端服务
│   │       ├── file.service.ts      # 文件操作服务（已实现）
│   │       ├── rename.service.ts    # 重命名逻辑（stub）
│   │       ├── image.service.ts     # 图片处理（stub）
│   │       └── task.service.ts      # 任务队列（stub）
│   ├── preload/
│   │   ├── index.ts                 # IPC 桥接
│   │   └── index.d.ts              # 类型声明
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── App.vue              # 主布局（侧边栏+内容+状态栏）
│           ├── main.ts              # 渲染进程入口
│           ├── router/index.ts      # 4 路由配置
│           ├── views/               # 4 个页面
│           │   ├── RenameView.vue
│           │   ├── FormatView.vue
│           │   ├── CompressView.vue
│           │   └── SettingsView.vue
│           ├── stores/              # Pinia 状态管理
│           │   ├── file.store.ts
│           │   ├── rename.store.ts
│           │   ├── compress.store.ts
│           │   └── task.store.ts
│           ├── types/
│           │   └── electron-api.d.ts # IPC API 类型
│           └── styles/
│               └── global.css
├── electron.vite.config.ts
├── electron-builder.yml
├── package.json
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
└── plans/                           # 规划文档
```

## 遇到的问题及解决方案

### 1. Electron 启动失败 - `ELECTRON_RUN_AS_NODE=1`

- **问题**: Claude Code 环境设置了 `ELECTRON_RUN_AS_NODE=1`，导致 Electron 以 Node.js 模式运行，`require('electron')` 返回路径字符串
- **解决**: 启动 Electron 前需 `unset ELECTRON_RUN_AS_NODE`
- **影响**: 仅影响在 Claude Code 终端内直接运行 `npm run dev`，用户在独立终端运行不受影响

### 2. `@electron-toolkit/utils` 兼容性

- **问题**: 该库在模块顶层访问 `electron.app.isPackaged`，在 Node.js 模式下崩溃
- **解决**: 从主进程代码中移除该依赖，直接使用 `app.isPackaged`

### 3. Electron 版本选择

- **原始**: 脚手架生成 Electron 39.2.6
- **最终**: 降级到 Electron 35.7.5（稳定版）
- **原因**: 确保兼容性和稳定性

## 下一步

Phase 2: 批量重命名模块（Day 3-7）

- 文件导入与列表
- 命名规则引擎
- 冲突处理与执行
