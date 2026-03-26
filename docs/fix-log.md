# 修复日志

每次修复按时间递增记录，包含日期、问题描述和修复方案，用于防止误修复和回归。

---

## #001 — 2026-03-26

**问题**：点击执行后，再次上传其他图片，执行按钮无法点击。

**原因**：`taskStore.currentTask` 在任务完成后未被清除为 null，而 `canExecute` 要求 `!taskStore.currentTask`，导致按钮永久禁用。

**修复**：在 `useWorkspace.ts` 的 `execute()` 函数中添加 `finally { taskStore.clearTask(); }`，确保无论成功或失败都重置任务状态。同时将失败路径改用 `taskStore.failTask()` 以正确记录到任务历史。

**涉及文件**：`src/renderer/src/composables/useWorkspace.ts`

---

## #002 — 2026-03-26

**问题**：选择其他图片输出格式后点击执行，不会压缩输出图片。

**原因**：
1. 预览文件名的扩展名未反映压缩输出格式（如选择 webp 输出，预览仍显示 .png），导致 rename 创建了错误扩展名的文件，compress 产生了额外文件而非原地转换。
2. 执行后 file store 中的文件路径未更新为新位置，再次执行时源文件找不到。

**修复**：
1. 在 `previewItems` 中，当压缩启用了格式转换时，自动替换文件扩展名。
2. 执行成功后更新 file store 中的文件路径（仅覆盖模式下更新，复制模式下原文件不变）。

**涉及文件**：`src/renderer/src/composables/useWorkspace.ts`、`src/renderer/src/stores/file.store.ts`

---

## #003 — 2026-03-26

**问题**：执行成功后会弹出重命名、压缩、处理完成三个 toast 提示。

**原因**：rename 和 compress 各自有独立的 warning toast，最后还有一个 success toast，同时弹出导致信息混乱。

**修复**：移除 rename 和 compress 各自的 warning toast，改为执行结束后统一输出一条消息：全部成功显示"处理完成"，有失败则显示具体失败项。

**涉及文件**：`src/renderer/src/composables/useWorkspace.ts`

---

## #004 — 2026-03-26

**问题**：上传图片后执行会把原始文件移走（如 黑色.png 被移动为 black.png），期望保留原文件并输出新文件。

**原因**：`RenameService.moveFile()` 始终使用 `fs.rename()`（移动文件），即使在"输出到新目录"模式下也会删除源文件。

**修复**：在整条 IPC 链路（renderer → preload → main → RenameService）中添加 `copyOnly` 参数。当输出模式为"新目录"时传入 `copyOnly: true`，`moveFile` 改用 `fs.copyFile()` 仅复制文件、保留原始文件不变。

**涉及文件**：`src/main/services/rename.service.ts`、`src/main/index.ts`、`src/preload/index.ts`、`src/renderer/src/types/electron-api.d.ts`、`src/renderer/src/composables/useWorkspace.ts`

---

## #005 — 2026-03-26

**问题**：拖拽单个图片文件或文件夹到上传区域，不会触发导入操作。

**原因**：
1. `ImportArea.onDrop` 使用 `File.path` 获取路径，但在 `contextIsolation: true`（默认）下，渲染进程主世界的 `File` 对象没有 `.path` 属性（该属性仅在 preload 隔离世界中可用）。导致所有拖拽文件的路径为 `undefined`，全部被跳过。
2. `File` 对象通过 `contextBridge` 传递时会被 structured clone，丢失 `webUtils.getPathForFile()` 所需的内部引用，因此直接在 API 中传递 `FileList` 也不可行。
3. 按图片扩展名过滤，文件夹没有扩展名直接被跳过。
4. `file.store.addFilesFromPaths` 没有处理目录的逻辑。

**修复**：
1. 在 preload 中注册 **capture 阶段**的全局 `drop` 事件监听器，在渲染进程的 bubble 阶段处理器运行之前，使用 `webUtils.getPathForFile()` 提取路径并暂存到 `_lastDropPaths` 变量。
2. 暴露 `getLastDropPaths()` 同步方法，让渲染进程在自己的 drop 处理器中取回路径（仅传递 string[]，不跨 contextBridge 传递 File 对象）。
3. ImportArea 的 `onDrop` 改为调用 `window.api.getLastDropPaths()`，移除扩展名过滤。
4. 新增 `file:scanDirectory` IPC 通道，复用 FileService 现有的 `scanDirectory` 方法。
5. `addFilesFromPaths` 增加目录判断：若为目录则调用 `scanDirectory` 扫描内部图片文件。

**涉及文件**：`src/preload/index.ts`、`src/renderer/src/components/ImportArea.vue`、`src/renderer/src/types/electron-api.d.ts`、`src/main/index.ts`、`src/renderer/src/stores/file.store.ts`

---

## #006 — 2026-03-26

**问题**：需要 ESC 按键退出全屏。

**原因**：应用没有全局的 ESC 键盘事件处理。

**修复**：在主进程的 `browser-window-created` 事件中，通过 `before-input-event` 监听 ESC 按键。当窗口处于全屏状态时，按 ESC 调用 `setFullScreen(false)` 退出全屏。

**涉及文件**：`src/main/index.ts`

---

## #007 — 2026-03-26

**问题**：导入含中文文件名的图片后，文件列表中的"新文件名"不会及时更新为翻译后的英文名，仍显示原始中文名。

**原因**：`autoTranslateFiles()` 以 fire-and-forget 方式调用（未 await），翻译在后台异步完成后直接修改 `file.translatedName`，但 Vue 的 `computed`（`previewItems`）无法可靠检测到深层属性变更，导致不会重新计算预览。

**修复**：在 `file.store` 中新增响应式计数器 `translationVersion`，每次单个文件翻译完成后递增。在 `useWorkspace` 的 `previewItems` computed 中读取该计数器以建立响应式依赖，确保每翻译完一个文件就立即刷新预览。

**涉及文件**：`src/renderer/src/stores/file.store.ts`、`src/renderer/src/composables/useWorkspace.ts`

---

## #008 — 2026-03-26

**功能**：文件列表图片预览与全屏查看器。

**描述**：文件列表中新增 50×50 缩略图列，点击缩略图弹出全屏图片查看器，支持上/下张切换、缩放、旋转。

**实现**：
1. 注册 `local-image://` 自定义 Electron 协议，将本地绝对路径映射为可在渲染进程中加载的图片 URL，绕过 CSP 对 `file://` 的限制。
2. 更新 CSP `img-src` 添加 `local-image:` 来源。
3. `FileList.vue` 新增缩略图列（`el-image` + lazy 懒加载）和 `ElImageViewer` 全屏查看器组件。
4. `useWorkspace.ts` 为每个预览项生成 `imageUrl` 字段。

**涉及文件**：`src/main/index.ts`、`src/renderer/index.html`、`src/renderer/src/components/FileList.vue`、`src/renderer/src/composables/useWorkspace.ts`

---

## #009 — 2026-03-26

**功能**：智能输出目录模式。

**描述**：输出模式从 2 种扩展为 3 种：`autoDirectory`（默认，自动在源文件同级创建 `output` 子目录）、`customDirectory`（用户手动选择目录）、`overwrite`（覆盖原文件）。

**实现**：
1. `OutputConfig.mode` 类型扩展为 `"autoDirectory" | "customDirectory" | "overwrite"`，默认值改为 `"autoDirectory"`。
2. `SettingsPanel.vue` 输出区域更新为 3 个 radio 选项，autoDirectory 模式下显示提示文字。
3. `useWorkspace.ts` 中 `targetDir` 计算逻辑适配新模式：autoDirectory 模式下输出到 `sourceDir\output`；`canExecute`、`execute()` 中的相关判断同步更新。

**涉及文件**：`src/renderer/src/stores/workspace.store.ts`、`src/renderer/src/components/SettingsPanel.vue`、`src/renderer/src/composables/useWorkspace.ts`
