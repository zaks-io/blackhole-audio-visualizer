"use client";

import { ReactNode, useMemo, useSyncExternalStore } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { Auth0Provider } from "@auth0/auth0-react";
import { ConvexProviderWithAuth0 } from "convex/react-auth0";
import { useUserInitialization } from "@/hooks/useUserInitialization";
import { ElectronAuthProvider, useAuthFromElectron } from "@/lib/auth/ElectronAuthProvider";

// Detect Electron using useSyncExternalStore to avoid hydration mismatch
function useIsElectronApp(): boolean | null {
  return useSyncExternalStore(
    () => () => {},
    () => !!window.electronAPI?.isElectron,
    () => null // Return null during SSR
  );
}

interface ConvexClientProviderProps {
  children: ReactNode;
}

function UserInitializer({ children }: { children: ReactNode }) {
  useUserInitialization();
  return <>{children}</>;
}

// Web provider using Auth0
function WebAuthProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!), []);
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? `${window.location.origin}/app` : "",
      }}
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
      cacheLocation="localstorage"
    >
      <ConvexProviderWithAuth0 client={convex}>
        <UserInitializer>{children}</UserInitializer>
      </ConvexProviderWithAuth0>
    </Auth0Provider>
  );
}

// Electron provider using custom PKCE auth
function ElectronConvexProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!), []);
  return (
    <ElectronAuthProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromElectron}>
        <UserInitializer>{children}</UserInitializer>
      </ConvexProviderWithAuth>
    </ElectronAuthProvider>
  );
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const isElectronApp = useIsElectronApp();

  // Show nothing during SSR/hydration to avoid mismatch
  if (isElectronApp === null) {
    return null;
  }

  if (isElectronApp) {
    return <ElectronConvexProvider>{children}</ElectronConvexProvider>;
  }

  return <WebAuthProvider>{children}</WebAuthProvider>;
}
