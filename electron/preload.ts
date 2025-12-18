import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "../types/electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  enableLoopbackAudio: () => ipcRenderer.invoke("enable-loopback-audio"),
  disableLoopbackAudio: () => ipcRenderer.invoke("disable-loopback-audio"),
  getScreenPermissionStatus: () => ipcRenderer.invoke("get-screen-permission-status"),
  requestScreenPermission: () => ipcRenderer.invoke("request-screen-permission"),
  openScreenRecordingPreferences: () => ipcRenderer.invoke("open-screen-recording-preferences"),
} satisfies ElectronAPI);
