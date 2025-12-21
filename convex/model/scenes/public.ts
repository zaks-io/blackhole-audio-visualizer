import { mutation, query, action, internalMutation, internalQuery } from "../../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal, components } from "../../_generated/api";
import { sceneAgent } from "./agents";
import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { stepCountIs, ModelMessage } from "ai";

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set");
}

const ROLES_CLAIM = "neuron/roles";

interface Identity {
  tokenIdentifier: string;
}

async function requireAdmin(ctx: {
  auth: { getUserIdentity: () => Promise<unknown> };
}): Promise<Identity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const roles = ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
  if (!roles.includes("admin")) throw new Error("Not authorized");
  return identity as Identity;
}

// Composition plan schema
const compositionPlanValidator = v.object({
  positive_global_styles: v.array(v.string()),
  negative_global_styles: v.array(v.string()),
  sections: v.array(
    v.object({
      section_name: v.string(),
      positive_local_styles: v.array(v.string()),
      negative_local_styles: v.array(v.string()),
      duration_ms: v.number(),
      lines: v.array(v.string()),
    })
  ),
});

// ============================================================================
// Internal Functions
// ============================================================================

export const createConversationRecord = internalMutation({
  args: { threadId: v.string(), sceneId: v.optional(v.id("scenes")) },
  handler: async (ctx, { threadId, sceneId }) => {
    await ctx.db.insert("sceneConversations", {
      threadId,
      sceneId,
    });
  },
});

export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier }) => {
    return ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .first();
  },
});

export const createPresetForScene = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    colorPalette: v.string(),
    parameters: v.array(
      v.object({
        path: v.string(),
        value: v.number(),
        duration: v.number(),
        ease: v.string(),
      })
    ),
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
    await ctx.runMutation(internal.model.scenes.public.createConversationRecord, {
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

    const user = await ctx.runQuery(internal.model.scenes.public.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    await sceneAgent.streamText(
      ctx,
      { threadId, userId: user?._id },
      { prompt, stopWhen: stepCountIs(10) },
      {
        saveStreamDeltas: true,
        contextHandler: async (ctx, args) => {
          const context: ModelMessage[] = [];
          if (sceneId) {
            const scene = await ctx.runQuery(internal.model.scenes.internal.getById, {
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
// Song Generation (ElevenLabs)
// ============================================================================

export const getSongInternal = internalQuery({
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

export const startSongGeneration = action({
  args: {
    songId: v.id("generatedSongs"),
  },
  handler: async (ctx, { songId }): Promise<{ success: boolean }> => {
    await requireAdmin(ctx);

    // Get the song record
    const song = await ctx.runQuery(internal.model.scenes.public.getSongInternal, { songId });
    if (!song) throw new Error("Song not found");

    // Verify status is "ready"
    if (song.status !== "ready") {
      throw new Error(`Cannot generate song: status is "${song.status}", expected "ready"`);
    }

    // Fetch composition from compositions table
    if (!song.compositionId) {
      throw new Error("Song has no composition");
    }
    const composition = await ctx.runQuery(internal.model.scenes.public.getCompositionInternal, {
      compositionId: song.compositionId,
    });
    if (!composition) {
      throw new Error("Composition not found");
    }
    const requestToolCallId = `user_requested_generation_${songId}`;
    await sceneAgent.saveMessages(ctx, {
      threadId: song.threadId,
      messages: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: requestToolCallId,
              toolName: "userRequestedGeneration",
              args: { songId: songId as string },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: requestToolCallId,
              toolName: "userRequestedGeneration",
              result: {
                success: true,
                status: "generating",
                songId: songId as string,
              },
            },
          ],
        },
      ],
    });

    // Update status to "generating"
    await ctx.runMutation(internal.model.scenes.public.updateSongStatus, {
      songId,
      status: "generating",
    });

    try {
      const response = await fetch("https://api.elevenlabs.io/v1/music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          composition_plan: composition,
          output_format: "mp3_44100_192",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.detail?.message ?? error.message ?? response.statusText;
        } catch {
          errorMessage = errorText || response.statusText;
        }
        throw new Error(`ElevenLabs error: ${errorMessage}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const totalDurationMs = composition.sections.reduce(
        (sum: number, s: { duration_ms: number }) => sum + s.duration_ms,
        0
      );

      // Store audio in Convex storage
      const storageId = await ctx.storage.store(new Blob([audioBuffer], { type: "audio/mpeg" }));

      // Update song to completed
      await ctx.runMutation(internal.model.scenes.public.updateSongStatus, {
        songId,
        status: "completed",
        storageId,
        durationMs: totalDurationMs,
      });

      // Get audio URL for the tool result
      const audioUrl = await ctx.storage.getUrl(storageId);

      const toolCallId = `generate_song_${songId}`;

      await sceneAgent.saveMessages(ctx, {
        threadId: song.threadId,
        messages: [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId,
                toolName: "generateSong",
                args: { songId: songId as string },
              },
            ],
          },
          {
            role: "tool",
            content: [
              {
                type: "tool-result",
                toolCallId,
                toolName: "generateSong",
                result: {
                  success: true,
                  status: "completed",
                  songId: songId as string,
                  name: song.name,
                  durationMs: totalDurationMs,
                  audioUrl,
                },
              },
            ],
          },
        ],
      });

      // Continue agent to generate visualization
      await sceneAgent.streamText(
        ctx,
        { threadId: song.threadId },
        { stopWhen: stepCountIs(30) },
        { saveStreamDeltas: true }
      );

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update to failed status
      await ctx.runMutation(internal.model.scenes.public.updateSongStatus, {
        songId,
        status: "failed",
        error: errorMessage,
      });

      const toolCallId = `generate_song_${songId}`;

      // Save tool-call message first
      await sceneAgent.saveMessage(ctx, {
        threadId: song.threadId,
        message: {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId,
              toolName: "generateSong",
              args: { songId: songId as string },
            },
          ],
        },
      });

      // Save error tool result to thread
      await sceneAgent.saveMessage(ctx, {
        threadId: song.threadId,
        message: {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName: "generateSong",
              result: {
                success: false,
                songId: songId as string,
                error: errorMessage,
              },
            },
          ],
        },
      });

      // Continue agent with error context
      await sceneAgent.streamText(
        ctx,
        { threadId: song.threadId },
        { stopWhen: stepCountIs(30) },
        { saveStreamDeltas: true }
      );

      return { success: false };
    }
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

// ============================================================================
// Song Queries
// ============================================================================

export const getSongById = query({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    const song = await ctx.db.get(songId);
    if (!song) return null;

    const audioUrl = song.storageId ? await ctx.storage.getUrl(song.storageId) : null;

    return { ...song, audioUrl };
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

// ============================================================================
// Conversation Queries
// ============================================================================

export const getSceneConversations = query({
  args: { sceneId: v.id("scenes") },
  handler: async (ctx, { sceneId }) => {
    return ctx.db
      .query("sceneConversations")
      .withIndex("by_scene", (q) => q.eq("sceneId", sceneId))
      .order("desc")
      .collect();
  },
});

export const getAllConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) return [];

    return ctx.db.query("sceneConversations").order("desc").collect();
  },
});

export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("sceneConversations"),
    title: v.string(),
  },
  handler: async (ctx, { conversationId, title }) => {
    await requireAdmin(ctx);

    await ctx.db.patch(conversationId, { title });

    return { success: true };
  },
});

export const linkConversationToScene = mutation({
  args: {
    threadId: v.string(),
    sceneId: v.id("scenes"),
  },
  handler: async (ctx, { threadId, sceneId }) => {
    await requireAdmin(ctx);

    const conversation = await ctx.db
      .query("sceneConversations")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();

    if (conversation) {
      await ctx.db.patch(conversation._id, { sceneId });
    }

    return { success: true };
  },
});
