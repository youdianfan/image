import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
  Tray,
  Menu,
  nativeImage,
} from "electron";
import { join } from "path";
import { pathToFileURL } from "url";
import { existsSync, readFile } from "fs";
import { fileService } from "./services/file.service";
import { renameService } from "./services/rename.service";
import type {
  RenamePlanItem,
  ConflictStrategy,
} from "./services/rename.service";
import { imageService } from "./services/image.service";
import type { CompressOptions } from "./services/image.service";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let currentLocale = "zh-CN";

const trayLabels: Record<string, { open: string; quit: string }> = {
  "zh-CN": { open: "打开主页面", quit: "退出" },
  ja: { open: "メインウィンドウを開く", quit: "終了" },
  ko: { open: "메인 페이지 열기", quit: "종료" },
};

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
  {
    scheme: "local-image",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: "Image Rename AI",
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
    mainWindow!.show();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
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

function showOrCreateWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function buildTrayMenu(): void {
  if (!tray) return;
  const labels = trayLabels[currentLocale] || trayLabels["zh-CN"];
  const contextMenu = Menu.buildFromTemplate([
    { label: labels.open, click: showOrCreateWindow },
    { type: "separator" },
    {
      label: labels.quit,
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray(): void {
  const iconPath =
    process.platform === "win32"
      ? join(__dirname, "../../resources/icon.ico")
      : join(__dirname, "../../resources/icon.png");

  const icon = nativeImage.createFromPath(iconPath);
  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip("Image Rename AI");
  buildTrayMenu();

  tray.on("double-click", showOrCreateWindow);
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

  // Open directory in OS file explorer
  ipcMain.handle("shell:openDirectory", async (_event, dirPath: string) => {
    if (existsSync(dirPath)) {
      await shell.openPath(dirPath);
    } else {
      const lastSep = Math.max(
        dirPath.lastIndexOf("\\"),
        dirPath.lastIndexOf("/"),
      );
      const parentDir = lastSep > 0 ? dirPath.substring(0, lastSep) : "";
      if (parentDir && existsSync(parentDir)) {
        await shell.openPath(parentDir);
      }
    }
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

  // Locale — rebuild tray menu when renderer changes language
  ipcMain.on("app:setLocale", (_event, locale: string) => {
    currentLocale = locale;
    buildTrayMenu();
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
    const filePath = decodeURIComponent(url.pathname).replace(
      /\/resolve\/main\/?/,
      "/",
    );
    const absolutePath = join(modelsDir, filePath);

    if (!existsSync(absolutePath)) {
      return new Response("Not Found", { status: 404 });
    }
    return net.fetch(pathToFileURL(absolutePath).toString());
  });

  // Serve local image files via local-image:// protocol
  protocol.handle("local-image", (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.searchParams.get("path") || "");
    if (!filePath || !existsSync(filePath)) {
      return new Response("Not Found", { status: 404 });
    }
    // Read file into buffer then immediately release handle to avoid locking
    return new Promise<Response>((resolve) => {
      readFile(filePath, (err, data) => {
        if (err) {
          resolve(new Response("Read Error", { status: 500 }));
          return;
        }
        const ext = filePath.split(".").pop()?.toLowerCase() || "";
        const mimeMap: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          webp: "image/webp",
          gif: "image/gif",
          heic: "image/heic",
        };
        resolve(
          new Response(data, {
            headers: { "Content-Type": mimeMap[ext] || "application/octet-stream" },
          }),
        );
      });
    });
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
  createTray();

  app.on("activate", function () {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  // Do not quit — the app lives in the system tray
});
