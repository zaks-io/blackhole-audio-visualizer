import { internalMutation, internalQuery } from "../../_generated/server";
import { v } from "convex/values";

export const getById = internalQuery({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, { recordingId }) => {
    return ctx.db.get(recordingId);
  },
});

export const getByWebhookToken = internalQuery({
  args: { webhookToken: v.string() },
  handler: async (ctx, { webhookToken }) => {
    return ctx.db
      .query("recordings")
      .withIndex("by_webhook_token", (q) => q.eq("webhookToken", webhookToken))
      .first();
  },
});

export const updateR2Key = internalMutation({
  args: {
    recordingId: v.id("recordings"),
    r2SourceKey: v.string(),
  },
  handler: async (ctx, { recordingId, r2SourceKey }) => {
    await ctx.db.patch(recordingId, { r2SourceKey });
  },
});

export const updateTranscodingStatus = internalMutation({
  args: {
    recordingId: v.id("recordings"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    coconutJobId: v.optional(v.string()),
    r2HlsPath: v.optional(v.string()),
    transcodingError: v.optional(v.string()),
    clearWebhookToken: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { transcodingStatus: args.status };
    if (args.coconutJobId !== undefined) patch.coconutJobId = args.coconutJobId;
    if (args.r2HlsPath !== undefined) patch.r2HlsPath = args.r2HlsPath;
    if (args.transcodingError !== undefined) patch.transcodingError = args.transcodingError;
    if (args.clearWebhookToken) patch.webhookToken = undefined;
    await ctx.db.patch(args.recordingId, patch);
  },
});

export const updateWebhookToken = internalMutation({
  args: {
    recordingId: v.id("recordings"),
    webhookToken: v.string(),
  },
  handler: async (ctx, { recordingId, webhookToken }) => {
    await ctx.db.patch(recordingId, { webhookToken });
  },
});

export const remove = internalMutation({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, { recordingId }) => {
    await ctx.db.delete(recordingId);
  },
});
