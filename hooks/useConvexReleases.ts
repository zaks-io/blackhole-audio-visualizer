"use client";

import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useConvexReleases() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const releases = useQuery(api.model.releases.public.getReleases, isAuthenticated ? {} : "skip");

  const generateUploadUrlMutation = useMutation(api.model.releases.public.generateUploadUrl);
  const createReleaseMutation = useMutation(api.model.releases.public.createRelease);
  const deleteReleaseMutation = useMutation(api.model.releases.public.deleteRelease);
  const setLatestMutation = useMutation(api.model.releases.public.setLatest);

  const uploadRelease = async (
    file: File,
    fileName: string,
    platform: "windows" | "macos",
    version: string,
    isLatest: boolean,
    onProgress?: (percent: number) => void
  ) => {
    const uploadUrl = await generateUploadUrlMutation();

    const { storageId } = await new Promise<{ storageId: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error("Failed to upload file"));
        }
      };

      xhr.onerror = () => reject(new Error("Failed to upload file"));

      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    const result = await createReleaseMutation({
      storageId: storageId as Id<"_storage">,
      fileName,
      platform,
      version,
      isLatest,
    });

    return result;
  };

  const deleteRelease = async (releaseId: string) => {
    return deleteReleaseMutation({
      releaseId: releaseId as Id<"releases">,
    });
  };

  const setLatest = async (releaseId: string) => {
    return setLatestMutation({
      releaseId: releaseId as Id<"releases">,
    });
  };

  return {
    releases: releases ?? [],
    isLoading: authLoading || (isAuthenticated && releases === undefined),
    isAuthenticated,
    uploadRelease,
    deleteRelease,
    setLatest,
  };
}
