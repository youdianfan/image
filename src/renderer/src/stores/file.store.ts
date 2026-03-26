import { defineStore } from "pinia";
import { ref } from "vue";
import { aiTranslator } from "@/services/aiTranslator";
import { containsChinese, convertName } from "@/utils/nameConverter";
import { useWorkspaceStore } from "@/stores/workspace.store";

export interface ImageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  extension: string;
  newName: string;
  translatedName: string; // AI-translated name (or original if no Chinese)
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  hasManualOverride: boolean;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "heic"]);

export const useFileStore = defineStore("file", () => {
  const files = ref<ImageFile[]>([]);
  const loading = ref(false);

  function createImageFile(
    f: { name: string; path: string; size: number; extension: string },
    index: number,
  ): ImageFile {
    return {
      id: `${Date.now()}-${index}`,
      name: f.name,
      path: f.path,
      size: f.size,
      extension: f.extension,
      newName: f.name,
      translatedName: f.name, // Will be updated by auto-translate
      status: "pending",
      hasManualOverride: false,
    };
  }

  /**
   * Auto-translate Chinese filenames to English using AI.
   * Non-blocking: updates translatedName in-place when translation completes.
   */
  async function autoTranslateFiles(newFiles: ImageFile[]): Promise<void> {
    if (!aiTranslator.isReady()) return;

    for (const file of newFiles) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      if (!containsChinese(nameWithoutExt)) continue;

      try {
        const translated = await aiTranslator.translate(nameWithoutExt);
        if (translated) {
          const workspaceStore = useWorkspaceStore();
          const formatted = convertName(translated, workspaceStore.rename.nameFormat);
          file.translatedName = `${formatted}.${file.extension}`;
        }
      } catch {
        // Keep original name on translation failure
      }
    }
  }

  function isDuplicate(filePath: string): boolean {
    return files.value.some((f) => f.path === filePath);
  }

  async function importFiles(): Promise<void> {
    loading.value = true;
    try {
      const result = await window.api.selectFiles();
      const newFiles = result
        .filter((f) => !isDuplicate(f.path))
        .map((f, i) => createImageFile(f, i));
      files.value.push(...newFiles);
      autoTranslateFiles(newFiles);
    } finally {
      loading.value = false;
    }
  }

  async function importFolder(): Promise<void> {
    loading.value = true;
    try {
      const result = await window.api.selectFolder();
      const newFiles = result
        .filter((f) => !isDuplicate(f.path))
        .map((f, i) => createImageFile(f, i));
      files.value.push(...newFiles);
      autoTranslateFiles(newFiles);
    } finally {
      loading.value = false;
    }
  }

  async function addFilesFromPaths(paths: string[]): Promise<void> {
    loading.value = true;
    try {
      for (const filePath of paths) {
        if (isDuplicate(filePath)) continue;
        const ext = filePath.split(".").pop()?.toLowerCase() || "";
        if (!IMAGE_EXTENSIONS.has(ext)) continue;
        try {
          const info = await window.api.getFileInfo(filePath);
          const newFile = createImageFile(info, files.value.length);
          files.value.push(newFile);
          autoTranslateFiles([newFile]);
        } catch {
          // Skip files that can't be read
        }
      }
    } finally {
      loading.value = false;
    }
  }

  function removeFile(id: string): void {
    files.value = files.value.filter((f) => f.id !== id);
  }

  function clearFiles(): void {
    files.value = [];
  }

  function updateFileName(id: string, newName: string): void {
    const file = files.value.find((f) => f.id === id);
    if (file) {
      file.newName = newName;
    }
  }

  function setManualOverride(id: string, newName: string): void {
    const file = files.value.find((f) => f.id === id);
    if (file) {
      file.newName = newName;
      file.hasManualOverride = true;
    }
  }

  function updateFileStatus(
    id: string,
    status: ImageFile["status"],
    error?: string,
  ): void {
    const file = files.value.find((f) => f.id === id);
    if (file) {
      file.status = status;
      file.error = error;
    }
  }

  function resetAllStatus(): void {
    files.value.forEach((f) => {
      f.status = "pending";
      f.error = undefined;
    });
  }

  return {
    files,
    loading,
    importFiles,
    importFolder,
    addFilesFromPaths,
    removeFile,
    clearFiles,
    updateFileName,
    setManualOverride,
    updateFileStatus,
    resetAllStatus,
  };
});
