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

app.whenReady().then(() => {
  // Handle app:// protocol requests - serves static files from out/ directory
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    // Fix webpack worker chunk loading bug - it doubles the _next/static/chunks/ path
    pathname = pathname.replace(
      "/_next/static/chunks/_next/static/chunks/",
      "/_next/static/chunks/"
    );

    const filePath = path.join(__dirname, "../out", pathname);
    return net.fetch(pathToFileURL(filePath).toString());
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
