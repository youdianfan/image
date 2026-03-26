export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  isDirectory: boolean;
}

export interface RenamePlanItem {
  source: string;
  target: string;
  id: string;
}

export interface RenameResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ source: string; error: string }>;
}

export interface CompressResult {
  success: number;
  failed: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  errors: Array<{ source: string; error: string }>;
}

export interface CompressOptions {
  quality: number;
  scale: number;
  stripExif: boolean;
  outputFormat: "original" | "jpg" | "webp" | "png";
  outputDirectory: string;
}

export interface TaskProgress {
  id: string;
  completed: number;
  total: number;
  fileId: string;
  status: string;
  error?: string;
}

export interface ElectronAPI {
  // File operations
  selectFiles: () => Promise<FileInfo[]>;
  selectFolder: () => Promise<FileInfo[]>;
  getFileInfo: (filePath: string) => Promise<FileInfo>;

  // Rename operations
  executeRename: (
    plan: RenamePlanItem[],
    conflictStrategy?: string,
  ) => Promise<RenameResult>;

  // Directory selection
  selectDirectory: () => Promise<string | null>;

  // Compression operations
  compressImages: (
    files: string[],
    options: CompressOptions,
  ) => Promise<CompressResult>;

  // Image metadata
  getImageMetadata: (
    filePath: string,
  ) => Promise<{ width: number; height: number; format: string }>;

  // Task system events
  onTaskProgress: (
    callback: (event: unknown, progress: TaskProgress) => void,
  ) => void;
  removeTaskProgressListener: () => void;

  // App info
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
