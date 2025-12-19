import { mutation, query } from "../../_generated/server";
import { Doc } from "../../_generated/dataModel";

type UserInfo = {
  tokenIdentifier: string;
  email: string;
  name?: string;
  nickname?: string;
  picture?: string;
};

function hasUserDataChanged(existing: Doc<"users">, updated: UserInfo): boolean {
  return (
    existing.email !== updated.email ||
    existing.name !== updated.name ||
    existing.nickname !== updated.nickname ||
    existing.picture !== updated.picture
  );
}

export const initializeUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userInfo: UserInfo = {
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email!,
      name: identity.name,
      nickname: identity.nickname,
      picture: identity.pictureUrl,
    };

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", userInfo.tokenIdentifier))
      .first();

    if (existingUser) {
      if (hasUserDataChanged(existingUser, userInfo)) {
        await ctx.db.patch(existingUser._id, userInfo);
      }
      return { userId: existingUser._id };
    }

    const userId = await ctx.db.insert("users", userInfo);
    return { userId };
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
  },
});
