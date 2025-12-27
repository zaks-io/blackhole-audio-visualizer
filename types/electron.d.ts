export type ScreenPermissionStatus = "granted" | "denied" | "restricted" | "unknown";

export interface AuthTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface ElectronAPI {
  isElectron: boolean;
  enableLoopbackAudio: () => Promise<void>;
  disableLoopbackAudio: () => Promise<void>;
  getScreenPermissionStatus: () => Promise<ScreenPermissionStatus>;
  requestScreenPermission: () => Promise<boolean>;
  openScreenRecordingPreferences: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  onAuthCallback: (callback: (data: { code: string; state: string }) => void) => void;
  onAuthCallbackError: (callback: (error: string) => void) => void;
  removeAuthCallbackListeners: () => void;
  exchangeAuthCode: (
    code: string,
    codeVerifier: string,
    domain: string,
    clientId: string
  ) => Promise<AuthTokenResponse>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
