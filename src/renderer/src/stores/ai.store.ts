import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  aiTranslator,
  getSavedMirrorUrl,
  saveMirrorUrl,
  type ModelStatus,
} from "@/services/aiTranslator";

export const useAiStore = defineStore("ai", () => {
  const modelStatus = ref<ModelStatus>("not-downloaded");
  const downloadProgress = ref(0);
  const errorMessage = ref("");
  const mirrorUrl = ref(getSavedMirrorUrl());

  const isReady = computed(() => modelStatus.value === "ready");
  const isDownloading = computed(() => modelStatus.value === "downloading");

  function setMirrorUrl(url: string): void {
    mirrorUrl.value = url;
    saveMirrorUrl(url);
  }

  async function loadModel(): Promise<void> {
    try {
      modelStatus.value = "downloading";
      downloadProgress.value = 0;
      errorMessage.value = "";

      await aiTranslator.loadModel((progress) => {
        downloadProgress.value = progress;
      });

      modelStatus.value = "ready";
    } catch (err) {
      modelStatus.value = "error";
      errorMessage.value = err instanceof Error ? err.message : String(err);
    }
  }

  function syncStatus(): void {
    modelStatus.value = aiTranslator.status;
    downloadProgress.value = aiTranslator.progress;
    errorMessage.value = aiTranslator.errorMessage;
  }

  return {
    modelStatus,
    downloadProgress,
    errorMessage,
    mirrorUrl,
    isReady,
    isDownloading,
    setMirrorUrl,
    loadModel,
    syncStatus,
  };
});
