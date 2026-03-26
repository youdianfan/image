import { contextBridge, ipcRenderer } from "electron";

const api = {
  // File operations
  selectFiles: (): Promise<unknown[]> => ipcRenderer.invoke("file:select"),
  selectFolder: (): Promise<unknown[]> =>
    ipcRenderer.invoke("file:selectFolder"),
  getFileInfo: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke("file:getInfo", filePath),

  // Rename operations
  executeRename: (
    plan: unknown[],
    conflictStrategy?: string,
  ): Promise<unknown> =>
    ipcRenderer.invoke("rename:execute", plan, conflictStrategy),

  // Directory selection
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:selectDirectory"),

  // Compression operations
  compressImages: (files: string[], options: unknown): Promise<unknown> =>
    ipcRenderer.invoke("compress:execute", files, options),

  // Image metadata
  getImageMetadata: (
    filePath: string,
  ): Promise<{ width: number; height: number; format: string }> =>
    ipcRenderer.invoke("file:getImageMetadata", filePath),

  // Task system (main -> renderer events)
  onTaskProgress: (callback: (...args: unknown[]) => void): void => {
    ipcRenderer.on("task:progress", callback);
  },
  removeTaskProgressListener: (): void => {
    ipcRenderer.removeAllListeners("task:progress");
  },

  // App info
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("app:getVersion"),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api;
}
