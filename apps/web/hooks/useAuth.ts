"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useElectronAuth } from "@/lib/auth/ElectronAuthProvider";
import { isElectron } from "@/lib/platform";

interface AuthUser {
  name?: string;
  email?: string;
  picture?: string;
}

interface UseAuthReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (returnTo?: string) => void;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  // We call both hooks unconditionally to follow React's rules of hooks.
  // The unused hook will just return its default state.
  const auth0 = useAuth0();
  const electronAuth = useElectronAuth();

  if (isElectron()) {
    return {
      isLoading: electronAuth.isLoading,
      isAuthenticated: electronAuth.isAuthenticated,
      user: electronAuth.user,
      login: (returnTo?: string) => electronAuth.login(returnTo),
      logout: () => electronAuth.logout(),
    };
  }

  return {
    isLoading: auth0.isLoading,
    isAuthenticated: auth0.isAuthenticated,
    user: auth0.user
      ? {
          name: auth0.user.name,
          email: auth0.user.email,
          picture: auth0.user.picture,
        }
      : null,
    login: (returnTo?: string) =>
      auth0.loginWithRedirect({
        appState: { returnTo: returnTo ?? window.location.pathname },
      }),
    logout: () =>
      auth0.logout({
        logoutParams: { returnTo: window.location.origin },
      }),
  };
}
