import { internalQuery, internalMutation, internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set");
}

export const getById = internalQuery({
  args: { transcriptionId: v.id("transcriptions") },
  handler: async (ctx, { transcriptionId }) => {
    return ctx.db.get(transcriptionId);
  },
});

export const getBySong = internalQuery({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    return ctx.db
      .query("transcriptions")
      .withIndex("by_song", (q) => q.eq("songId", songId))
      .first();
  },
});

export const create = internalMutation({
  args: { songId: v.id("generatedSongs") },
  handler: async (ctx, { songId }) => {
    return ctx.db.insert("transcriptions", {
      songId,
      status: "pending",
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    transcriptionId: v.id("transcriptions"),
    status: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
    languageCode: v.optional(v.string()),
    languageProbability: v.optional(v.number()),
    text: v.optional(v.string()),
    words: v.optional(
      v.array(
        v.object({
          text: v.string(),
          start: v.union(v.number(), v.null()),
          end: v.union(v.number(), v.null()),
          type: v.union(v.literal("word"), v.literal("spacing"), v.literal("audio_event")),
          speakerId: v.optional(v.union(v.string(), v.null())),
        })
      )
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { transcriptionId, status, ...data } = args;
    const updates: Record<string, unknown> = { status };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(transcriptionId, updates);
  },
});

export const remove = internalMutation({
  args: { transcriptionId: v.id("transcriptions") },
  handler: async (ctx, { transcriptionId }) => {
    await ctx.db.delete(transcriptionId);
  },
});

export const start = internalAction({
  args: {
    transcriptionId: v.id("transcriptions"),
    songId: v.id("generatedSongs"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { transcriptionId, storageId }) => {
    await ctx.runMutation(internal.model.transcriptions.server.updateStatus, {
      transcriptionId,
      status: "processing",
    });

    try {
      const audioUrl = await ctx.storage.getUrl(storageId);
      if (!audioUrl) throw new Error("Could not get audio URL from storage");

      const formData = new FormData();
      formData.append("model_id", "scribe_v1");
      formData.append("cloud_storage_url", audioUrl);
      formData.append("timestamps_granularity", "word");
      formData.append("tag_audio_events", "true");

      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: formData,
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
        throw new Error(`ElevenLabs STT error: ${errorMessage}`);
      }

      const result = await response.json();
      const words = result.words?.map(
        (w: {
          text: string;
          start: number | null;
          end: number | null;
          type: string;
          speaker_id?: string | null;
        }) => ({
          text: w.text,
          start: w.start,
          end: w.end,
          type: w.type,
          speakerId: w.speaker_id,
        })
      );

      await ctx.runMutation(internal.model.transcriptions.server.updateStatus, {
        transcriptionId,
        status: "completed",
        languageCode: result.language_code,
        languageProbability: result.language_probability,
        text: result.text,
        words,
      });
    } catch (error) {
      await ctx.runMutation(internal.model.transcriptions.server.updateStatus, {
        transcriptionId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
