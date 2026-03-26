import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { fileService } from "./services/file.service";
import { renameService } from "./services/rename.service";
import type {
  RenamePlanItem,
  ConflictStrategy,
} from "./services/rename.service";

const isDev = !app.isPackaged;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function registerIpcHandlers(): void {
  // File operations
  ipcMain.handle("file:select", async () => {
    return fileService.selectFiles();
  });

  ipcMain.handle("file:selectFolder", async () => {
    return fileService.selectFolder();
  });

  ipcMain.handle("file:getInfo", async (_event, filePath: string) => {
    return fileService.getFileInfo(filePath);
  });

  // Rename operations
  ipcMain.handle(
    "rename:execute",
    async (
      event,
      plan: RenamePlanItem[],
      conflictStrategy?: ConflictStrategy,
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) throw new Error("No window found");
      return renameService.execute(plan, window, conflictStrategy);
    },
  );

  // Directory selection
  ipcMain.handle("dialog:selectDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Compression operations (stub - Phase 4)
  ipcMain.handle("compress:execute", async () => {
    return;
  });

  // App info
  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });
}

app.whenReady().then(() => {
  app.on("browser-window-created", (_, window) => {
    // Open DevTools with F12 in dev mode
    if (isDev) {
      window.webContents.on("before-input-event", (event, input) => {
        if (input.key === "F12") {
          window.webContents.toggleDevTools();
          event.preventDefault();
        }
      });
    }
  });

  registerIpcHandlers();
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
