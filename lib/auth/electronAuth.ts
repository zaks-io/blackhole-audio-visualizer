import { isElectron } from "@/lib/platform";

const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!;
const REDIRECT_URI = "blackhole://callback";

// PKCE helpers
function generateRandomString(length = 43): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => charset[v % charset.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}

// Auth state storage keys
const AUTH_STATE_KEY = "electron_auth_state";
const AUTH_CODE_VERIFIER_KEY = "electron_auth_code_verifier";
const AUTH_RETURN_TO_KEY = "electron_auth_return_to";

export function getElectronRedirectUri(): string {
  return REDIRECT_URI;
}

export async function startElectronAuth(returnTo?: string): Promise<void> {
  if (!isElectron() || !window.electronAPI) {
    console.warn("startElectronAuth called outside Electron");
    return;
  }

  const state = generateRandomString();
  const codeVerifier = generateRandomString();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store for callback validation
  sessionStorage.setItem(AUTH_STATE_KEY, state);
  sessionStorage.setItem(AUTH_CODE_VERIFIER_KEY, codeVerifier);
  if (returnTo) {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, returnTo);
  }

  const params = new URLSearchParams({
    client_id: AUTH0_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid profile email offline_access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `https://${AUTH0_DOMAIN}/authorize?${params}`;
  await window.electronAPI.openExternal(url);
}

export interface AuthCallbackResult {
  code: string;
  state: string;
  codeVerifier: string;
  returnTo?: string;
}

export function parseAuthCallback(url: string): AuthCallbackResult | null {
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get("code");
  const state = urlObj.searchParams.get("state");

  if (!code || !state) {
    console.error("Auth callback missing code or state");
    return null;
  }

  const storedState = sessionStorage.getItem(AUTH_STATE_KEY);
  const codeVerifier = sessionStorage.getItem(AUTH_CODE_VERIFIER_KEY);
  const returnTo = sessionStorage.getItem(AUTH_RETURN_TO_KEY);

  if (state !== storedState) {
    console.error("Auth callback state mismatch");
    return null;
  }

  if (!codeVerifier) {
    console.error("Auth callback missing code verifier");
    return null;
  }

  // Clean up storage
  sessionStorage.removeItem(AUTH_STATE_KEY);
  sessionStorage.removeItem(AUTH_CODE_VERIFIER_KEY);
  sessionStorage.removeItem(AUTH_RETURN_TO_KEY);

  return { code, state, codeVerifier, returnTo: returnTo || undefined };
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; id_token: string; refresh_token?: string }> {
  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: AUTH0_CLIENT_ID,
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

export async function startElectronLogout(): Promise<void> {
  if (!isElectron() || !window.electronAPI) return;

  const params = new URLSearchParams({
    client_id: AUTH0_CLIENT_ID,
    returnTo: REDIRECT_URI,
  });

  const url = `https://${AUTH0_DOMAIN}/v2/logout?${params}`;
  await window.electronAPI.openExternal(url);
}
