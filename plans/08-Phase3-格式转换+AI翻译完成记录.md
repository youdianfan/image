# Phase 3 格式转换 + AI 翻译集成完成记录

## 执行日期

2026-03-26

## 实现内容

### AI 翻译服务
- `aiTranslator.ts`: 基于 @huggingface/transformers (v3.8.1) 的翻译服务
- 使用 Xenova/opus-mt-zh-en 模型（中→英翻译）
- 模型约 300MB，首次使用时自动下载到浏览器缓存
- 后处理：小写化、去停用词、清理特殊字符
- 单例模式，全局共享

### AI 状态管理
- `ai.store.ts`: Pinia Store 管理模型状态
- 状态：not-downloaded / downloading / ready / error
- 下载进度追踪

### 命名格式转换
- `nameConverter.ts`: 重构，移除拼音依赖
- 同步版本（纯英文）+ 异步版本（含 AI 翻译）
- 6 种格式：camelCase、PascalCase、snake_case、SCREAMING_CASE、kebab-case、package.case
- 智能分词：支持 camelCase 边界、下划线、连字符、空格、中文

### 格式转换页面
- `FormatView.vue`: 单行/批量模式切换
- 6 格式卡片即时展示
- 一键复制（单项/全部）
- 历史记录（localStorage，最近 20 条）
- 中文输入时自动调用 AI 翻译（模型就绪时）
- AI 未就绪时显示提示引导下载

### 设置页面
- `SettingsView.vue`: 新增"AI 模型管理"卡片
- 显示模型信息、状态、下载进度
- 下载按钮 + 进度条

## 技术方案
- 采用 Transformers.js (方案 B)，浏览器端 ONNX 推理
- 模型按需下载，非打包到安装包
- 渲染进程运行，无需主进程参与

## 文件清单

| 文件 | 操作 |
|------|------|
| src/renderer/src/services/aiTranslator.ts | 新建 |
| src/renderer/src/stores/ai.store.ts | 新建 |
| src/renderer/src/utils/nameConverter.ts | 重写 |
| src/renderer/src/views/FormatView.vue | 重写 |
| src/renderer/src/views/SettingsView.vue | 修改 |

## 下一步
Phase 4: 图片压缩模块（Day 10-12）
