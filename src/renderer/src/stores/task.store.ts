import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TaskInfo {
  id: string
  type: 'rename' | 'compress'
  status: 'pending' | 'running' | 'paused' | 'done' | 'failed'
  progress: number
  total: number
  completed: number
  message: string
}

export const useTaskStore = defineStore('task', () => {
  const currentTask = ref<TaskInfo | null>(null)
  const taskHistory = ref<TaskInfo[]>([])

  function setCurrentTask(task: TaskInfo): void {
    currentTask.value = task
  }

  function updateProgress(progress: Partial<TaskInfo>): void {
    if (currentTask.value) {
      Object.assign(currentTask.value, progress)
    }
  }

  function completeTask(): void {
    if (currentTask.value) {
      currentTask.value.status = 'done'
      taskHistory.value.push({ ...currentTask.value })
      currentTask.value = null
    }
  }

  return { currentTask, taskHistory, setCurrentTask, updateProgress, completeTask }
})
