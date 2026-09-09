import {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  systemPreferences,
  shell,
  protocol,
  net,
} from "electron";
import path from "path";
import { stat } from "fs/promises";
import { pathToFileURL } from "url";
import { initMain } from "electron-audio-loopback";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Initialize the electron-audio-loopback library (must be before app.whenReady)
initMain();

// Register custom protocol for serving static files (must be before app.whenReady)
// This fixes web worker chunk loading issues with file:// protocol
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Blackhole Audio Visualizer",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#000000",
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000/app");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL("app://./app.html");
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Check screen recording permission status
ipcMain.handle("get-screen-permission-status", () => {
  if (process.platform === "darwin") {
    return systemPreferences.getMediaAccessStatus("screen");
  }
  return "granted";
});

// Request screen recording permission (macOS)
ipcMain.handle("request-screen-permission", async () => {
  if (process.platform === "darwin") {
    try {
      await desktopCapturer.getSources({ types: ["screen"] });
      return true;
    } catch {
      return false;
    }
  }
  return true;
});

// Open Screen Recording preferences (macOS)
ipcMain.handle("open-screen-recording-preferences", async () => {
  if (process.platform === "darwin") {
    await shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    );
    return true;
  }
  return false;
});

// Open help links in the system browser.
ipcMain.handle("open-external", async (_event, url: string) => {
  await shell.openExternal(url);
});

// Set always-on-top window state
ipcMain.handle("set-always-on-top", (_event, enabled: boolean) => {
  mainWindow?.setAlwaysOnTop(enabled);
  return mainWindow?.isAlwaysOnTop() ?? false;
});

// Get always-on-top window state
ipcMain.handle("get-always-on-top", () => {
  return mainWindow?.isAlwaysOnTop() ?? false;
});

app.whenReady().then(() => {
  // Handle app:// protocol requests - serves static files from out/ directory
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    // Fix webpack worker chunk loading bug - it doubles the _next/static/chunks/ path
    pathname = pathname.replace(
      "/_next/static/chunks/_next/static/chunks/",
      "/_next/static/chunks/"
    );

    const root = path.resolve(__dirname, "../out");
    const filePath = path.resolve(root, `.${pathname}`);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      return new Response("Not found", { status: 404 });
    }
    // Static Next routes must resolve on both navigation and reload.
    for (const candidate of [filePath, `${filePath}.html`, path.join(filePath, "index.html")]) {
      try {
        if ((await stat(candidate)).isFile()) return net.fetch(pathToFileURL(candidate).toString());
      } catch (error) {
        if (
          (error as NodeJS.ErrnoException).code !== "ENOENT" &&
          (error as NodeJS.ErrnoException).code !== "ENOTDIR"
        )
          throw error;
      }
    }
    return new Response("Not found", { status: 404 });
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
