"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { isElectron } from "@/lib/platform";
import { startElectronAuth, startElectronLogout } from "./electronAuth";

interface TokenData {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_at: number;
}

interface ElectronAuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: { name?: string; email?: string; picture?: string } | null;
  accessToken: string | null;
  idToken: string | null;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const ElectronAuthContext = createContext<ElectronAuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "electron_auth_tokens";
const USER_STORAGE_KEY = "electron_auth_user";

function parseJwt(token: string): Record<string, unknown> {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

function getStoredTokens(): TokenData | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;

  const tokens: TokenData = JSON.parse(stored);
  if (Date.now() >= tokens.expires_at) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
  return tokens;
}

function getStoredUser(): ElectronAuthContextValue["user"] {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

function storeTokens(tokens: TokenData): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

// Initialize state from localStorage synchronously to avoid hydration issues
function getInitialState(): { tokens: TokenData | null; user: ElectronAuthContextValue["user"] } {
  const storedTokens = getStoredTokens();
  if (!storedTokens) {
    return { tokens: null, user: null };
  }

  let userData = getStoredUser();
  if (!userData) {
    const claims = parseJwt(storedTokens.id_token);
    userData = {
      name: claims.name as string | undefined,
      email: claims.email as string | undefined,
      picture: claims.picture as string | undefined,
    };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  }

  return { tokens: storedTokens, user: userData };
}

interface ElectronAuthProviderProps {
  children: ReactNode;
}

export function ElectronAuthProvider({ children }: ElectronAuthProviderProps) {
  // Initialize synchronously from localStorage
  const [{ tokens, user }, setAuthState] = useState(() => {
    if (typeof window === "undefined") {
      return { tokens: null, user: null };
    }
    return getInitialState();
  });
  const [isLoading, setIsLoading] = useState(false);

  // Listen for auth callback from main process
  useEffect(() => {
    if (!isElectron() || !window.electronAPI) return;

    const handleAuthCallback = async (data: { code: string; state: string }) => {
      setIsLoading(true);

      // Validate state
      const storedState = sessionStorage.getItem("electron_auth_state");
      const codeVerifier = sessionStorage.getItem("electron_auth_code_verifier");
      const returnTo = sessionStorage.getItem("electron_auth_return_to");

      if (data.state !== storedState) {
        console.error("Auth callback state mismatch");
        setIsLoading(false);
        return;
      }

      if (!codeVerifier) {
        console.error("Auth callback missing code verifier");
        setIsLoading(false);
        return;
      }

      // Clean up storage
      sessionStorage.removeItem("electron_auth_state");
      sessionStorage.removeItem("electron_auth_code_verifier");
      sessionStorage.removeItem("electron_auth_return_to");

      // Exchange code for tokens via main process (avoids CORS)
      const tokenResponse = await window.electronAPI!.exchangeAuthCode(
        data.code,
        codeVerifier,
        process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
        process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!
      );

      // Calculate expiry (expires_in is in seconds)
      const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

      const tokenData: TokenData = {
        access_token: tokenResponse.access_token,
        id_token: tokenResponse.id_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: expiresAt,
      };

      storeTokens(tokenData);

      // Parse user from ID token
      const idClaims = parseJwt(tokenResponse.id_token);
      const userData = {
        name: idClaims.name as string | undefined,
        email: idClaims.email as string | undefined,
        picture: idClaims.picture as string | undefined,
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

      setAuthState({ tokens: tokenData, user: userData });

      setIsLoading(false);

      // Navigate to returnTo if specified
      if (returnTo && typeof window !== "undefined") {
        window.location.pathname = returnTo;
      }
    };

    const handleAuthError = (error: string) => {
      console.error("Auth callback error:", error);
      setIsLoading(false);
    };

    window.electronAPI.onAuthCallback(handleAuthCallback);
    window.electronAPI.onAuthCallbackError(handleAuthError);

    return () => {
      window.electronAPI?.removeAuthCallbackListeners();
    };
  }, []);

  const login = useCallback(async (returnTo?: string) => {
    await startElectronAuth(returnTo);
  }, []);

  const logout = useCallback(async () => {
    clearTokens();
    setAuthState({ tokens: null, user: null });
    await startElectronLogout();
  }, []);

  const value = useMemo(
    (): ElectronAuthContextValue => ({
      isLoading,
      isAuthenticated: !!tokens,
      user,
      accessToken: tokens?.access_token ?? null,
      idToken: tokens?.id_token ?? null,
      login,
      logout,
    }),
    [isLoading, tokens, user, login, logout]
  );

  return <ElectronAuthContext.Provider value={value}>{children}</ElectronAuthContext.Provider>;
}

const defaultValue: ElectronAuthContextValue = {
  isLoading: false,
  isAuthenticated: false,
  user: null,
  accessToken: null,
  idToken: null,
  login: async () => {},
  logout: async () => {},
};

export function useElectronAuth(): ElectronAuthContextValue {
  const context = useContext(ElectronAuthContext);
  // Return default value when outside provider (on web)
  return context ?? defaultValue;
}

// Hook for Convex integration
export function useAuthFromElectron() {
  const { isLoading, isAuthenticated, idToken } = useElectronAuth();

  const fetchAccessToken = useCallback(
    async (_options: { forceRefreshToken: boolean }) => {
      // For now, return the ID token. In the future, implement refresh.
      return idToken;
    },
    [idToken]
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken,
    }),
    [isLoading, isAuthenticated, fetchAccessToken]
  );
}
