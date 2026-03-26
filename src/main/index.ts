import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from "electron";
import { join } from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";
import { fileService } from "./services/file.service";
import { renameService } from "./services/rename.service";
import type {
  RenamePlanItem,
  ConflictStrategy,
} from "./services/rename.service";
import { imageService } from "./services/image.service";
import type { CompressOptions } from "./services/image.service";

const isDev = !app.isPackaged;

// Register custom protocol for serving local model files
protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-model",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

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

  ipcMain.handle("file:scanDirectory", async (_event, dirPath: string) => {
    return fileService.scanDirectory(dirPath);
  });

  // Rename operations
  ipcMain.handle(
    "rename:execute",
    async (
      event,
      plan: RenamePlanItem[],
      conflictStrategy?: ConflictStrategy,
      copyOnly?: boolean,
    ) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) throw new Error("No window found");
      return renameService.execute(plan, window, conflictStrategy, copyOnly);
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

  // Compression operations
  ipcMain.handle(
    "compress:execute",
    async (event, filePaths: string[], options: CompressOptions) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) throw new Error("No window found");
      return imageService.compressImages(filePaths, options, window);
    },
  );

  // Image metadata
  ipcMain.handle("file:getImageMetadata", async (_event, filePath: string) => {
    return imageService.getImageMetadata(filePath);
  });

  // App info
  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });
}

app.whenReady().then(() => {
  // Serve local model files via local-model:// protocol
  const modelsDir = isDev
    ? join(app.getAppPath(), "resources", "models")
    : join(process.resourcesPath, "models");

  protocol.handle("local-model", (request) => {
    // URL format: local-model://localhost/Xenova/opus-mt-zh-en/resolve/main/config.json
    // We need to strip /resolve/main/ and map to local file
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname)
      .replace(/\/resolve\/main\/?/, "/");
    const absolutePath = join(modelsDir, filePath);

    if (!existsSync(absolutePath)) {
      return new Response("Not Found", { status: 404 });
    }
    return net.fetch(pathToFileURL(absolutePath).toString());
  });

  app.on("browser-window-created", (_, window) => {
    window.webContents.on("before-input-event", (event, input) => {
      // ESC exits fullscreen
      if (input.key === "Escape" && window.isFullScreen()) {
        window.setFullScreen(false);
        event.preventDefault();
      }
      // F12 toggles DevTools in dev mode
      if (isDev && input.key === "F12") {
        window.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
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
