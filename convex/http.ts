import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

http.route({
  pathPrefix: "/recording/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const recordingId = pathParts[pathParts.length - 1] as Id<"recordings">;

    if (!recordingId) {
      return new Response("Recording ID required", { status: 400 });
    }

    const recording = await ctx.runQuery(api.model.recordings.public.getRecordingById, {
      recordingId,
    });

    if (!recording || !recording.hlsUrl) {
      return new Response("Recording not found or not ready", { status: 404 });
    }

    await ctx.runMutation(internal.model.recordings.public.incrementDownloadCount, {
      recordingId,
    });

    return Response.redirect(recording.hlsUrl, 302);
  }),
});

http.route({
  path: "/api/coconut-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    const recording = await ctx.runQuery(internal.model.recordings.internal.getByWebhookToken, {
      webhookToken: token,
    });

    if (!recording) {
      return new Response("Invalid or expired token", { status: 401 });
    }

    let payload: {
      event?: string;
      data?: { status?: string; error?: string };
    };
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (payload.event === "job.completed") {
      const status = payload.data?.status;

      if (status === "job.completed") {
        await ctx.runMutation(internal.model.recordings.internal.updateTranscodingStatus, {
          recordingId: recording._id,
          status: "completed",
          r2HlsPath: recording.r2HlsPath,
          clearWebhookToken: true,
        });
      } else {
        await ctx.runMutation(internal.model.recordings.internal.updateTranscodingStatus, {
          recordingId: recording._id,
          status: "failed",
          transcodingError: payload.data?.error || "Unknown transcoding error",
          clearWebhookToken: true,
        });
      }
    }

    if (payload.event === "job.failed") {
      await ctx.runMutation(internal.model.recordings.internal.updateTranscodingStatus, {
        recordingId: recording._id,
        status: "failed",
        transcodingError: payload.data?.error || "Job failed",
        clearWebhookToken: true,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
