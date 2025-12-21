import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const getById = internalQuery({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sceneId);
  },
});
