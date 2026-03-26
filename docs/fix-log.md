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
