import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

export const createConversationRecord = internalMutation({
  args: { threadId: v.string(), sceneId: v.optional(v.id("scenes")) },
  handler: async (ctx, { threadId, sceneId }) => {
    await ctx.db.insert("sceneConversations", {
      threadId,
      sceneId,
    });
  },
});
