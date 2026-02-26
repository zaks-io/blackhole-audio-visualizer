import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAdmin, ROLES_CLAIM } from "../../lib/auth";

export const getSceneConversations = query({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, { sceneId }) => {
    return ctx.db
      .query("sceneConversations")
      .withIndex("by_scene", (q) => q.eq("sceneId", sceneId))
      .order("desc")
      .collect();
  },
});

export const getAllConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) return [];

    return ctx.db.query("sceneConversations").order("desc").collect();
  },
});

export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("sceneConversations"),
    title: v.string(),
  },
  handler: async (ctx, { conversationId, title }) => {
    await requireAdmin(ctx);

    await ctx.db.patch(conversationId, { title });

    return { success: true };
  },
});

export const linkConversationToScene = mutation({
  args: {
    threadId: v.string(),
    sceneId: v.id("scenes"),
  },
  handler: async (ctx, { threadId, sceneId }) => {
    await requireAdmin(ctx);

    const conversation = await ctx.db
      .query("sceneConversations")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();

    if (conversation) {
      await ctx.db.patch(conversation._id, { sceneId });
    }

    return { success: true };
  },
});
