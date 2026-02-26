const ROLES_CLAIM = "neuron/roles";

interface Identity {
  tokenIdentifier: string;
}

export async function requireAdmin(ctx: {
  auth: { getUserIdentity: () => Promise<unknown> };
}): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const roles = ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
  if (!roles.includes("admin")) throw new Error("Not authorized");
  return identity as Identity;
}

export { ROLES_CLAIM };
