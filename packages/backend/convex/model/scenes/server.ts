import { internalQuery, internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import { presetParameterValidator } from "../../lib/validators";

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

export const createPresetForScene = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    colorPalette: v.string(),
    parameters: v.array(presetParameterValidator),
    cameraMode: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, colorPalette, parameters, cameraMode }) => {
    return ctx.db.insert("presets", {
      userId,
      name,
      colorPalette,
      parameters,
      cameraMode,
      isPublic: false,
      updatedAt: Date.now(),
    });
  },
});

export const createPlaylistForScene = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    presetIds: v.array(v.id("presets")),
    waitDurations: v.array(v.number()),
    cameraPresets: v.optional(
      v.array(
        v.object({
          mode: v.string(),
          duration: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, { userId, name, presetIds, waitDurations, cameraPresets }) => {
    const items = presetIds.map((presetId, i) => ({
      presetId,
      waitDuration: waitDurations[i],
    }));

    return ctx.db.insert("playlists", {
      userId,
      name,
      items,
      cameraPresets,
      shuffle: false,
      defaultWaitDuration: 5,
      isPublic: false,
      updatedAt: Date.now(),
    });
  },
});

export const saveSceneForAgent = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    songId: v.id("generatedSongs"),
    playlistId: v.id("playlists"),
    threadId: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const sceneId = await ctx.db.insert("scenes", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      songId: args.songId,
      playlistId: args.playlistId,
      isPublic: args.isPublic,
    });

    // Update the conversation record with the scene ID
    const conversation = await ctx.db
      .query("sceneConversations")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();

    if (conversation) {
      await ctx.db.patch(conversation._id, { sceneId });
    }

    return sceneId;
  },
});

export const updateSceneForAgent = internalMutation({
  args: {
    sceneId: v.id("scenes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    songId: v.optional(v.id("generatedSongs")),
    playlistId: v.optional(v.id("playlists")),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { sceneId, ...updates } = args;

    const scene = await ctx.db.get(sceneId);
    if (!scene) {
      throw new Error("Scene not found");
    }

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(sceneId, filteredUpdates);
    }

    return { success: true };
  },
});
