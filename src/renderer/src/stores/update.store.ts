import { defineStore } from "pinia";
import { ref } from "vue";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export const useUpdateStore = defineStore("update", () => {
  const status = ref<UpdateStatus>("idle");
  const latestVersion = ref("");
  const downloadProgress = ref(0);
  const errorMessage = ref("");

  // --- Mock implementation (replace with real API later) ---

  function checkForUpdate(): void {
    status.value = "checking";
    errorMessage.value = "";

    setTimeout(() => {
      // Mock: simulate finding a new version
      const hasUpdate = Math.random() > 0.5;
      if (hasUpdate) {
        latestVersion.value = "1.1.0";
        status.value = "available";
      } else {
        status.value = "up-to-date";
      }
    }, 1500);
  }

  function downloadUpdate(): void {
    if (status.value !== "available") return;

    status.value = "downloading";
    downloadProgress.value = 0;

    const interval = setInterval(() => {
      downloadProgress.value += Math.floor(Math.random() * 15) + 5;
      if (downloadProgress.value >= 100) {
        downloadProgress.value = 100;
        status.value = "ready";
        clearInterval(interval);
      }
    }, 300);
  }

  function installUpdate(): void {
    if (status.value !== "ready") return;
    // Mock: in real implementation, this would trigger app restart
    // For now, just reset state
    status.value = "idle";
    downloadProgress.value = 0;
    latestVersion.value = "";
  }

  function reset(): void {
    status.value = "idle";
    latestVersion.value = "";
    downloadProgress.value = 0;
    errorMessage.value = "";
  }

  return {
    status,
    latestVersion,
    downloadProgress,
    errorMessage,
    checkForUpdate,
    downloadUpdate,
    installUpdate,
    reset,
  };
});
