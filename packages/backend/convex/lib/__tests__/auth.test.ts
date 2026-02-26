import { describe, it, expect } from "vitest";
import { requireAdmin, ROLES_CLAIM } from "../auth";

function makeCtx(identity: unknown) {
  return {
    auth: {
      getUserIdentity: async () => identity,
    },
  };
}

describe("requireAdmin", () => {
  it("throws 'Not authenticated' when identity is null", async () => {
    const ctx = makeCtx(null);
    await expect(requireAdmin(ctx)).rejects.toThrow("Not authenticated");
  });

  it("throws 'Not authenticated' when identity is undefined", async () => {
    const ctx = makeCtx(undefined);
    await expect(requireAdmin(ctx)).rejects.toThrow("Not authenticated");
  });

  it("throws 'Not authorized' when user has no roles", async () => {
    const ctx = makeCtx({ tokenIdentifier: "user|123" });
    await expect(requireAdmin(ctx)).rejects.toThrow("Not authorized");
  });

  it("throws 'Not authorized' when user has roles but not admin", async () => {
    const ctx = makeCtx({
      tokenIdentifier: "user|123",
      [ROLES_CLAIM]: ["editor", "viewer"],
    });
    await expect(requireAdmin(ctx)).rejects.toThrow("Not authorized");
  });

  it("returns the identity when user has admin role", async () => {
    const identity = {
      tokenIdentifier: "user|123",
      [ROLES_CLAIM]: ["admin", "editor"],
    };
    const ctx = makeCtx(identity);
    const result = await requireAdmin(ctx);
    expect(result).toBe(identity);
  });

  it("returns the identity when user has only the admin role", async () => {
    const identity = {
      tokenIdentifier: "user|abc",
      [ROLES_CLAIM]: ["admin"],
    };
    const ctx = makeCtx(identity);
    const result = await requireAdmin(ctx);
    expect(result.tokenIdentifier).toBe("user|abc");
  });
});
