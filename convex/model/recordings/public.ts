import { mutation, query, internalMutation } from "../../_generated/server";
import { v } from "convex/values";

const ROLES_CLAIM = "neuron/roles";

async function requireAdmin(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const roles = ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
  if (!roles.includes("admin")) {
    throw new Error("Not authorized");
  }
  return identity as { tokenIdentifier: string };
}

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createRecording = mutation({
  args: {
    storageId: v.id("_storage"),
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

    const recordingId = await ctx.db.insert("recordings", {
      storageId: args.storageId,
      name: args.name,
      description: args.description,
      mimeType: args.mimeType,
      fileSize: args.fileSize,
      duration: args.duration,
      uploadedBy: user._id,
      createdAt: Date.now(),
      downloadCount: 0,
    });

    return { recordingId };
  },
});

export const deleteRecording = mutation({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const recording = await ctx.db.get(args.recordingId);
    if (!recording) {
      throw new Error("Recording not found");
    }

    await ctx.storage.delete(recording.storageId);
    await ctx.db.delete(args.recordingId);

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

    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_created")
      .order("desc")
      .collect();

    const recordingsWithUrls = await Promise.all(
      recordings.map(async (recording) => ({
        ...recording,
        url: await ctx.storage.getUrl(recording.storageId),
      }))
    );

    return recordingsWithUrls;
  },
});

export const getRecordingById = query({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    const recording = await ctx.db.get(args.recordingId);
    if (!recording) {
      return null;
    }

    const url = await ctx.storage.getUrl(recording.storageId);

    return {
      ...recording,
      url,
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
