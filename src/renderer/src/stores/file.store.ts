import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ImageFile {
  id: string
  name: string
  path: string
  size: number
  extension: string
  newName: string
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
}

export const useFileStore = defineStore('file', () => {
  const files = ref<ImageFile[]>([])
  const loading = ref(false)

  async function importFiles(): Promise<void> {
    loading.value = true
    try {
      const result = await window.api.selectFiles()
      const newFiles: ImageFile[] = result.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        name: f.name,
        path: f.path,
        size: f.size,
        extension: f.extension,
        newName: f.name,
        status: 'pending' as const
      }))
      files.value.push(...newFiles)
    } finally {
      loading.value = false
    }
  }

  async function importFolder(): Promise<void> {
    loading.value = true
    try {
      const result = await window.api.selectFolder()
      const newFiles: ImageFile[] = result.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        name: f.name,
        path: f.path,
        size: f.size,
        extension: f.extension,
        newName: f.name,
        status: 'pending' as const
      }))
      files.value.push(...newFiles)
    } finally {
      loading.value = false
    }
  }

  function removeFile(id: string): void {
    files.value = files.value.filter((f) => f.id !== id)
  }

  function clearFiles(): void {
    files.value = []
  }

  function updateFileName(id: string, newName: string): void {
    const file = files.value.find((f) => f.id === id)
    if (file) {
      file.newName = newName
    }
  }

  return { files, loading, importFiles, importFolder, removeFile, clearFiles, updateFileName }
})
