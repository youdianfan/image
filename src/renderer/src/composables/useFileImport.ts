import { useFileStore } from "@/stores/file.store";

export function useFileImport(): {
  handleImportFiles: () => Promise<void>;
  handleImportFolder: () => Promise<void>;
  handleDrop: (paths: string[]) => Promise<void>;
  handleClear: () => void;
} {
  const fileStore = useFileStore();

  async function handleImportFiles(): Promise<void> {
    await fileStore.importFiles();
  }

  async function handleImportFolder(): Promise<void> {
    await fileStore.importFolder();
  }

  async function handleDrop(paths: string[]): Promise<void> {
    await fileStore.addFilesFromPaths(paths);
  }

  function handleClear(): void {
    fileStore.clearFiles();
  }

  return {
    handleImportFiles,
    handleImportFolder,
    handleDrop,
    handleClear,
  };
}
