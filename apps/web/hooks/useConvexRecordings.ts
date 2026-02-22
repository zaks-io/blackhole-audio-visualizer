"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";
import type { Id } from "@blackhole/backend/convex/_generated/dataModel";

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CONCURRENT_UPLOADS = 4;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;
const UPLOAD_STATE_KEY = "multipart-upload-state";

interface UploadPartState {
  partNumber: number;
  start: number;
  end: number;
  etag: string | null;
  status: "pending" | "uploading" | "completed" | "failed";
  retryCount: number;
}

interface MultipartUploadState {
  recordingId: string;
  key: string;
  uploadId: string;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
  contentType: string;
  totalParts: number;
  parts: UploadPartState[];
  createdAt: number;
  updatedAt: number;
}

interface UploadStateStore {
  uploads: Record<string, MultipartUploadState>;
}

function getUploadStateStore(): UploadStateStore {
  if (typeof window === "undefined") return { uploads: {} };
  const stored = localStorage.getItem(UPLOAD_STATE_KEY);
  return stored ? JSON.parse(stored) : { uploads: {} };
}

function saveUploadState(state: MultipartUploadState): void {
  const store = getUploadStateStore();
  state.updatedAt = Date.now();
  store.uploads[state.recordingId] = state;
  localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(store));
}

function getUploadState(recordingId: string): MultipartUploadState | null {
  const store = getUploadStateStore();
  return store.uploads[recordingId] || null;
}

function removeUploadState(recordingId: string): void {
  const store = getUploadStateStore();
  delete store.uploads[recordingId];
  localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(store));
}

function findResumableUpload(
  fileName: string,
  fileSize: number,
  fileLastModified: number
): MultipartUploadState | null {
  const store = getUploadStateStore();
  for (const state of Object.values(store.uploads)) {
    if (
      state.fileName === fileName &&
      state.fileSize === fileSize &&
      state.fileLastModified === fileLastModified
    ) {
      // R2 multipart uploads expire after 7 days
      const ageHours = (Date.now() - state.createdAt) / (1000 * 60 * 60);
      if (ageHours < 24 * 7) {
        return state;
      }
    }
  }
  return null;
}

async function uploadPart(
  url: string,
  chunk: Blob,
  onProgress: (loaded: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("No ETag in response"));
          return;
        }
        resolve(etag);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error"));
    };

    xhr.open("PUT", url);
    xhr.send(chunk);
  });
}

export function useConvexRecordings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const recordings = useQuery(
    api.model.recordings.public.getRecordings,
    isAuthenticated ? {} : "skip"
  );

  const createPendingRecordingMutation = useMutation(
    api.model.recordings.public.createPendingRecording
  );
  const initiateMultipartUploadAction = useAction(
    api.model.recordings.multipart.initiateMultipartUpload
  );
  const generatePartUploadUrlAction = useAction(
    api.model.recordings.multipart.generatePartUploadUrl
  );
  const completeMultipartUploadAction = useAction(
    api.model.recordings.multipart.completeMultipartUpload
  );
  const abortMultipartUploadAction = useAction(api.model.recordings.multipart.abortMultipartUpload);
  const listUploadedPartsAction = useAction(api.model.recordings.multipart.listUploadedParts);
  const submitTranscodingJobAction = useAction(api.model.recordings.public.submitTranscodingJob);
  const deleteRecordingAction = useAction(api.model.recordings.public.deleteRecording);
  const retryTranscodingJobAction = useAction(api.model.recordings.public.retryTranscodingJob);

  const uploadRecording = async (
    file: File,
    name: string,
    description?: string,
    duration?: number,
    onProgress?: (percent: number) => void
  ): Promise<{ recordingId: string }> => {
    // Check for resumable upload
    let uploadState = findResumableUpload(file.name, file.size, file.lastModified);

    let recordingId: string;
    let key: string;
    let uploadId: string;
    let totalParts: number;
    let parts: UploadPartState[];

    if (uploadState) {
      // Resume existing upload
      recordingId = uploadState.recordingId;
      key = uploadState.key;
      uploadId = uploadState.uploadId;
      totalParts = uploadState.totalParts;

      // Verify upload still exists on R2 and get completed parts
      const { parts: remoteParts } = await listUploadedPartsAction({
        key,
        uploadId,
      });

      // Update local state with remote state
      parts = uploadState.parts.map((part) => {
        const remotePart = remoteParts.find((p) => p.PartNumber === part.partNumber);
        if (remotePart) {
          return {
            ...part,
            etag: remotePart.ETag,
            status: "completed" as const,
          };
        }
        return { ...part, status: "pending" as const, etag: null };
      });
    } else {
      // Start new upload
      const { recordingId: newRecordingId } = await createPendingRecordingMutation({
        name,
        description,
        mimeType: file.type,
        fileSize: file.size,
        duration,
      });
      recordingId = newRecordingId;

      const { uploadId: newUploadId, key: newKey } = await initiateMultipartUploadAction({
        recordingId: recordingId as Id<"recordings">,
        contentType: file.type,
      });
      uploadId = newUploadId;
      key = newKey;

      // Calculate parts
      totalParts = Math.ceil(file.size / CHUNK_SIZE);
      parts = Array.from({ length: totalParts }, (_, i) => ({
        partNumber: i + 1,
        start: i * CHUNK_SIZE,
        end: Math.min((i + 1) * CHUNK_SIZE, file.size),
        etag: null,
        status: "pending" as const,
        retryCount: 0,
      }));

      // Save initial state
      uploadState = {
        recordingId,
        key,
        uploadId,
        fileName: file.name,
        fileSize: file.size,
        fileLastModified: file.lastModified,
        contentType: file.type,
        totalParts,
        parts,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveUploadState(uploadState);
    }

    // Track progress
    const partProgress: Record<number, number> = {};
    const updateProgress = () => {
      if (!onProgress) return;
      let totalLoaded = 0;
      for (const part of parts) {
        if (part.status === "completed") {
          totalLoaded += part.end - part.start;
        } else if (part.status === "uploading") {
          totalLoaded += partProgress[part.partNumber] || 0;
        }
      }
      const percent = Math.round((totalLoaded / file.size) * 100);
      onProgress(percent);
    };

    // Upload queue with concurrency control
    const pendingParts = parts.filter((p) => p.status !== "completed");
    const activeUploads = new Map<number, Promise<void>>();
    const errors: Error[] = [];

    const uploadNextPart = async (part: UploadPartState): Promise<void> => {
      if (part.retryCount >= MAX_RETRIES) {
        errors.push(new Error(`Part ${part.partNumber}: Max retries exceeded`));
        return;
      }

      part.status = "uploading";
      saveUploadState({ ...uploadState!, parts });

      const chunk = file.slice(part.start, part.end);
      const { url } = await generatePartUploadUrlAction({
        key,
        uploadId,
        partNumber: part.partNumber,
      });

      try {
        const etag = await uploadPart(url, chunk, (loaded) => {
          partProgress[part.partNumber] = loaded;
          updateProgress();
        });

        part.etag = etag;
        part.status = "completed";
        saveUploadState({ ...uploadState!, parts });
      } catch {
        part.status = "failed";
        part.retryCount++;
        saveUploadState({ ...uploadState!, parts });

        // Exponential backoff retry
        const delay = RETRY_DELAY_BASE * Math.pow(2, part.retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Re-queue for retry
        pendingParts.push(part);
      }
    };

    // Process upload queue with concurrency limit
    while (pendingParts.length > 0 || activeUploads.size > 0) {
      // Start new uploads up to concurrency limit
      while (activeUploads.size < MAX_CONCURRENT_UPLOADS && pendingParts.length > 0) {
        const part = pendingParts.shift()!;
        const uploadPromise = uploadNextPart(part).finally(() => {
          activeUploads.delete(part.partNumber);
        });
        activeUploads.set(part.partNumber, uploadPromise);
      }

      // Wait for at least one to complete
      if (activeUploads.size > 0) {
        await Promise.race(activeUploads.values());
      }
    }

    // Check for errors
    if (errors.length > 0) {
      throw new Error(`Upload failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    // Complete the multipart upload
    const completedParts = parts
      .filter((p) => p.status === "completed" && p.etag)
      .map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.etag!,
      }));

    if (completedParts.length !== totalParts) {
      throw new Error(`Only ${completedParts.length}/${totalParts} parts completed`);
    }

    await completeMultipartUploadAction({
      key,
      uploadId,
      parts: completedParts,
    });

    // Clean up local state
    removeUploadState(recordingId);

    return { recordingId };
  };

  const abortUpload = async (recordingId: string): Promise<void> => {
    const state = getUploadState(recordingId);
    if (state) {
      await abortMultipartUploadAction({
        key: state.key,
        uploadId: state.uploadId,
      });
      removeUploadState(recordingId);
    }
  };

  const getPendingUploads = (): MultipartUploadState[] => {
    const store = getUploadStateStore();
    return Object.values(store.uploads);
  };

  const startTranscoding = async (recordingId: string) => {
    return submitTranscodingJobAction({
      recordingId: recordingId as Id<"recordings">,
    });
  };

  const deleteRecording = async (recordingId: string) => {
    return deleteRecordingAction({
      recordingId: recordingId as Id<"recordings">,
    });
  };

  const retryTranscoding = async (recordingId: string) => {
    return retryTranscodingJobAction({
      recordingId: recordingId as Id<"recordings">,
    });
  };

  return {
    recordings: recordings ?? [],
    isLoading: authLoading || (isAuthenticated && recordings === undefined),
    isAuthenticated,
    uploadRecording,
    abortUpload,
    getPendingUploads,
    startTranscoding,
    deleteRecording,
    retryTranscoding,
  };
}
