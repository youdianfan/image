import { contextBridge, ipcRenderer, webUtils } from "electron";

// Capture-phase drop handler: extract file paths using webUtils before
// the renderer's bubble-phase handler fires. File objects cannot be passed
// through contextBridge (structured clone loses internal path data), so we
// store paths here and let the renderer retrieve them synchronously.
let _lastDropPaths: string[] = [];

window.addEventListener(
  "drop",
  (e) => {
    const files = e.dataTransfer?.files;
    _lastDropPaths = [];
    if (files) {
      for (let i = 0; i < files.length; i++) {
        _lastDropPaths.push(webUtils.getPathForFile(files[i]));
      }
    }
  },
  true, // capture phase — runs before any bubble-phase handler
);

const api = {
  // File operations
  selectFiles: (): Promise<unknown[]> => ipcRenderer.invoke("file:select"),
  selectFolder: (): Promise<unknown[]> =>
    ipcRenderer.invoke("file:selectFolder"),
  getFileInfo: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke("file:getInfo", filePath),
  scanDirectory: (dirPath: string): Promise<unknown[]> =>
    ipcRenderer.invoke("file:scanDirectory", dirPath),

  // Drag-and-drop: retrieve paths stored by the capture-phase handler above
  getLastDropPaths: (): string[] => {
    const paths = [..._lastDropPaths];
    _lastDropPaths = [];
    return paths;
  },

  // Rename operations
  executeRename: (
    plan: unknown[],
    conflictStrategy?: string,
    copyOnly?: boolean,
  ): Promise<unknown> =>
    ipcRenderer.invoke("rename:execute", plan, conflictStrategy, copyOnly),

  // Directory selection
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:selectDirectory"),

  // Open directory in OS file explorer
  openDirectory: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke("shell:openDirectory", dirPath),

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

  // Locale
  setLocale: (locale: string): void => {
    ipcRenderer.send("app:setLocale", locale);
  },
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
