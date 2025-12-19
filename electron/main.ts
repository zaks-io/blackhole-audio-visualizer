import { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences, shell } from "electron";
import path from "path";
import { initMain } from "electron-audio-loopback";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Initialize the electron-audio-loopback library (must be before app.whenReady)
initMain();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#000000",
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
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
