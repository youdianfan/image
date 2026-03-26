import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { aiTranslator, type ModelStatus } from "@/services/aiTranslator";

export const useAiStore = defineStore("ai", () => {
  const modelStatus = ref<ModelStatus>("loading");
  const errorMessage = ref("");

  const isReady = computed(() => modelStatus.value === "ready");
  const isLoading = computed(() => modelStatus.value === "loading");

  async function loadModel(): Promise<void> {
    try {
      modelStatus.value = "loading";
      errorMessage.value = "";

      await aiTranslator.loadModel();

      modelStatus.value = "ready";
    } catch (err) {
      modelStatus.value = "error";
      errorMessage.value = err instanceof Error ? err.message : String(err);
    }
  }

  function syncStatus(): void {
    modelStatus.value = aiTranslator.status;
    errorMessage.value = aiTranslator.errorMessage;
  }

  return {
    modelStatus,
    errorMessage,
    isReady,
    isLoading,
    loadModel,
    syncStatus,
  };
});
