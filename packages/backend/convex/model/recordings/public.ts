import { mutation, query, action, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import { generateUploadUrl, deleteR2Object, deleteHlsFiles } from "../../lib/r2";
import { requireAdmin, ROLES_CLAIM } from "../../lib/auth";
import { getExtensionFromMimeType } from "../../lib/mimeTypes";

export const createPendingRecording = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    mimeType: v.string(),
    fileSize: v.number(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const webhookToken = crypto.randomUUID();

    const recordingId = await ctx.db.insert("recordings", {
      r2SourceKey: "",
      transcodingStatus: "uploaded",
      webhookToken,
      name: args.name,
      description: args.description,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      duration: args.duration,
      uploadedBy: user._id,
      downloadCount: 0,
    });

    return { recordingId, webhookToken };
  },
});

export const generateR2UploadUrl = action({
  args: {
    recordingId: v.id("recordings"),
    contentType: v.string(),
  },
  handler: async (ctx, { recordingId, contentType }) => {
    await requireAdmin(ctx);

    const ext = getExtensionFromMimeType(contentType);
    const key = `source/${recordingId}.${ext}`;
    const uploadUrl = await generateUploadUrl(key, contentType);

    await ctx.runMutation(internal.model.recordings.server.updateR2Key, {
      recordingId,
      r2SourceKey: key,
    });

    return { uploadUrl, key };
  },
});

export const submitTranscodingJob = action({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, { recordingId }): Promise<{ jobId: string }> => {
    await requireAdmin(ctx);

    const recording = await ctx.runQuery(internal.model.recordings.server.getById, {
      recordingId,
    });
    if (!recording) throw new Error("Recording not found");
    if (!recording.r2SourceKey) throw new Error("Source file not uploaded");
    if (!recording.webhookToken) throw new Error("Webhook token missing");

    const sourceUrl = `${process.env.R2_PUBLIC_URL}/${recording.r2SourceKey}`;
    const hlsPath = `hls/${recordingId}`;
    const thumbnailPath = `thumbnails/${recordingId}.jpg`;
    const webhookUrl = `${process.env.CONVEX_SITE_URL}/api/coconut-webhook?token=${recording.webhookToken}`;

    const jobPayload = {
      input: { url: sourceUrl },
      storage: {
        service: "s3other",
        region: "auto",
        bucket: process.env.R2_BUCKET_NAME,
        force_path_style: true,
        credentials: {
          access_key_id: process.env.R2_ACCESS_KEY_ID,
          secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
        },
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      },
      notification: {
        type: "http",
        url: webhookUrl,
        metadata: true,
      },
      outputs: {
        httpstream: {
          hls: {
            path: `/${hlsPath}`,
            playlist_name: "master",
          },
          variants: [
            "mp4:480p::quality=4,maxrate=6000k",
            "mp4:720p::quality=4,maxrate=12000k",
            "mp4:1080p::quality=4,maxrate=20000k",
          ],
        },
        "jpg:1280x720": {
          path: `/${thumbnailPath}`,
          offsets: [1],
        },
      },
    };

    const response = await fetch("https://api.coconut.co/v2/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(process.env.COCONUT_API_KEY + ":")}`,
      },
      body: JSON.stringify(jobPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      await ctx.runMutation(internal.model.recordings.server.updateTranscodingStatus, {
        recordingId,
        status: "failed",
        transcodingError: `Coconut API error: ${error}`,
      });
      throw new Error(`Coconut job creation failed: ${error}`);
    }

    const job = await response.json();

    await ctx.runMutation(internal.model.recordings.server.updateTranscodingStatus, {
      recordingId,
      status: "processing",
      coconutJobId: job.id,
      r2HlsPath: hlsPath,
      r2ThumbnailPath: thumbnailPath,
    });

    return { jobId: job.id };
  },
});

export const retryTranscodingJob = action({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, { recordingId }): Promise<{ jobId: string }> => {
    await requireAdmin(ctx);

    const recording = await ctx.runQuery(internal.model.recordings.server.getById, {
      recordingId,
    });

    if (!recording) throw new Error("Recording not found");
    if (recording.transcodingStatus !== "failed" && recording.transcodingStatus !== "completed") {
      throw new Error("Can only retry failed or completed jobs");
    }

    const webhookToken = crypto.randomUUID();
    await ctx.runMutation(internal.model.recordings.server.updateWebhookToken, {
      recordingId,
      webhookToken,
    });

    const sourceUrl = `${process.env.R2_PUBLIC_URL}/${recording.r2SourceKey}`;
    const hlsPath = `hls/${recordingId}`;
    const thumbnailPath = `thumbnails/${recordingId}.jpg`;
    const webhookUrl = `${process.env.CONVEX_SITE_URL}/api/coconut-webhook?token=${webhookToken}`;

    const jobPayload = {
      input: { url: sourceUrl },
      storage: {
        service: "s3other",
        region: "auto",
        bucket: process.env.R2_BUCKET_NAME,
        force_path_style: true,
        credentials: {
          access_key_id: process.env.R2_ACCESS_KEY_ID,
          secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
        },
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      },
      notification: {
        type: "http",
        url: webhookUrl,
        metadata: true,
      },
      outputs: {
        httpstream: {
          hls: {
            path: `/${hlsPath}`,
            playlist_name: "master",
          },
          variants: [
            "mp4:480p::quality=4,maxrate=6000k",
            "mp4:720p::quality=4,maxrate=12000k",
            "mp4:1080p::quality=4,maxrate=20000k",
          ],
        },
        "jpg:1280x720": {
          path: `/${thumbnailPath}`,
          offsets: [1],
        },
      },
    };

    const response = await fetch("https://api.coconut.co/v2/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(process.env.COCONUT_API_KEY + ":")}`,
      },
      body: JSON.stringify(jobPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      await ctx.runMutation(internal.model.recordings.server.updateTranscodingStatus, {
        recordingId,
        status: "failed",
        transcodingError: `Coconut API error: ${error}`,
      });
      throw new Error(`Coconut job creation failed: ${error}`);
    }

    const job = await response.json();

    await ctx.runMutation(internal.model.recordings.server.updateTranscodingStatus, {
      recordingId,
      status: "processing",
      coconutJobId: job.id,
      r2HlsPath: hlsPath,
      r2ThumbnailPath: thumbnailPath,
      transcodingError: undefined,
    });

    return { jobId: job.id };
  },
});

export const deleteRecording = action({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, { recordingId }) => {
    await requireAdmin(ctx);

    const recording = await ctx.runQuery(internal.model.recordings.server.getById, {
      recordingId,
    });
    if (!recording) throw new Error("Recording not found");

    if (recording.r2SourceKey) {
      await deleteR2Object(recording.r2SourceKey);
    }

    if (recording.r2HlsPath) {
      await deleteHlsFiles(recording.r2HlsPath);
    }

    if (recording.r2ThumbnailPath) {
      await deleteR2Object(recording.r2ThumbnailPath);
    }

    await ctx.runMutation(internal.model.recordings.server.remove, {
      recordingId,
    });

    return { success: true };
  },
});

export const getRecordings = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) {
      return [];
    }

    const recordings = await ctx.db.query("recordings").order("desc").collect();

    return recordings.map((recording) => ({
      ...recording,
      sourceUrl: recording.r2SourceKey
        ? `${process.env.R2_PUBLIC_URL}/${recording.r2SourceKey}`
        : undefined,
      hlsUrl:
        recording.transcodingStatus === "completed" && recording.r2HlsPath
          ? `${process.env.R2_PUBLIC_URL}/${recording.r2HlsPath}/master.m3u8`
          : undefined,
    }));
  },
});

export const getRecordingById = query({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    const recording = await ctx.db.get(args.recordingId);
    if (!recording) {
      return null;
    }

    return {
      _id: recording._id,
      _creationTime: recording._creationTime,
      name: recording.name,
      description: recording.description,
      duration: recording.duration,
      transcodingStatus: recording.transcodingStatus,
      downloadCount: recording.downloadCount,
      transcodingError:
        recording.transcodingStatus === "failed" ? "Video processing failed" : undefined,
      hlsUrl:
        recording.transcodingStatus === "completed" && recording.r2HlsPath
          ? `${process.env.R2_PUBLIC_URL}/${recording.r2HlsPath}/master.m3u8`
          : undefined,
      thumbnailUrl: recording.r2ThumbnailPath
        ? `${process.env.R2_PUBLIC_URL}/${recording.r2ThumbnailPath}`
        : undefined,
    };
  },
});

export const incrementDownloadCount = internalMutation({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    const recording = await ctx.db.get(args.recordingId);
    if (!recording) return;
    await ctx.db.patch(args.recordingId, {
      downloadCount: (recording.downloadCount ?? 0) + 1,
    });
  },
});
