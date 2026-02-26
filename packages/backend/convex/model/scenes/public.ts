import { mutation, query, action } from "../../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal, components } from "../../_generated/api";
import { sceneAgent, generateTraceId, createTraceHeaders } from "./agents";
import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { stepCountIs, ModelMessage } from "ai";
import { requireAdmin, ROLES_CLAIM } from "../../lib/auth";

// ============================================================================
// Playlist Queries
// ============================================================================

export const getPlaylistPresets = query({
  args: { playlistId: v.id("playlists") },
  handler: async (ctx, { playlistId }) => {
    const playlist = await ctx.db.get(playlistId);
    if (!playlist) return null;

    // Check access: public playlist or owned by current user
    if (!playlist.isPublic) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;

      const user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .first();

      if (!user || playlist.userId !== user._id) return null;
    }

    // Fetch all presets in the playlist
    const presets = await Promise.all(
      playlist.items.map(async (item) => {
        const preset = await ctx.db.get(item.presetId);
        return preset;
      })
    );

    return presets.filter(Boolean);
  },
});

// ============================================================================
// Thread Management
// ============================================================================

export const createSceneThread = action({
  args: { sceneId: v.optional(v.id("scenes")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Create a new thread using the agent
    const { threadId } = (await sceneAgent.createThread(ctx, {
      title: "New Scene",
    })) as { threadId: string };

    // Create a scene conversation record to track this thread
    await ctx.runMutation(internal.model.sceneConversations.server.createConversationRecord, {
      threadId,
      sceneId: args.sceneId,
    });

    return { threadId };
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

// ============================================================================
// Chat Actions
// ============================================================================

export const sendSceneMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    sceneId: v.optional(v.id("scenes")),
  },
  handler: async (ctx, { threadId, prompt, sceneId }) => {
    const identity = await requireAdmin(ctx);

    const user = await ctx.runQuery(internal.model.users.server.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    // Generate traceId for this request - shared across all LLM calls in this workflow
    const traceId = generateTraceId();

    await sceneAgent.streamText(
      { ...ctx, traceId },
      { threadId, userId: user?._id },
      {
        prompt,
        stopWhen: stepCountIs(10),
        headers: createTraceHeaders(traceId, "scene-agent"),
        providerOptions: {
          openrouter: {
            reasoning: {
              effort: "low",
            },
          },
        },
      },
      {
        saveStreamDeltas: true,
        contextHandler: async (ctx, args) => {
          const context: ModelMessage[] = [];
          if (sceneId) {
            const scene = await ctx.runQuery(internal.model.scenes.server.getById, {
              sceneId,
            });
            if (scene) {
              context.push({
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: `# Current Scene Context

The user is on the following scene's page:

Name: ${scene.name}
ID: ${scene._id}
Description: ${scene.description}
Song Id: ${scene.songId}
Playlist Id: ${scene.playlistId}
Is Public: ${scene.isPublic}
Is Owner: ${scene.userId === user?._id}
`,
                  },
                ],
              });
            }
          }
          return [
            ...context,
            ...args.search,
            ...args.recent,
            ...args.inputMessages,
            ...args.inputPrompt,
            ...args.existingResponses,
          ];
        },
      }
    );
  },
});

// ============================================================================
// Scene CRUD
// ============================================================================

export const saveScene = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    songId: v.id("generatedSongs"),
    playlistId: v.id("playlists"),
    threadId: v.string(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) throw new Error("User not found");

    const sceneId = await ctx.db.insert("scenes", {
      userId: user._id,
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

    return { sceneId };
  },
});

export const updateScene = mutation({
  args: {
    sceneId: v.id("scenes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, { sceneId, ...updates }) => {
    await requireAdmin(ctx);

    const scene = await ctx.db.get(sceneId);
    if (!scene) throw new Error("Scene not found");

    await ctx.db.patch(sceneId, updates);

    return { success: true };
  },
});

export const deleteScene = mutation({
  args: {
    sceneId: v.id("scenes"),
    deletePlaylist: v.optional(v.boolean()),
  },
  handler: async (ctx, { sceneId, deletePlaylist }) => {
    await requireAdmin(ctx);

    const scene = await ctx.db.get(sceneId);
    if (!scene) throw new Error("Scene not found");

    // Song is now independent - do not delete it when deleting scene

    // Optionally delete the associated playlist
    if (deletePlaylist) {
      const playlist = await ctx.db.get(scene.playlistId);
      if (playlist) {
        // Delete presets in the playlist
        for (const item of playlist.items) {
          await ctx.db.delete(item.presetId);
        }
        await ctx.db.delete(scene.playlistId);
      }
    }

    // Delete conversation records
    const conversations = await ctx.db
      .query("sceneConversations")
      .withIndex("by_scene", (q) => q.eq("sceneId", sceneId))
      .collect();

    for (const conv of conversations) {
      await ctx.db.delete(conv._id);
    }

    // Delete the scene
    await ctx.db.delete(sceneId);

    return { success: true };
  },
});

// ============================================================================
// Scene Queries
// ============================================================================

export const getMyScenes = query({
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

    return ctx.db
      .query("scenes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getPublicScenes = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("scenes")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .collect();
  },
});

export const getSceneWithDetails = query({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, { sceneId }) => {
    const scene = await ctx.db.get(sceneId);
    if (!scene) return null;

    // Fetch song and composition
    const song = await ctx.db.get(scene.songId);
    const composition = song?.compositionId ? await ctx.db.get(song.compositionId) : null;
    const audioUrl = song?.storageId ? await ctx.storage.getUrl(song.storageId) : null;

    const playlist = await ctx.db.get(scene.playlistId);

    // Get all presets for the playlist
    const presets = playlist
      ? await Promise.all(playlist.items.map((item) => ctx.db.get(item.presetId)))
      : [];

    return {
      ...scene,
      audioUrl,
      audioDurationMs: song?.durationMs ?? 0,
      compositionPlan: composition,
      song,
      playlist: playlist
        ? {
            ...playlist,
            presets: presets.filter(Boolean),
          }
        : null,
    };
  },
});

export const getSceneWithDetailsPublic = query({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, { sceneId }) => {
    const scene = await ctx.db.get(sceneId);
    if (!scene) return null;

    // Check access: public scenes are accessible to all, private scenes require ownership
    if (!scene.isPublic) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;

      const user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .first();

      if (!user || scene.userId !== user._id) {
        return null;
      }
    }

    // Fetch song and composition
    const song = await ctx.db.get(scene.songId);
    const composition = song?.compositionId ? await ctx.db.get(song.compositionId) : null;
    const audioUrl = song?.storageId ? await ctx.storage.getUrl(song.storageId) : null;

    const playlist = await ctx.db.get(scene.playlistId);

    // Get all presets for the playlist
    const presets = playlist
      ? await Promise.all(playlist.items.map((item) => ctx.db.get(item.presetId)))
      : [];

    return {
      ...scene,
      audioUrl,
      audioDurationMs: song?.durationMs ?? 0,
      compositionPlan: composition,
      song,
      playlist: playlist
        ? {
            ...playlist,
            presets: presets.filter(Boolean),
          }
        : null,
    };
  },
});
