# Phase 2 批量重命名模块完成记录

## 执行日期
2026-03-26

## 实现内容

### 工具函数层（渲染进程）
- `template-engine.ts`: 模板引擎，支持 {original}, {index}, {type}, {module}, {date} 变量
- `filename-sanitizer.ts`: 文件名清理（Windows非法字符）、超长截断+hash、文件大小格式化
- `conflict-detector.ts`: 批内冲突检测，支持 autoNumber/skip/overwrite 三种策略

### 组件层
- `ImportArea.vue`: 拖拽导入区域，支持全屏/紧凑两种模式
- `RuleEditor.vue`: 命名规则编辑器（模板、类型、模块、序号、冲突策略、输出模式）
- `FileList.vue`: 文件列表表格（原名/新名/大小/状态/操作），支持内联编辑

### 组合函数层
- `useFileImport.ts`: 文件导入逻辑封装（含拖拽）
- `useRename.ts`: 重命名预览（computed 即时计算）+ 执行逻辑 + 进度监听

### 页面
- `RenameView.vue`: 完整重写，左侧文件列表 + 右侧规则编辑器布局

### Store 增强
- `file.store.ts`: 新增 hasManualOverride、addFilesFromPaths、setManualOverride、updateFileStatus、resetAllStatus

### 主进程
- `rename.service.ts`: 完整实现（磁盘冲突解决、fs.rename/copyFile、进度事件广播）
- `index.ts`: 替换 stub handler，新增 dialog:selectDirectory
- `preload/index.ts`: 新增 selectDirectory、更新 executeRename 签名

### 类型
- `electron-api.d.ts`: 更新 RenameResult（增加 skipped/errors）、TaskProgress、新增 selectDirectory

## 架构决策
- 模板引擎在渲染进程运行（零 IPC 延迟，规则变化即时预览）
- 主进程仅负责实际文件操作
- 使用 Vue computed 实现响应式预览，无需手动触发

## 文件清单（14个文件）
| 文件 | 操作 |
|------|------|
| src/renderer/src/utils/template-engine.ts | 新建 |
| src/renderer/src/utils/filename-sanitizer.ts | 新建 |
| src/renderer/src/utils/conflict-detector.ts | 新建 |
| src/renderer/src/composables/useFileImport.ts | 新建 |
| src/renderer/src/composables/useRename.ts | 新建 |
| src/renderer/src/components/ImportArea.vue | 新建 |
| src/renderer/src/components/RuleEditor.vue | 新建 |
| src/renderer/src/components/FileList.vue | 新建 |
| src/renderer/src/views/RenameView.vue | 重写 |
| src/renderer/src/stores/file.store.ts | 修改 |
| src/main/services/rename.service.ts | 重写 |
| src/main/index.ts | 修改 |
| src/preload/index.ts | 修改 |
| src/renderer/src/types/electron-api.d.ts | 修改 |

## 下一步
Phase 3: 命名格式转换模块（Day 8-9）
