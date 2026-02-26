import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { compositionPlanValidator } from "../../lib/validators";

export const getById = internalQuery({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    return ctx.db.get(songId);
  },
});

export const getCompositionInternal = internalQuery({
  args: { compositionId: v.id("compositions") },
  handler: async (ctx, { compositionId }) => {
    return ctx.db.get(compositionId);
  },
});

export const saveComposition = internalMutation({
  args: {
    compositionPlan: compositionPlanValidator,
  },
  handler: async (ctx, { compositionPlan }) => {
    return ctx.db.insert("compositions", compositionPlan);
  },
});

export const saveSong = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    storageId: v.id("_storage"),
    durationMs: v.number(),
    compositionId: v.id("compositions"),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("generatedSongs", {
      ...args,
      status: "completed",
    });
  },
});

export const createReadySong = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    threadId: v.string(),
    compositionId: v.id("compositions"),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("generatedSongs", {
      userId: args.userId,
      name: args.name,
      threadId: args.threadId,
      compositionId: args.compositionId,
      status: "ready",
    });
  },
});

export const updateSongStatus = internalMutation({
  args: {
    songId: v.id("generatedSongs"),
    status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
    storageId: v.optional(v.id("_storage")),
    durationMs: v.optional(v.number()),
    compositionId: v.optional(v.id("compositions")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { songId, status, storageId, durationMs, compositionId, error } = args;
    const updates: Record<string, unknown> = { status };
    if (storageId !== undefined) updates.storageId = storageId;
    if (durationMs !== undefined) updates.durationMs = durationMs;
    if (compositionId !== undefined) updates.compositionId = compositionId;
    if (error !== undefined) updates.error = error;

    await ctx.db.patch(songId, updates);
  },
});

export const updateSongComposition = internalMutation({
  args: {
    songId: v.id("generatedSongs"),
    compositionId: v.id("compositions"),
  },
  handler: async (ctx, { songId, compositionId }) => {
    const song = await ctx.db.get(songId);
    if (!song) throw new Error("Song not found");
    if (song.status !== "ready") {
      throw new Error("Can only update composition for songs in ready status");
    }
    await ctx.db.patch(songId, { compositionId });
  },
});
