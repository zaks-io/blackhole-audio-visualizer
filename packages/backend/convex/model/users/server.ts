import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => {
    return ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .first();
  },
});
