import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";
import { presetParameterValidator } from "../../lib/validators";

export const getMyPresets = query({
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
      .query("presets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getPublicPresets = query({
  handler: async (ctx) => {
    return ctx.db
      .query("presets")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .collect();
  },
});

export const getPresetById = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.presetId);
    if (!preset) {
      return null;
    }

    if (preset.isPublic) {
      return preset;
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user || preset.userId !== user._id) {
      return null;
    }

    return preset;
  },
});

export const createPreset = mutation({
  args: {
    name: v.string(),
    colorPalette: v.string(),
    parameters: v.array(presetParameterValidator),
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

    const presetId = await ctx.db.insert("presets", {
      userId: user._id,
      name: args.name,
      colorPalette: args.colorPalette,
      parameters: args.parameters,
      isPublic: args.isPublic,
      updatedAt: Date.now(),
    });

    return { presetId };
  },
});

export const updatePreset = mutation({
  args: {
    presetId: v.id("presets"),
    name: v.optional(v.string()),
    colorPalette: v.optional(v.string()),
    parameters: v.optional(v.array(presetParameterValidator)),
    isPublic: v.optional(v.boolean()),
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

    const preset = await ctx.db.get(args.presetId);
    if (!preset || preset.userId !== user._id) {
      throw new Error("Preset not found or not owned by user");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.colorPalette !== undefined) updates.colorPalette = args.colorPalette;
    if (args.parameters !== undefined) updates.parameters = args.parameters;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.presetId, updates);
    return { success: true };
  },
});

export const deletePreset = mutation({
  args: { presetId: v.id("presets") },
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

    const preset = await ctx.db.get(args.presetId);
    if (!preset || preset.userId !== user._id) {
      throw new Error("Preset not found or not owned by user");
    }

    // Remove preset from any playlists that contain it
    const playlists = await ctx.db
      .query("playlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const playlist of playlists) {
      const hasPreset = playlist.items.some((item) => item.presetId === args.presetId);
      if (hasPreset) {
        await ctx.db.patch(playlist._id, {
          items: playlist.items.filter((item) => item.presetId !== args.presetId),
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.presetId);
    return { success: true };
  },
});
