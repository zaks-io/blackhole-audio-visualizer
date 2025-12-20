import { useAuth0 } from "@auth0/auth0-react";

const ROLES_CLAIM = "neuron/roles";

export function useIsAdmin(): boolean {
  const { user } = useAuth0();
  const roles = (user?.[ROLES_CLAIM] as string[] | undefined) ?? [];
  return roles.includes("admin");
}
