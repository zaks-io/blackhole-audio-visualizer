"use client";

import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useConvexRecordings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const recordings = useQuery(
    api.model.recordings.public.getRecordings,
    isAuthenticated ? {} : "skip"
  );

  const generateUploadUrlMutation = useMutation(api.model.recordings.public.generateUploadUrl);
  const createRecordingMutation = useMutation(api.model.recordings.public.createRecording);
  const deleteRecordingMutation = useMutation(api.model.recordings.public.deleteRecording);

  const uploadRecording = async (
    file: File,
    name: string,
    description?: string,
    duration?: number
  ) => {
    const uploadUrl = await generateUploadUrlMutation();

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    const { storageId } = await response.json();

    const result = await createRecordingMutation({
      storageId: storageId as Id<"_storage">,
      name,
      description,
      mimeType: file.type,
      fileSize: file.size,
      duration,
    });

    return result;
  };

  const deleteRecording = async (recordingId: string) => {
    return deleteRecordingMutation({
      recordingId: recordingId as Id<"recordings">,
    });
  };

  return {
    recordings: recordings ?? [],
    isLoading: authLoading || (isAuthenticated && recordings === undefined),
    isAuthenticated,
    uploadRecording,
    deleteRecording,
  };
}
