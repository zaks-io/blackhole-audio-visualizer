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

// Register deep link protocol for auth callbacks (must be before app.whenReady)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("blackhole", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("blackhole");
}

let mainWindow: BrowserWindow | null = null;

// Handle auth callback from deep link
async function handleAuthCallback(url: string) {
  if (!mainWindow) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();

  // Parse callback URL
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get("code");
  const state = urlObj.searchParams.get("state");

  if (!code || !state) {
    mainWindow.webContents.send("auth-callback-error", "Missing code or state");
    return;
  }

  // Send code and state to renderer for validation and token storage
  // The renderer will send back the code_verifier, then we exchange
  mainWindow.webContents.send("auth-callback", { code, state });
}

// Exchange auth code for tokens (in main process to avoid CORS)
ipcMain.handle(
  "exchange-auth-code",
  async (
    _event,
    {
      code,
      codeVerifier,
      domain,
      clientId,
    }: { code: string; codeVerifier: string; domain: string; clientId: string }
  ) => {
    const REDIRECT_URI = "blackhole://callback";

    const response = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }
);

// Single instance lock (required for Windows/Linux deep links)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Windows/Linux: deep link comes via second-instance event
  app.on("second-instance", (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith("blackhole://"));
    if (url) {
      handleAuthCallback(url);
    }
  });
}

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

// Open URL in system browser (for auth)
ipcMain.handle("open-external", async (_event, url: string) => {
  await shell.openExternal(url);
});

// macOS: deep link comes via open-url event
app.on("open-url", (event, url) => {
  event.preventDefault();
  if (url.startsWith("blackhole://")) {
    handleAuthCallback(url);
  }
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
