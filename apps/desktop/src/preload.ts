import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "../types/electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  enableLoopbackAudio: () => ipcRenderer.invoke("enable-loopback-audio"),
  disableLoopbackAudio: () => ipcRenderer.invoke("disable-loopback-audio"),
  getScreenPermissionStatus: () => ipcRenderer.invoke("get-screen-permission-status"),
  requestScreenPermission: () => ipcRenderer.invoke("request-screen-permission"),
  openScreenRecordingPreferences: () => ipcRenderer.invoke("open-screen-recording-preferences"),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  onAuthCallback: (callback: (data: { code: string; state: string }) => void) => {
    ipcRenderer.on("auth-callback", (_event, data) => callback(data));
  },
  onAuthCallbackError: (callback: (error: string) => void) => {
    ipcRenderer.on("auth-callback-error", (_event, error) => callback(error));
  },
  removeAuthCallbackListeners: () => {
    ipcRenderer.removeAllListeners("auth-callback");
    ipcRenderer.removeAllListeners("auth-callback-error");
  },
  exchangeAuthCode: (code: string, codeVerifier: string, domain: string, clientId: string) =>
    ipcRenderer.invoke("exchange-auth-code", { code, codeVerifier, domain, clientId }),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke("set-always-on-top", enabled),
  getAlwaysOnTop: () => ipcRenderer.invoke("get-always-on-top"),
} satisfies ElectronAPI);
