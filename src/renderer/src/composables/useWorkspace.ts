import { computed } from "vue";
import { ElMessageBox, ElMessage } from "element-plus";
import { useFileStore } from "@/stores/file.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useTaskStore } from "@/stores/task.store";
import { applyTemplate, buildContext } from "@/utils/template-engine";
import {
  sanitizeFilename,
  truncateFilename,
  formatFileSize,
} from "@/utils/filename-sanitizer";
import { detectAndResolveConflicts } from "@/utils/conflict-detector";
import type { FileListItem } from "@/components/FileList.vue";

export interface WorkspacePreviewItem extends FileListItem {
  sourcePath: string;
  targetDir: string;
}

export function useWorkspace() {
  const fileStore = useFileStore();
  const wsStore = useWorkspaceStore();
  const taskStore = useTaskStore();

  // Adapt workspace rename config to the format expected by template engine
  function getRenameRule() {
    const r = wsStore.rename;
    return {
      template: r.template,
      type: "",
      module: "",
      startIndex: r.startIndex,
      indexStep: r.indexStep,
      indexDigits: r.indexDigits,
      conflictStrategy: r.conflictStrategy,
      outputMode: wsStore.output.mode,
      outputDirectory: wsStore.output.directory,
      preserveStructure: false,
    };
  }

  const previewItems = computed<WorkspacePreviewItem[]>(() => {
    const files = fileStore.files;
    if (files.length === 0) return [];

    const rule = getRenameRule();

    const rawItems = files.map((file, index) => {
      let newName: string;

      if (file.hasManualOverride) {
        newName = file.newName;
      } else if (wsStore.rename.enabled) {
        const context = buildContext(file.name, file.extension, index, rule);
        newName = applyTemplate(rule.template, context, rule);
        newName = sanitizeFilename(newName);
        newName = truncateFilename(newName);
      } else {
        newName = file.name;
      }

      // Target directory
      let targetDir: string;
      if (
        wsStore.output.mode === "newDirectory" &&
        wsStore.output.directory
      ) {
        targetDir = wsStore.output.directory;
      } else {
        const lastSep =
          file.path.lastIndexOf("\\") !== -1
            ? file.path.lastIndexOf("\\")
            : file.path.lastIndexOf("/");
        targetDir = file.path.substring(0, lastSep);
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
        targetDir,
      };
    });

    // Conflict detection (only if renaming is active)
    if (wsStore.rename.enabled) {
      const conflictInput = rawItems.map((item) => ({
        id: item.id,
        path: item.sourcePath,
        newName: item.newName,
      }));
      const resolved = detectAndResolveConflicts(
        conflictInput,
        wsStore.rename.conflictStrategy,
      );
      return rawItems.map((item, index) => ({
        ...item,
        newName: resolved[index].resolvedName || item.newName,
        hasConflict: resolved[index].hasConflict,
      }));
    }

    return rawItems;
  });

  const canExecute = computed(() => {
    return (
      fileStore.files.length > 0 &&
      !taskStore.currentTask &&
      wsStore.hasAnyAction &&
      (wsStore.output.mode === "overwrite" || !!wsStore.output.directory)
    );
  });

  async function execute(): Promise<void> {
    if (!canExecute.value) return;

    // Confirm if overwriting originals
    if (wsStore.output.mode === "overwrite") {
      try {
        await ElMessageBox.confirm(
          "将直接覆盖原文件，此操作不可撤销。确定要继续吗？",
          "确认覆盖",
          {
            type: "warning",
            confirmButtonText: "确定",
            cancelButtonText: "取消",
          },
        );
      } catch {
        return;
      }
    }

    if (
      wsStore.output.mode === "newDirectory" &&
      !wsStore.output.directory
    ) {
      ElMessage.warning("请先选择输出目录");
      return;
    }

    fileStore.resetAllStatus();

    const items = previewItems.value.filter((item) => item.newName);
    const totalSteps =
      (wsStore.rename.enabled ? items.length : 0) +
      (wsStore.compress.enabled ? items.length : 0);

    taskStore.setCurrentTask({
      id: `workspace-${Date.now()}`,
      type: "rename",
      status: "running",
      progress: 0,
      total: totalSteps,
      completed: 0,
      message: "处理中...",
    });

    let completedSteps = 0;

    try {
      // Step 1: Rename (or copy to target directory)
      if (wsStore.rename.enabled || wsStore.output.mode === "newDirectory") {
        const plan = items.map((item) => ({
          source: item.sourcePath,
          target: `${item.targetDir}\\${item.newName}`,
          id: item.id,
        }));

        taskStore.updateProgress({ message: "正在重命名..." });
        const renameResult = await window.api.executeRename(plan);
        completedSteps += items.length;
        taskStore.updateProgress({
          completed: completedSteps,
          progress: Math.round((completedSteps / totalSteps) * 100),
        });

        if (renameResult.failed > 0) {
          ElMessage.warning(
            `重命名: ${renameResult.success} 成功, ${renameResult.failed} 失败`,
          );
        }
      }

      // Step 2: Compress
      if (wsStore.compress.enabled) {
        // Determine which files to compress (renamed targets or originals)
        const filesToCompress =
          wsStore.rename.enabled || wsStore.output.mode === "newDirectory"
            ? items.map((item) => `${item.targetDir}\\${item.newName}`)
            : items.map((item) => item.sourcePath);

        const compressOptions = {
          quality: wsStore.compress.quality,
          scale: wsStore.compress.scale,
          stripExif: wsStore.compress.stripExif,
          outputFormat: wsStore.compress.outputFormat,
          // Compress in-place (files are already in target directory)
          outputDirectory:
            wsStore.output.mode === "newDirectory"
              ? wsStore.output.directory
              : "",
        };

        taskStore.updateProgress({ message: "正在压缩..." });
        const compressResult = await window.api.compressImages(
          filesToCompress,
          compressOptions,
        );
        completedSteps += items.length;
        taskStore.updateProgress({
          completed: completedSteps,
          progress: Math.round((completedSteps / totalSteps) * 100),
        });

        if (compressResult.failed > 0) {
          ElMessage.warning(
            `压缩: ${compressResult.success} 成功, ${compressResult.failed} 失败`,
          );
        }
      }

      taskStore.completeTask();
      ElMessage.success("处理完成");
    } catch {
      taskStore.updateProgress({ status: "failed", message: "处理失败" });
      ElMessage.error("处理过程中发生错误");
    }
  }

  function setupProgressListener(): void {
    window.api.onTaskProgress(
      (
        _event: unknown,
        progress: {
          completed: number;
          total: number;
          fileId?: string;
          status?: string;
          error?: string;
        },
      ) => {
        if (progress.fileId && progress.status) {
          fileStore.updateFileStatus(
            progress.fileId,
            progress.status as "done" | "error",
            progress.error,
          );
        }
      },
    );
  }

  function cleanupProgressListener(): void {
    window.api.removeTaskProgressListener();
  }

  return {
    previewItems,
    canExecute,
    execute,
    setupProgressListener,
    cleanupProgressListener,
  };
}
