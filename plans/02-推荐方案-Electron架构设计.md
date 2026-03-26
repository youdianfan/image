# 推荐方案：Electron + Vue 3 架构设计

## 技术栈

| 层级 | 技术选择 | 说明 |
|------|---------|------|
| 桌面框架 | Electron 29+ | 跨平台桌面容器 |
| 前端框架 | Vue 3 + TypeScript | 响应式 UI |
| 状态管理 | Pinia | 轻量状态管理 |
| UI 组件库 | Element Plus | 企业级组件库 |
| 构建工具 | Vite + electron-vite | 极速 HMR |
| 图片处理 | Sharp | 高性能图片处理 |
| AI 推理 | onnxruntime-node | 离线 ONNX 模型 |
| 中文分词 | nodejieba / segmentit | 中文分词 |
| 翻译 | MarianMT (ONNX) | 离线中英翻译 |
| 打包 | electron-builder | 跨平台打包 |

---

## 项目结构

```
image-rename-ai/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本（IPC桥接）
│   └── services/                # 后端服务（主进程运行）
│       ├── file.service.ts      # 文件操作服务
│       ├── image.service.ts     # 图片处理服务（Sharp）
│       ├── ai.service.ts        # AI推理服务（ONNX）
│       ├── rename.service.ts    # 重命名逻辑服务
│       └── task.service.ts      # 任务队列服务
│
├── src/                         # Vue 前端（渲染进程）
│   ├── App.vue
│   ├── main.ts
│   ├── router/
│   │   └── index.ts
│   ├── stores/                  # Pinia 状态管理
│   │   ├── file.store.ts        # 文件列表状态
│   │   ├── rename.store.ts      # 重命名规则状态
│   │   ├── compress.store.ts    # 压缩设置状态
│   │   └── task.store.ts        # 任务队列状态
│   ├── views/                   # 页面
│   │   ├── RenameView.vue       # 批量重命名页
│   │   ├── FormatView.vue       # 命名格式转换页
│   │   ├── CompressView.vue     # 图片压缩页
│   │   └── SettingsView.vue     # 设置页
│   ├── components/              # 通用组件
│   │   ├── FileList.vue         # 文件列表（原名→新名）
│   │   ├── RuleEditor.vue       # 命名规则编辑器
│   │   ├── PreviewPanel.vue     # 实时预览面板
│   │   ├── ProgressBar.vue      # 进度条
│   │   ├── ImportArea.vue       # 拖拽导入区域
│   │   └── TaskQueue.vue        # 任务队列面板
│   ├── composables/             # 组合式函数
│   │   ├── useFileImport.ts     # 文件导入逻辑
│   │   ├── useRename.ts         # 重命名逻辑
│   │   └── useCompress.ts       # 压缩逻辑
│   ├── utils/                   # 工具函数
│   │   ├── nameConverter.ts     # 命名格式转换（camelCase等）
│   │   ├── conflictResolver.ts  # 冲突处理
│   │   └── validator.ts         # 文件名校验
│   └── types/                   # TypeScript 类型定义
│       ├── file.ts
│       ├── rename.ts
│       └── task.ts
│
├── models/                      # AI 模型文件
│   └── marian-mt/               # MarianMT 翻译模型(ONNX格式)
│       ├── encoder.onnx
│       ├── decoder.onnx
│       ├── vocab.json
│       └── config.json
│
├── resources/                   # 静态资源
│   ├── icon.png
│   └── stopwords.json           # 停用词表
│
├── electron-builder.yml         # 打包配置
├── electron.vite.config.ts      # electron-vite 配置
├── package.json
├── tsconfig.json
└── README.md
```

---

## 架构设计

### 进程通信架构

```
┌─────────────────────────────────┐
│        渲染进程 (Vue 3)          │
│  ┌──────────┐  ┌──────────────┐ │
│  │  Views   │  │  Components  │ │
│  └────┬─────┘  └──────┬───────┘ │
│       │               │         │
│  ┌────▼───────────────▼───────┐ │
│  │    Pinia Stores            │ │
│  └────────────┬───────────────┘ │
│               │ IPC invoke      │
├───────────────┼─────────────────┤
│    preload.ts │ (contextBridge) │
├───────────────┼─────────────────┤
│               ▼                 │
│        主进程 (Node.js)         │
│  ┌──────────────────────────┐   │
│  │      Services Layer      │   │
│  │  ┌────────┐ ┌─────────┐  │   │
│  │  │ Sharp  │ │  ONNX   │  │   │
│  │  │ 图片   │ │  AI推理  │  │   │
│  │  └────────┘ └─────────┘  │   │
│  │  ┌────────┐ ┌─────────┐  │   │
│  │  │ 文件   │ │  任务    │  │   │
│  │  │ 操作   │ │  队列    │  │   │
│  │  └────────┘ └─────────┘  │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

### IPC 通信设计

```typescript
// preload.ts — 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('api', {
  // 文件操作
  selectFiles: () => ipcRenderer.invoke('file:select'),
  selectFolder: () => ipcRenderer.invoke('file:selectFolder'),

  // 重命名
  previewRename: (files, rules) => ipcRenderer.invoke('rename:preview', files, rules),
  executeRename: (plan) => ipcRenderer.invoke('rename:execute', plan),

  // AI命名
  aiSuggestName: (filename) => ipcRenderer.invoke('ai:suggest', filename),
  aiBatchSuggest: (filenames) => ipcRenderer.invoke('ai:batchSuggest', filenames),

  // 图片压缩
  compressImages: (files, options) => ipcRenderer.invoke('compress:execute', files, options),

  // 任务系统
  onTaskProgress: (callback) => ipcRenderer.on('task:progress', callback),
  pauseTask: (taskId) => ipcRenderer.invoke('task:pause', taskId),
  resumeTask: (taskId) => ipcRenderer.invoke('task:resume', taskId),
})
```

---

## 模块详细设计

### 模块一：批量重命名

**核心流程：**
```
导入文件 → 设置规则 → 实时预览 → 冲突检测 → 执行重命名
```

**命名规则模板引擎：**
```typescript
// 支持的变量
interface RenameTemplate {
  pattern: string  // e.g. "{type}-{module}-{ai}-{index}"
}

// 可用变量
type TemplateVar =
  | '{original}'  // 原文件名
  | '{ai}'        // AI生成名称
  | '{index}'     // 序号 (001, 002...)
  | '{type}'      // 类型 (product, banner...)
  | '{module}'    // 模块 (homepage, detail...)
  | '{date}'      // 日期
  | '{width}'     // 图片宽度
  | '{height}'    // 图片高度
```

**冲突处理：**
```typescript
type ConflictStrategy = 'autoNumber' | 'overwrite' | 'skip'

// autoNumber: image.jpg → image-1.jpg → image-2.jpg
// overwrite: 直接覆盖（需二次确认）
// skip: 跳过该文件
```

### 模块二：命名格式转换

**纯前端实现，无需主进程：**

```typescript
// utils/nameConverter.ts
export function convertName(input: string, format: NameFormat): string {
  const words = tokenize(input)  // 分词（支持中英文混合）
  switch (format) {
    case 'camelCase':    return words.map((w, i) => i === 0 ? w.toLowerCase() : capitalize(w)).join('')
    case 'PascalCase':   return words.map(capitalize).join('')
    case 'snake_case':   return words.map(w => w.toLowerCase()).join('_')
    case 'SCREAMING':    return words.map(w => w.toUpperCase()).join('_')
    case 'kebab-case':   return words.map(w => w.toLowerCase()).join('-')
    case 'package.case': return words.map(w => w.toLowerCase()).join('.')
  }
}
```

### 模块三：AI命名增强

详见 [05-AI集成方案.md](./05-AI集成方案.md)

### 模块四：图片压缩

**Sharp 处理流程：**
```typescript
// services/image.service.ts
import sharp from 'sharp'

async function compressImage(input: string, options: CompressOptions): Promise<Buffer> {
  let pipeline = sharp(input)

  // 调整尺寸
  if (options.scale !== 100) {
    const metadata = await sharp(input).metadata()
    pipeline = pipeline.resize(
      Math.round(metadata.width! * options.scale / 100)
    )
  }

  // 去除 EXIF
  if (options.stripExif) {
    pipeline = pipeline.rotate() // 先应用EXIF旋转，再去除
  }

  // 输出格式
  switch (options.format) {
    case 'jpg':
      return pipeline.jpeg({ quality: options.quality }).toBuffer()
    case 'webp':
      return pipeline.webp({ quality: options.quality }).toBuffer()
    case 'png':
      return pipeline.png({ compressionLevel: Math.round((100 - options.quality) / 10) }).toBuffer()
  }
}
```

### 模块五：任务系统

```typescript
// services/task.service.ts
interface Task {
  id: string
  type: 'rename' | 'compress'
  status: 'pending' | 'running' | 'paused' | 'done' | 'failed'
  progress: number        // 0-100
  total: number           // 总文件数
  completed: number       // 已完成数
  errors: TaskError[]     // 错误记录
}

class TaskQueue {
  private queue: Task[] = []
  private concurrency = 4  // 并发数

  async add(task: Task): Promise<void> { /* ... */ }
  pause(taskId: string): void { /* ... */ }
  resume(taskId: string): void { /* ... */ }
  retry(taskId: string): void { /* ... */ }
}
```

---

## UI 布局设计

```
┌──────────────────────────────────────────────────┐
│  [📁 导入]  [⚙️ 设置]  [▶ 开始处理]               │
├──────────┬──────────────────────┬────────────────┤
│          │                      │                │
│  侧边栏   │     文件列表           │   右侧面板     │
│          │                      │                │
│ 重命名    │  原名称  │  新名称  │状态│  命名规则     │
│ 格式转换  │  ────── │ ────── │───│               │
│ 图片压缩  │  img1   │ prod-1 │ ✅│  AI 开关      │
│ 设置     │  img2   │ prod-2 │ ⏳│               │
│          │  img3   │ prod-3 │ ❌│  压缩设置     │
│          │                      │                │
├──────────┴──────────────────────┴────────────────┤
│  [████████████░░░░░░░░] 67%  处理中... 45/67      │
│  📋 日志: img1.jpg → product-homepage-001.jpg     │
└──────────────────────────────────────────────────┘
```

---

## 关键配置文件

### package.json 核心依赖

```json
{
  "name": "image-rename-ai",
  "version": "1.0.0",
  "main": "electron/main.ts",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package:win": "electron-builder --win",
    "package:mac": "electron-builder --mac"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "element-plus": "^2.6.0",
    "sharp": "^0.33.0",
    "onnxruntime-node": "^1.17.0",
    "segmentit": "^2.0.3"
  },
  "devDependencies": {
    "electron": "^29.0.0",
    "electron-vite": "^2.1.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "@vitejs/plugin-vue": "^5.0.0"
  }
}
```

### electron-builder.yml

```yaml
appId: com.imageai.app
productName: Image Rename AI
directories:
  output: dist
files:
  - electron/**/*
  - dist/**/*
  - models/**/*
  - resources/**/*
win:
  target: [nsis]
  icon: resources/icon.png
mac:
  target: [dmg]
  icon: resources/icon.png
extraResources:
  - from: models/
    to: models/
```
