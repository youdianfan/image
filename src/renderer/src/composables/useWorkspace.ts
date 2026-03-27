import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessageBox } from "element-plus";
import { useFileStore } from "@/stores/file.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useSettingsStore } from "@/stores/settings.store";
import { useTaskStore } from "@/stores/task.store";
import { applyTemplate, buildContext } from "@/utils/template-engine";
import {
  sanitizeFilename,
  truncateFilename,
  formatFileSize,
} from "@/utils/filename-sanitizer";
import { containsChinese } from "@/utils/nameConverter";
import { detectAndResolveConflicts } from "@/utils/conflict-detector";
import type { FileListItem } from "@/components/FileList.vue";

export interface WorkspacePreviewItem extends FileListItem {
  sourcePath: string;
  targetDir: string;
}

export function useWorkspace() {
  const { t } = useI18n();
  const fileStore = useFileStore();
  const wsStore = useWorkspaceStore();
  const settingsStore = useSettingsStore();
  const taskStore = useTaskStore();

  // Map compress target paths to file IDs for progress tracking
  const compressPathToIdMap = ref(new Map<string, string>());

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
      conflictStrategy: settingsStore.conflictStrategy,
      outputMode: wsStore.output.mode,
      outputDirectory: wsStore.output.directory,
      preserveStructure: false,
    };
  }

  const previewItems = computed<WorkspacePreviewItem[]>(() => {
    // 读取翻译版本号，确保翻译完成后触发重新计算
    void fileStore.translationVersion;
    const files = fileStore.files;
    if (files.length === 0) return [];

    const rule = getRenameRule();

    const rawItems = files.map((file, index) => {
      let newName: string;

      if (file.hasManualOverride) {
        newName = file.newName;
      } else {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
        const isChinese = containsChinese(nameWithoutExt);
        const wasTranslated = isChinese && file.translatedName !== file.name;

        if (wsStore.rename.enabled && wasTranslated) {
          // Rename enabled + translated: apply template to translated name
          const context = buildContext(
            file.name,
            file.extension,
            index,
            rule,
            file.translatedName,
          );
          newName = applyTemplate(rule.template, context, rule);
          newName = sanitizeFilename(newName);
          newName = truncateFilename(newName);
        } else if (wasTranslated) {
          // Translated but rename not enabled: use translated name directly
          newName = file.translatedName;
        } else {
          // Not translated (English file or translation pending): keep original
          newName = file.name;
        }
      }

      // Apply output format extension when compress with format conversion is enabled
      if (
        wsStore.compress.enabled &&
        wsStore.compress.outputFormat !== "original"
      ) {
        newName = newName.replace(
          /\.[^.]+$/,
          `.${wsStore.compress.outputFormat}`,
        );
      }

      // Target directory
      let targetDir: string;
      const lastSep =
        file.path.lastIndexOf("\\") !== -1
          ? file.path.lastIndexOf("\\")
          : file.path.lastIndexOf("/");
      const sourceDir = file.path.substring(0, lastSep);

      if (wsStore.output.mode === "autoDirectory") {
        targetDir = sourceDir + "\\output";
      } else if (
        wsStore.output.mode === "customDirectory" &&
        wsStore.output.directory
      ) {
        targetDir = wsStore.output.directory;
      } else {
        targetDir = sourceDir;
      }

      return {
        id: file.id,
        originalName: file.name,
        originalPath: file.path,
        imageUrl:
          "local-image://localhost?path=" + encodeURIComponent(file.path),
        newName,
        sizeText: formatFileSize(file.size),
        compressedSizeText: file.compressedSize
          ? formatFileSize(file.compressedSize)
          : "--",
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
        settingsStore.conflictStrategy,
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
      (wsStore.output.mode !== "customDirectory" || !!wsStore.output.directory)
    );
  });

  async function execute(): Promise<void> {
    if (!canExecute.value) return;

    // Confirm if overwriting originals
    if (wsStore.output.mode === "overwrite") {
      try {
        await ElMessageBox.confirm(
          t("task.confirmOverwrite"),
          t("task.confirmOverwriteTitle"),
          {
            type: "warning",
            confirmButtonText: t("task.confirm"),
            cancelButtonText: t("task.cancel"),
          },
        );
      } catch {
        return;
      }
    }

    if (
      wsStore.output.mode === "customDirectory" &&
      !wsStore.output.directory
    ) {
      ElMessage.warning(t("task.selectOutputDir"));
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
      message: t("task.processing"),
    });

    let completedSteps = 0;
    let renameFailed = 0;
    let compressFailed = 0;
    const failedSources = new Set<string>();

    try {
      // Step 1: Rename (or copy to target directory)
      const copyOnly = wsStore.output.mode !== "overwrite";
      if (wsStore.rename.enabled || copyOnly) {
        const plan = items.map((item) => ({
          source: item.sourcePath,
          target: `${item.targetDir}\\${item.newName}`,
          id: item.id,
        }));
        taskStore.updateProgress({
          message: copyOnly ? t("task.copying") : t("task.renaming"),
        });
        const renameResult = await window.api.executeRename(
          plan,
          undefined,
          copyOnly,
        );
        completedSteps += items.length;
        taskStore.updateProgress({
          completed: completedSteps,
          progress: Math.round((completedSteps / totalSteps) * 100),
        });

        renameFailed = renameResult.failed;
        for (const err of renameResult.errors) {
          failedSources.add(err.source);
        }
      }

      // Check for cancellation between steps
      if (taskStore.isCancelling) {
        taskStore.completeTask(t("task.cancelledMessage"));
        return;
      }

      // Step 2: Compress
      if (wsStore.compress.enabled) {
        // Determine which files to compress (renamed targets or originals)
        const filesToCompress =
          wsStore.rename.enabled || copyOnly
            ? items.map((item) => `${item.targetDir}\\${item.newName}`)
            : items.map((item) => item.sourcePath);

        // Build path-to-id map for compress progress tracking
        compressPathToIdMap.value.clear();
        for (let i = 0; i < filesToCompress.length; i++) {
          compressPathToIdMap.value.set(filesToCompress[i], items[i].id);
        }

        const compressOptions = {
          quality: wsStore.compress.quality,
          scale: wsStore.compress.scale,
          stripExif: wsStore.compress.stripExif,
          outputFormat: wsStore.compress.outputFormat,
          // Compress in-place (files are already in target directory)
          outputDirectory:
            wsStore.output.mode === "customDirectory"
              ? wsStore.output.directory
              : "",
        };

        taskStore.updateProgress({ message: t("task.compressing") });
        const compressResult = await window.api.compressImages(
          filesToCompress,
          compressOptions,
        );
        completedSteps += items.length;
        taskStore.updateProgress({
          completed: completedSteps,
          progress: Math.round((completedSteps / totalSteps) * 100),
        });

        compressFailed = compressResult.failed;
      }

      // Update file paths so re-execution uses correct source locations
      // Only when files were moved (overwrite mode), not copied (newDirectory mode)
      if (wsStore.output.mode === "overwrite") {
        for (const item of items) {
          if (!failedSources.has(item.sourcePath)) {
            fileStore.updateFilePath(
              item.id,
              `${item.targetDir}\\${item.newName}`,
            );
          }
        }
      }

      // Show result in bottom status bar
      const totalFailed = renameFailed + compressFailed;
      if (totalFailed > 0) {
        const parts: string[] = [];
        if (renameFailed > 0)
          parts.push(t("task.renameFailed", { count: renameFailed }));
        if (compressFailed > 0)
          parts.push(t("task.compressFailed", { count: compressFailed }));
        taskStore.completeTask(
          t("task.completeWithIssues", { issues: parts.join("，") }),
        );
      } else {
        taskStore.completeTask(t("task.complete"));
      }
    } catch {
      taskStore.failTask(t("task.failed"));
    } finally {
      // Auto-clear status after a delay so the user can read the result
      setTimeout(() => taskStore.clearTask(), 3000);
    }
  }

  function cancelExecution(): void {
    taskStore.cancelTask();
  }

  const canOpenOutputDir = computed(() => {
    if (wsStore.output.mode === "customDirectory") {
      return !!wsStore.output.directory;
    }
    return fileStore.files.length > 0;
  });

  async function openOutputDirectory(): Promise<void> {
    let dirPath: string;

    if (wsStore.output.mode === "customDirectory" && wsStore.output.directory) {
      dirPath = wsStore.output.directory;
    } else if (fileStore.files.length > 0) {
      const firstFile = fileStore.files[0];
      const lastSep =
        firstFile.path.lastIndexOf("\\") !== -1
          ? firstFile.path.lastIndexOf("\\")
          : firstFile.path.lastIndexOf("/");
      const sourceDir = firstFile.path.substring(0, lastSep);
      dirPath =
        wsStore.output.mode === "autoDirectory"
          ? sourceDir + "\\output"
          : sourceDir;
    } else {
      return;
    }

    await window.api.openDirectory(dirPath);
  }

  function setupProgressListener(): void {
    window.api.onTaskProgress(
      (
        _event: unknown,
        progress: {
          completed: number;
          total: number;
          fileId?: string;
          filePath?: string;
          compressedSize?: number;
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

        // Capture per-file compressed size from compress progress events
        if (
          progress.filePath &&
          progress.compressedSize &&
          progress.status === "done"
        ) {
          const fileId = compressPathToIdMap.value.get(progress.filePath);
          if (fileId) {
            fileStore.updateCompressedSize(fileId, progress.compressedSize);
          }
        }
      },
    );
  }

  function cleanupProgressListener(): void {
    window.api.removeTaskProgressListener();
  }

  async function compressSingleFile(fileId: string): Promise<void> {
    const file = fileStore.files.find((f) => f.id === fileId);
    if (!file || taskStore.isRunning) return;

    const compressOptions = {
      quality: wsStore.compress.quality,
      scale: wsStore.compress.scale,
      stripExif: wsStore.compress.stripExif,
      outputFormat: wsStore.compress.outputFormat,
      outputDirectory: "",
    };

    // Use original file path for individual compression
    const filePath = file.path;

    // Set up path map for progress tracking
    compressPathToIdMap.value.set(filePath, fileId);

    fileStore.updateFileStatus(fileId, "processing");

    try {
      const result = await window.api.compressImages([filePath], compressOptions);
      if (result.failed > 0) {
        fileStore.updateFileStatus(fileId, "error", result.errors[0]?.error);
      } else {
        fileStore.updateFileStatus(fileId, "done");
        // Fallback: set compressed size from result if progress listener didn't capture it
        if (result.totalCompressedSize > 0 && !file.compressedSize) {
          fileStore.updateCompressedSize(fileId, result.totalCompressedSize);
        }
      }
    } catch (err) {
      fileStore.updateFileStatus(fileId, "error", String(err));
    }
  }

  return {
    previewItems,
    canExecute,
    canOpenOutputDir,
    execute,
    cancelExecution,
    openOutputDirectory,
    setupProgressListener,
    cleanupProgressListener,
    compressSingleFile,
  };
}
