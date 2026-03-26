import fs from "fs/promises";
import path from "path";
import { BrowserWindow } from "electron";

export type ConflictStrategy = "autoNumber" | "overwrite" | "skip";

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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function insertBeforeExtension(filePath: string, suffix: string): string {
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length || undefined);
  return `${base}${suffix}${ext}`;
}

export class RenameService {
  async execute(
    plan: RenamePlanItem[],
    window: BrowserWindow,
    conflictStrategy: ConflictStrategy = "autoNumber",
  ): Promise<RenameResult> {
    const result: RenameResult = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const total = plan.length;

    for (let i = 0; i < plan.length; i++) {
      const item = plan[i];

      try {
        // Ensure target directory exists
        const targetDir = path.dirname(item.target);
        await fs.mkdir(targetDir, { recursive: true });

        // Resolve on-disk conflict
        const { finalPath, shouldSkip } = await this.resolveOnDiskConflict(
          item.target,
          conflictStrategy,
        );

        if (shouldSkip) {
          result.skipped++;
          this.sendProgress(window, {
            id: item.id,
            completed: i + 1,
            total,
            fileId: item.id,
            status: "done",
          });
          continue;
        }

        // Execute rename/copy
        await this.moveFile(item.source, finalPath);

        result.success++;
        this.sendProgress(window, {
          id: item.id,
          completed: i + 1,
          total,
          fileId: item.id,
          status: "done",
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        result.failed++;
        result.errors.push({ source: item.source, error: errorMsg });

        this.sendProgress(window, {
          id: item.id,
          completed: i + 1,
          total,
          fileId: item.id,
          status: "error",
          error: errorMsg,
        });
      }
    }

    return result;
  }

  private async moveFile(source: string, target: string): Promise<void> {
    // If source and target are the same, nothing to do
    if (path.resolve(source) === path.resolve(target)) return;

    try {
      // Try rename first (fast, atomic, same volume)
      await fs.rename(source, target);
    } catch (err: unknown) {
      // EXDEV = cross-device link, fall back to copy + delete
      if ((err as NodeJS.ErrnoException).code === "EXDEV") {
        await fs.copyFile(source, target);
        await fs.unlink(source);
      } else {
        throw err;
      }
    }
  }

  private async resolveOnDiskConflict(
    targetPath: string,
    strategy: ConflictStrategy,
  ): Promise<{ finalPath: string; shouldSkip: boolean }> {
    const exists = await fileExists(targetPath);

    if (!exists) {
      return { finalPath: targetPath, shouldSkip: false };
    }

    switch (strategy) {
      case "autoNumber": {
        let counter = 1;
        let candidate = targetPath;
        while (await fileExists(candidate)) {
          candidate = insertBeforeExtension(targetPath, `-${counter}`);
          counter++;
        }
        return { finalPath: candidate, shouldSkip: false };
      }
      case "overwrite":
        return { finalPath: targetPath, shouldSkip: false };
      case "skip":
        return { finalPath: targetPath, shouldSkip: true };
      default:
        return { finalPath: targetPath, shouldSkip: false };
    }
  }

  private sendProgress(
    window: BrowserWindow,
    data: {
      id: string;
      completed: number;
      total: number;
      fileId: string;
      status: string;
      error?: string;
    },
  ): void {
    try {
      window.webContents.send("task:progress", data);
    } catch {
      // Window may be closed
    }
  }
}

export const renameService = new RenameService();
