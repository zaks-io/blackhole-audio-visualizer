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

    if (!recording || !recording.url) {
      return new Response("Recording not found", { status: 404 });
    }

    await ctx.runMutation(internal.model.recordings.public.incrementDownloadCount, {
      recordingId,
    });

    return Response.redirect(recording.url, 302);
  }),
});

export default http;
