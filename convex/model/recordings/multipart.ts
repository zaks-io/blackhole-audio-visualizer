"use node";

import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";
import {
  initiateMultipartUpload as initiateMultipartUploadFn,
  generatePartUploadUrl as generatePartUploadUrlFn,
  completeMultipartUpload as completeMultipartUploadFn,
  abortMultipartUpload as abortMultipartUploadFn,
  listUploadedParts as listUploadedPartsFn,
} from "../../lib/r2";

const ROLES_CLAIM = "neuron/roles";

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "video/webm": "webm",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
  };
  return mimeToExt[mimeType] ?? "mp4";
}

export const initiateMultipartUpload = action({
  args: {
    recordingId: v.id("recordings"),
    contentType: v.string(),
  },
  handler: async (ctx, { recordingId, contentType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) throw new Error("Not authorized");

    const ext = getExtensionFromMimeType(contentType);
    const key = `source/${recordingId}.${ext}`;

    const { uploadId } = await initiateMultipartUploadFn(key, contentType);

    await ctx.runMutation(internal.model.recordings.internal.updateR2Key, {
      recordingId,
      r2SourceKey: key,
    });

    return { uploadId, key };
  },
});

export const generatePartUploadUrl = action({
  args: {
    key: v.string(),
    uploadId: v.string(),
    partNumber: v.number(),
  },
  handler: async (ctx, { key, uploadId, partNumber }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) throw new Error("Not authorized");

    const url = await generatePartUploadUrlFn(key, uploadId, partNumber);
    return { url };
  },
});

export const completeMultipartUpload = action({
  args: {
    key: v.string(),
    uploadId: v.string(),
    parts: v.array(
      v.object({
        PartNumber: v.number(),
        ETag: v.string(),
      })
    ),
  },
  handler: async (ctx, { key, uploadId, parts }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) throw new Error("Not authorized");

    await completeMultipartUploadFn(key, uploadId, parts);
    return { success: true };
  },
});

export const abortMultipartUpload = action({
  args: {
    key: v.string(),
    uploadId: v.string(),
  },
  handler: async (ctx, { key, uploadId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) throw new Error("Not authorized");

    await abortMultipartUploadFn(key, uploadId);
    return { success: true };
  },
});

export const listUploadedParts = action({
  args: {
    key: v.string(),
    uploadId: v.string(),
  },
  handler: async (ctx, { key, uploadId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const roles =
      ((identity as Record<string, unknown>)[ROLES_CLAIM] as string[] | undefined) ?? [];
    if (!roles.includes("admin")) throw new Error("Not authorized");

    const parts = await listUploadedPartsFn(key, uploadId);
    return { parts };
  },
});
