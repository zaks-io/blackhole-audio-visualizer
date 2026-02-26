import { query, action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "../../lib/auth";

export const getBySong = query({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    return ctx.db
      .query("transcriptions")
      .withIndex("by_song", (q) => q.eq("songId", songId))
      .first();
  },
});

export const trigger = action({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    await requireAdmin(ctx);

    const song = await ctx.runQuery(internal.model.generatedSongs.server.getById, {
      songId,
    });
    if (!song) throw new Error("Song not found");
    if (!song.storageId) throw new Error("Song has no audio file");

    // Check for existing transcription and delete if exists
    const existing = await ctx.runQuery(internal.model.transcriptions.server.getBySong, {
      songId,
    });
    if (existing) {
      await ctx.runMutation(internal.model.transcriptions.server.remove, {
        transcriptionId: existing._id,
      });
    }

    // Create and trigger new transcription
    const transcriptionId = await ctx.runMutation(internal.model.transcriptions.server.create, {
      songId,
    });
    await ctx.scheduler.runAfter(0, internal.model.transcriptions.server.start, {
      transcriptionId,
      songId,
      storageId: song.storageId,
    });

    return { success: true };
  },
});
