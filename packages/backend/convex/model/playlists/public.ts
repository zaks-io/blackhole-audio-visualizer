import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const getMyPlaylists = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      return [];
    }

    return ctx.db
      .query("playlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getPublicPlaylists = query({
  handler: async (ctx) => {
    return ctx.db
      .query("playlists")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();
  },
});

export const getPlaylistWithPresets = query({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let user = null;
    if (identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .first();
    }

    if (!playlist.isPublic && (!user || playlist.userId !== user._id)) {
      return null;
    }

    const presets = await Promise.all(
      playlist.items.map(async (item) => {
        const preset = await ctx.db.get(item.presetId);
        return preset;
      })
    );

    return {
      ...playlist,
      presets: presets.filter(Boolean),
    };
  },
});

export const createPlaylist = mutation({
  args: {
    name: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlistId = await ctx.db.insert("playlists", {
      userId: user._id,
      name: args.name,
      items: [],
      shuffle: false,
      defaultWaitDuration: 10,
      isPublic: args.isPublic,
      updatedAt: Date.now(),
    });

    return { playlistId };
  },
});

const VALID_CAMERA_MODES = ["circle", "closeup", "orbit", "edge"];

export const updatePlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    name: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    shuffle: v.optional(v.boolean()),
    defaultWaitDuration: v.optional(v.number()),
    defaultCameraDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.shuffle !== undefined) updates.shuffle = args.shuffle;
    if (args.defaultWaitDuration !== undefined)
      updates.defaultWaitDuration = args.defaultWaitDuration;
    if (args.defaultCameraDuration !== undefined)
      updates.defaultCameraDuration = args.defaultCameraDuration;

    await ctx.db.patch(args.playlistId, updates);
    return { success: true };
  },
});

export const deletePlaylist = mutation({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    await ctx.db.delete(args.playlistId);
    return { success: true };
  },
});

export const addPresetToPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    const preset = await ctx.db.get(args.presetId);
    if (!preset) {
      throw new Error("Preset not found");
    }

    if (!preset.isPublic && preset.userId !== user._id) {
      throw new Error("Cannot add private preset that you don't own");
    }

    await ctx.db.patch(args.playlistId, {
      items: [...playlist.items, { presetId: args.presetId }],
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const removePresetFromPlaylist = mutation({
  args: {
    playlistId: v.id("playlists"),
    presetId: v.id("presets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    await ctx.db.patch(args.playlistId, {
      items: playlist.items.filter((item) => item.presetId !== args.presetId),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const reorderPlaylistPresets = mutation({
  args: {
    playlistId: v.id("playlists"),
    presetIds: v.array(v.id("presets")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    const itemsByPresetId = new Map(playlist.items.map((item) => [item.presetId, item]));
    const reorderedItems = args.presetIds
      .filter((presetId) => itemsByPresetId.has(presetId))
      .map((presetId) => itemsByPresetId.get(presetId)!);

    await ctx.db.patch(args.playlistId, {
      items: reorderedItems,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updatePlaylistItem = mutation({
  args: {
    playlistId: v.id("playlists"),
    presetId: v.id("presets"),
    waitDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    const updatedItems = playlist.items.map((item) => {
      if (item.presetId === args.presetId) {
        return { presetId: item.presetId, waitDuration: args.waitDuration };
      }
      return item;
    });

    await ctx.db.patch(args.playlistId, {
      items: updatedItems,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const addCameraPreset = mutation({
  args: {
    playlistId: v.id("playlists"),
    cameraMode: v.string(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    if (!VALID_CAMERA_MODES.includes(args.cameraMode)) {
      throw new Error("Invalid camera mode");
    }

    const currentCameraPresets = playlist.cameraPresets ?? [];
    const newCameraPreset = { mode: args.cameraMode, duration: args.duration };

    await ctx.db.patch(args.playlistId, {
      cameraPresets: [...currentCameraPresets, newCameraPreset],
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateCameraPreset = mutation({
  args: {
    playlistId: v.id("playlists"),
    index: v.number(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    const currentCameraPresets = playlist.cameraPresets ?? [];
    if (args.index < 0 || args.index >= currentCameraPresets.length) {
      throw new Error("Invalid index");
    }

    const updatedCameraPresets = currentCameraPresets.map((preset, i) => {
      if (i === args.index) {
        return { ...preset, duration: args.duration };
      }
      return preset;
    });

    await ctx.db.patch(args.playlistId, {
      cameraPresets: updatedCameraPresets,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const removeCameraPreset = mutation({
  args: {
    playlistId: v.id("playlists"),
    index: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const playlist = await ctx.db.get(args.playlistId);
    if (!playlist || playlist.userId !== user._id) {
      throw new Error("Playlist not found or not owned by user");
    }

    const currentCameraPresets = playlist.cameraPresets ?? [];
    if (args.index < 0 || args.index >= currentCameraPresets.length) {
      throw new Error("Invalid index");
    }

    const updatedCameraPresets = currentCameraPresets.filter((_, i) => i !== args.index);

    await ctx.db.patch(args.playlistId, {
      cameraPresets: updatedCameraPresets,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
