export interface FileInfo {
  name: string
  path: string
  size: number
  extension: string
  isDirectory: boolean
}

export interface RenamePreviewItem {
  original: string
  renamed: string
}

export interface RenameResult {
  success: number
  failed: number
}

export interface RenamePlanItem {
  source: string
  target: string
}

export interface CompressOptions {
  quality: number
  scale: number
  stripExif: boolean
  outputFormat: 'original' | 'jpg' | 'webp' | 'png'
  outputDirectory: string
}

export interface TaskProgress {
  taskId: string
  progress: number
  total: number
  completed: number
  message: string
}

export interface ElectronAPI {
  // File operations
  selectFiles: () => Promise<FileInfo[]>
  selectFolder: () => Promise<FileInfo[]>
  getFileInfo: (filePath: string) => Promise<FileInfo>

  // Rename operations
  previewRename: (files: FileInfo[], rules: unknown) => Promise<RenamePreviewItem[]>
  executeRename: (plan: RenamePlanItem[]) => Promise<RenameResult>

  // Compression operations
  compressImages: (files: string[], options: CompressOptions) => Promise<void>

  // Task system events
  onTaskProgress: (callback: (event: unknown, progress: TaskProgress) => void) => void
  removeTaskProgressListener: () => void

  // App info
  getAppVersion: () => Promise<string>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
