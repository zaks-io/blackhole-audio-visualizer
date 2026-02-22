"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";
import { HlsPlayer } from "@/components/video/HlsPlayer";
import { Loader2 } from "lucide-react";

interface WatchPageClientProps {
  preloadedRecording: Preloaded<typeof api.model.recordings.public.getRecordingById>;
}

export function WatchPageClient({ preloadedRecording }: WatchPageClientProps) {
  const recording = usePreloadedQuery(preloadedRecording);

  if (!recording) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white">Recording not found</p>
      </div>
    );
  }

  if (recording.transcodingStatus !== "completed" || !recording.hlsUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg mb-2">{recording.name}</p>
          {recording.transcodingStatus === "processing" && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>Processing video...</p>
            </div>
          )}
          {recording.transcodingStatus === "pending" && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>Waiting to process...</p>
            </div>
          )}
          {recording.transcodingStatus === "uploaded" && (
            <p className="text-muted-foreground">Video not yet transcoded for streaming.</p>
          )}
          {recording.transcodingStatus === "failed" && (
            <p className="text-red-500">Processing failed: {recording.transcodingError}</p>
          )}
        </div>
      </div>
    );
  }

  return <HlsPlayer src={recording.hlsUrl} className="w-full h-full" />;
}
