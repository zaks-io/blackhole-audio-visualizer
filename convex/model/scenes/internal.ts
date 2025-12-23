import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";

const presetParameterValidator = v.object({
  path: v.string(),
  value: v.number(),
  duration: v.number(),
  ease: v.string(),
});

export const getById = internalQuery({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sceneId);
  },
});

export const getPresetById = internalQuery({
  args: {
    presetId: v.id("presets"),
    userId: v.id("users"),
  },
  handler: async (ctx, { presetId, userId }) => {
    const preset = await ctx.db.get(presetId);
    if (!preset) return null;
    // User must own preset OR preset must be public
    if (preset.userId !== userId && !preset.isPublic) {
      return null;
    }
    return preset;
  },
});

export const getPlaylistWithPresets = internalQuery({
  args: {
    playlistId: v.id("playlists"),
    userId: v.id("users"),
  },
  handler: async (ctx, { playlistId, userId }) => {
    const playlist = await ctx.db.get(playlistId);
    if (!playlist) return null;
    // User must own playlist OR playlist must be public
    if (playlist.userId !== userId && !playlist.isPublic) {
      return null;
    }
    const presets = await Promise.all(
      playlist.items.map(async (item, index) => {
        const preset = await ctx.db.get(item.presetId);
        return preset ? { ...preset, waitDuration: item.waitDuration, index } : null;
      })
    );
    return { playlist, presets: presets.filter(Boolean) };
  },
});

export const updatePreset = internalMutation({
  args: {
    presetId: v.id("presets"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    colorPalette: v.optional(v.string()),
    parameters: v.optional(v.array(presetParameterValidator)),
    cameraMode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { presetId, userId, ...updates } = args;
    const preset = await ctx.db.get(presetId);
    // MUST own preset to update
    if (!preset || preset.userId !== userId) {
      throw new Error("Preset not found or not owned by user");
    }
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    if (Object.keys(filteredUpdates).length > 0) {
      filteredUpdates.updatedAt = Date.now();
      await ctx.db.patch(presetId, filteredUpdates);
    }
  },
});

export const updatePlaylistItemTiming = internalMutation({
  args: {
    playlistId: v.id("playlists"),
    presetId: v.id("presets"),
    userId: v.id("users"),
    waitDuration: v.number(),
  },
  handler: async (ctx, { playlistId, presetId, userId, waitDuration }) => {
    const playlist = await ctx.db.get(playlistId);
    // MUST own playlist to update
    if (!playlist || playlist.userId !== userId) {
      throw new Error("Playlist not found or not owned by user");
    }
    const items = playlist.items.map((item) =>
      item.presetId === presetId ? { ...item, waitDuration } : item
    );
    await ctx.db.patch(playlistId, { items, updatedAt: Date.now() });
  },
});
