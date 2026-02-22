import { query, action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

const ROLES_CLAIM = "neuron/roles";

async function requireAdmin(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const roles = ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
  if (!roles.includes("admin")) throw new Error("Not authorized");
  return identity as { tokenIdentifier: string };
}

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

    const song = await ctx.runQuery(internal.model.generatedSongs.internal.getById, {
      songId,
    });
    if (!song) throw new Error("Song not found");
    if (!song.storageId) throw new Error("Song has no audio file");

    // Check for existing transcription and delete if exists
    const existing = await ctx.runQuery(internal.model.transcriptions.internal.getBySong, {
      songId,
    });
    if (existing) {
      await ctx.runMutation(internal.model.transcriptions.internal.remove, {
        transcriptionId: existing._id,
      });
    }

    // Create and trigger new transcription
    const transcriptionId = await ctx.runMutation(internal.model.transcriptions.internal.create, {
      songId,
    });
    await ctx.scheduler.runAfter(0, internal.model.transcriptions.internal.start, {
      transcriptionId,
      songId,
      storageId: song.storageId,
    });

    return { success: true };
  },
});
