import { computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useFileStore } from '@/stores/file.store'
import { useRenameStore } from '@/stores/rename.store'
import { useTaskStore } from '@/stores/task.store'
import { applyTemplate, buildContext } from '@/utils/template-engine'
import { sanitizeFilename, truncateFilename, formatFileSize } from '@/utils/filename-sanitizer'
import { detectAndResolveConflicts } from '@/utils/conflict-detector'
import type { FileListItem } from '@/components/FileList.vue'

export interface PreviewItem extends FileListItem {
  sourcePath: string
  targetDir: string
}

export function useRename() {
  const fileStore = useFileStore()
  const renameStore = useRenameStore()
  const taskStore = useTaskStore()

  const previewItems = computed<PreviewItem[]>(() => {
    const rule = renameStore.rule
    const files = fileStore.files

    if (files.length === 0) return []

    // Step 1: Generate new names
    const rawItems = files.map((file, index) => {
      let newName: string

      if (file.hasManualOverride) {
        newName = file.newName
      } else {
        const context = buildContext(file.name, file.extension, index, rule)
        newName = applyTemplate(rule.template, context, rule)
        newName = sanitizeFilename(newName)
        newName = truncateFilename(newName)
      }

      // Determine target directory
      let targetDir: string
      if (rule.outputMode === 'newDirectory' && rule.outputDirectory) {
        targetDir = rule.outputDirectory
      } else {
        // Same directory as source
        const lastSep = file.path.lastIndexOf('\\') !== -1
          ? file.path.lastIndexOf('\\')
          : file.path.lastIndexOf('/')
        targetDir = file.path.substring(0, lastSep)
      }

      return {
        id: file.id,
        originalName: file.name,
        originalPath: file.path,
        newName,
        sizeText: formatFileSize(file.size),
        status: file.status,
        hasConflict: false,
        sourcePath: file.path,
        targetDir
      }
    })

    // Step 2: Detect and resolve batch conflicts
    const conflictInput = rawItems.map((item) => ({
      id: item.id,
      path: item.sourcePath,
      newName: item.newName
    }))
    const resolved = detectAndResolveConflicts(conflictInput, rule.conflictStrategy)

    // Step 3: Apply resolved names
    return rawItems.map((item, index) => ({
      ...item,
      newName: resolved[index].resolvedName || item.newName,
      hasConflict: resolved[index].hasConflict
    }))
  })

  const canExecute = computed(() => {
    return fileStore.files.length > 0 &&
      !taskStore.currentTask &&
      (renameStore.rule.outputMode === 'overwrite' || !!renameStore.rule.outputDirectory)
  })

  async function executeRename(): Promise<void> {
    if (!canExecute.value) return

    const rule = renameStore.rule

    // Confirm if overwriting originals
    if (rule.outputMode === 'overwrite') {
      try {
        await ElMessageBox.confirm(
          '将直接覆盖原文件，此操作不可撤销。确定要继续吗？',
          '确认覆盖',
          { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
        )
      } catch {
        return // User cancelled
      }
    }

    // Check output directory is set
    if (rule.outputMode === 'newDirectory' && !rule.outputDirectory) {
      ElMessage.warning('请先选择输出目录')
      return
    }

    // Build execution plan
    const plan = previewItems.value
      .filter((item) => item.newName) // Skip items with empty name (conflict skip)
      .map((item) => ({
        source: item.sourcePath,
        target: `${item.targetDir}/${item.newName}`.replace(/\//g, '\\'),
        id: item.id
      }))

    // Set task
    const taskId = `rename-${Date.now()}`
    taskStore.setCurrentTask({
      id: taskId,
      type: 'rename',
      status: 'running',
      progress: 0,
      total: plan.length,
      completed: 0,
      message: '正在重命名...'
    })

    // Reset file statuses
    fileStore.resetAllStatus()

    try {
      const result = await window.api.executeRename(plan)
      taskStore.completeTask()

      if (result.failed > 0) {
        ElMessage.warning(`完成: ${result.success} 成功, ${result.failed} 失败`)
      } else {
        ElMessage.success(`全部完成: ${result.success} 个文件已重命名`)
      }
    } catch (err) {
      taskStore.updateProgress({ status: 'failed', message: '重命名失败' })
      ElMessage.error('重命名过程中发生错误')
    }
  }

  function setupProgressListener(): void {
    window.api.onTaskProgress((_event: unknown, progress: { id: string; completed: number; total: number; fileId: string; status: string; error?: string }) => {
      taskStore.updateProgress({
        completed: progress.completed,
        progress: Math.round((progress.completed / progress.total) * 100),
        message: `正在重命名... (${progress.completed}/${progress.total})`
      })

      if (progress.fileId && progress.status) {
        fileStore.updateFileStatus(
          progress.fileId,
          progress.status as 'done' | 'error',
          progress.error
        )
      }
    })
  }

  function cleanupProgressListener(): void {
    window.api.removeTaskProgressListener()
  }

  return {
    previewItems,
    canExecute,
    executeRename,
    setupProgressListener,
    cleanupProgressListener
  }
}
