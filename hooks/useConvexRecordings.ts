"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useConvexRecordings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const recordings = useQuery(
    api.model.recordings.public.getRecordings,
    isAuthenticated ? {} : "skip"
  );

  const createPendingRecordingMutation = useMutation(
    api.model.recordings.public.createPendingRecording
  );
  const generateR2UploadUrlAction = useAction(api.model.recordings.public.generateR2UploadUrl);
  const submitTranscodingJobAction = useAction(api.model.recordings.public.submitTranscodingJob);
  const deleteRecordingAction = useAction(api.model.recordings.public.deleteRecording);
  const retryTranscodingJobAction = useAction(api.model.recordings.public.retryTranscodingJob);

  const uploadRecording = async (
    file: File,
    name: string,
    description?: string,
    duration?: number,
    onProgress?: (percent: number) => void
  ) => {
    const { recordingId } = await createPendingRecordingMutation({
      name,
      description,
      mimeType: file.type,
      fileSize: file.size,
      duration,
    });

    const { uploadUrl } = await generateR2UploadUrlAction({
      recordingId,
      contentType: file.type,
    });

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Failed to upload file to R2"));
        }
      };

      xhr.onerror = () => reject(new Error("Failed to upload file to R2"));

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    return { recordingId };
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
    startTranscoding,
    deleteRecording,
    retryTranscoding,
  };
}
