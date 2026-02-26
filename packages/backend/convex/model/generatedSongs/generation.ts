import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { sceneAgent, generateTraceId, createTraceHeaders } from "../scenes/agents";
import { stepCountIs } from "ai";
import { requireAdmin } from "../../lib/auth";

export const startSongGeneration = action({
  args: {
    songId: v.id("generatedSongs"),
  },
  handler: async (ctx, { songId }): Promise<{ success: boolean }> => {
    await requireAdmin(ctx);

    // Generate traceId for this request - shared across all LLM calls in this workflow
    const traceId = generateTraceId();

    // Get the song record
    const song = await ctx.runQuery(internal.model.generatedSongs.server.getById, {
      songId,
    });
    if (!song) throw new Error("Song not found");

    // Verify status is "ready"
    if (song.status !== "ready") {
      throw new Error(`Cannot generate song: status is "${song.status}", expected "ready"`);
    }

    // Fetch composition from compositions table
    if (!song.compositionId) {
      throw new Error("Song has no composition");
    }
    const composition = await ctx.runQuery(
      internal.model.generatedSongs.server.getCompositionInternal,
      {
        compositionId: song.compositionId,
      }
    );
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
    await ctx.runMutation(internal.model.generatedSongs.server.updateSongStatus, {
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
      await ctx.runMutation(internal.model.generatedSongs.server.updateSongStatus, {
        songId,
        status: "completed",
        storageId,
        durationMs: totalDurationMs,
      });

      // Create and trigger transcription
      const transcriptionId = await ctx.runMutation(internal.model.transcriptions.server.create, {
        songId,
      });
      await ctx.scheduler.runAfter(0, internal.model.transcriptions.server.start, {
        transcriptionId,
        songId,
        storageId,
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
        { ...ctx, traceId },
        { threadId: song.threadId },
        {
          stopWhen: stepCountIs(30),
          headers: createTraceHeaders(traceId, "song-generation"),
        },
        { saveStreamDeltas: true }
      );

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update to failed status
      await ctx.runMutation(internal.model.generatedSongs.server.updateSongStatus, {
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
        { ...ctx, traceId },
        { threadId: song.threadId },
        {
          stopWhen: stepCountIs(30),
          headers: createTraceHeaders(traceId, "song-generation"),
        },
        { saveStreamDeltas: true }
      );

      return { success: false };
    }
  },
});
