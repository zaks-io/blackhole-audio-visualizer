import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { requireAdmin, ROLES_CLAIM } from "../../lib/auth";

export const getSongById = query({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    const song = await ctx.db.get(songId);
    if (!song) return null;

    const audioUrl = song.storageId ? await ctx.storage.getUrl(song.storageId) : null;

    return { ...song, audioUrl };
  },
});

export const getSongsByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    await requireAdmin(ctx);

    const songs = await ctx.db
      .query("generatedSongs")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .collect();

    return Promise.all(
      songs.map(async (song) => ({
        ...song,
        audioUrl: song.storageId ? await ctx.storage.getUrl(song.storageId) : null,
      }))
    );
  },
});

export const getMySongs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) return [];

    const songs = await ctx.db
      .query("generatedSongs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Fetch compositions for all songs
    const songsWithComposition = await Promise.all(
      songs.map(async (song) => {
        const composition = song.compositionId ? await ctx.db.get(song.compositionId) : null;
        return {
          ...song,
          composition,
        };
      })
    );

    return songsWithComposition;
  },
});

export const getSongWithDetails = query({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    const song = await ctx.db.get(songId);
    if (!song) return null;

    const composition = song.compositionId ? await ctx.db.get(song.compositionId) : null;
    const audioUrl = song.storageId ? await ctx.storage.getUrl(song.storageId) : null;

    return {
      ...song,
      composition,
      audioUrl,
    };
  },
});

export const deleteSong = mutation({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    await requireAdmin(ctx);

    const song = await ctx.db.get(songId);
    if (!song) throw new Error("Song not found");

    // Check for references
    const scenesUsingSong = await ctx.db
      .query("scenes")
      .withIndex("by_song", (q) => q.eq("songId", songId))
      .collect();

    if (scenesUsingSong.length > 0) {
      throw new Error(`Cannot delete song: ${scenesUsingSong.length} scene(s) are using it`);
    }

    // Delete the audio file if it exists
    if (song.storageId) {
      await ctx.storage.delete(song.storageId);
    }

    // Delete the composition if it exists
    if (song.compositionId) {
      await ctx.db.delete(song.compositionId);
    }

    // Delete the song record
    await ctx.db.delete(songId);

    return { success: true };
  },
});
