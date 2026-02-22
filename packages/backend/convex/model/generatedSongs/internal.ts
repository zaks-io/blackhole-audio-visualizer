import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const getById = internalQuery({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.songId);
  },
});
