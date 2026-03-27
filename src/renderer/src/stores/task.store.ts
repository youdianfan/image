import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface TaskInfo {
  id: string;
  type: "rename" | "compress";
  status: "pending" | "running" | "paused" | "done" | "failed";
  progress: number;
  total: number;
  completed: number;
  message: string;
}

export const useTaskStore = defineStore("task", () => {
  const currentTask = ref<TaskInfo | null>(null);
  const taskHistory = ref<TaskInfo[]>([]);
  const isCancelling = ref(false);

  const isRunning = computed(() => currentTask.value?.status === "running");

  function setCurrentTask(task: TaskInfo): void {
    currentTask.value = task;
  }

  function updateProgress(progress: Partial<TaskInfo>): void {
    if (currentTask.value) {
      Object.assign(currentTask.value, progress);
    }
  }

  function completeTask(message?: string): void {
    if (currentTask.value) {
      currentTask.value.status = "done";
      currentTask.value.progress = 100;
      if (message) currentTask.value.message = message;
      taskHistory.value.push({ ...currentTask.value });
    }
  }

  function failTask(message: string): void {
    if (currentTask.value) {
      currentTask.value.status = "failed";
      currentTask.value.message = message;
      taskHistory.value.push({ ...currentTask.value });
    }
  }

  function cancelTask(): void {
    isCancelling.value = true;
    if (currentTask.value) {
      currentTask.value.message = "";
    }
  }

  function clearTask(): void {
    currentTask.value = null;
    isCancelling.value = false;
  }

  return {
    currentTask,
    taskHistory,
    isCancelling,
    isRunning,
    setCurrentTask,
    updateProgress,
    completeTask,
    failTask,
    cancelTask,
    clearTask,
  };
});
