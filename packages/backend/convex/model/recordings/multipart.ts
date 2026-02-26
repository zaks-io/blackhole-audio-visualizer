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
import { requireAdmin } from "../../lib/auth";
import { getExtensionFromMimeType } from "../../lib/mimeTypes";

export const initiateMultipartUpload = action({
  args: {
    recordingId: v.id("recordings"),
    contentType: v.string(),
  },
  handler: async (ctx, { recordingId, contentType }) => {
    await requireAdmin(ctx);

    const ext = getExtensionFromMimeType(contentType);
    const key = `source/${recordingId}.${ext}`;

    const { uploadId } = await initiateMultipartUploadFn(key, contentType);

    await ctx.runMutation(internal.model.recordings.server.updateR2Key, {
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
    await requireAdmin(ctx);

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
    await requireAdmin(ctx);

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
    await requireAdmin(ctx);

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
    await requireAdmin(ctx);

    const parts = await listUploadedPartsFn(key, uploadId);
    return { parts };
  },
});
