import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // File operations
  selectFiles: (): Promise<unknown[]> => ipcRenderer.invoke('file:select'),
  selectFolder: (): Promise<unknown[]> => ipcRenderer.invoke('file:selectFolder'),
  getFileInfo: (filePath: string): Promise<unknown> => ipcRenderer.invoke('file:getInfo', filePath),

  // Rename operations
  previewRename: (files: unknown[], rules: unknown): Promise<unknown[]> =>
    ipcRenderer.invoke('rename:preview', files, rules),
  executeRename: (plan: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke('rename:execute', plan),

  // Compression operations
  compressImages: (files: string[], options: unknown): Promise<void> =>
    ipcRenderer.invoke('compress:execute', files, options),

  // Task system (main -> renderer events)
  onTaskProgress: (callback: (...args: unknown[]) => void): void => {
    ipcRenderer.on('task:progress', callback)
  },
  removeTaskProgressListener: (): void => {
    ipcRenderer.removeAllListeners('task:progress')
  },

  // App info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
