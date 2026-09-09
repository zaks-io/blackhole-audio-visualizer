export type ScreenPermissionStatus = "granted" | "denied" | "restricted" | "unknown";

export interface ElectronAPI {
  isElectron: boolean;
  enableLoopbackAudio: () => Promise<void>;
  disableLoopbackAudio: () => Promise<void>;
  getScreenPermissionStatus: () => Promise<ScreenPermissionStatus>;
  requestScreenPermission: () => Promise<boolean>;
  openScreenRecordingPreferences: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
  getAlwaysOnTop: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
