"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { Auth0Provider } from "@auth0/auth0-react";
import { ConvexProviderWithAuth0 } from "convex/react-auth0";
import { useUserInitialization } from "@/hooks/useUserInitialization";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ConvexClientProviderProps {
  children: ReactNode;
}

function UserInitializer({ children }: { children: ReactNode }) {
  useUserInitialization();
  return <>{children}</>;
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
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
