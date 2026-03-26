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
