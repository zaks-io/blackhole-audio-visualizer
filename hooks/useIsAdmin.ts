import { useAuth0 } from "@auth0/auth0-react";
import { useElectronAuth } from "@/lib/auth/ElectronAuthProvider";
import { isElectron } from "@/lib/platform";

const ROLES_CLAIM = "neuron/roles";

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

export function useIsAdmin(): boolean {
  const auth0 = useAuth0();
  const electronAuth = useElectronAuth();

  if (isElectron()) {
    if (!electronAuth.idToken) return false;
    const claims = parseJwt(electronAuth.idToken);
    const roles = (claims[ROLES_CLAIM] as string[] | undefined) ?? [];
    return roles.includes("admin");
  }

  const roles = (auth0.user?.[ROLES_CLAIM] as string[] | undefined) ?? [];
  return roles.includes("admin");
}
