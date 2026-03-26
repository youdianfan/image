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
  hasManualOverride: boolean
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'])

export const useFileStore = defineStore('file', () => {
  const files = ref<ImageFile[]>([])
  const loading = ref(false)

  function createImageFile(f: { name: string; path: string; size: number; extension: string }, index: number): ImageFile {
    return {
      id: `${Date.now()}-${index}`,
      name: f.name,
      path: f.path,
      size: f.size,
      extension: f.extension,
      newName: f.name,
      status: 'pending',
      hasManualOverride: false
    }
  }

  function isDuplicate(filePath: string): boolean {
    return files.value.some((f) => f.path === filePath)
  }

  async function importFiles(): Promise<void> {
    loading.value = true
    try {
      const result = await window.api.selectFiles()
      const newFiles = result
        .filter((f) => !isDuplicate(f.path))
        .map((f, i) => createImageFile(f, i))
      files.value.push(...newFiles)
    } finally {
      loading.value = false
    }
  }

  async function importFolder(): Promise<void> {
    loading.value = true
    try {
      const result = await window.api.selectFolder()
      const newFiles = result
        .filter((f) => !isDuplicate(f.path))
        .map((f, i) => createImageFile(f, i))
      files.value.push(...newFiles)
    } finally {
      loading.value = false
    }
  }

  async function addFilesFromPaths(paths: string[]): Promise<void> {
    loading.value = true
    try {
      for (const filePath of paths) {
        if (isDuplicate(filePath)) continue
        const ext = filePath.split('.').pop()?.toLowerCase() || ''
        if (!IMAGE_EXTENSIONS.has(ext)) continue
        try {
          const info = await window.api.getFileInfo(filePath)
          files.value.push(createImageFile(info, files.value.length))
        } catch {
          // Skip files that can't be read
        }
      }
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

  function setManualOverride(id: string, newName: string): void {
    const file = files.value.find((f) => f.id === id)
    if (file) {
      file.newName = newName
      file.hasManualOverride = true
    }
  }

  function updateFileStatus(id: string, status: ImageFile['status'], error?: string): void {
    const file = files.value.find((f) => f.id === id)
    if (file) {
      file.status = status
      file.error = error
    }
  }

  function resetAllStatus(): void {
    files.value.forEach((f) => {
      f.status = 'pending'
      f.error = undefined
    })
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
    resetAllStatus
  }
})
