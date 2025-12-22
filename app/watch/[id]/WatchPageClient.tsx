"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { HlsPlayer } from "@/components/video/HlsPlayer";
import { Loader2 } from "lucide-react";

interface Recording {
  _id: Id<"recordings">;
  name: string;
  description?: string;
  transcodingStatus: "pending" | "processing" | "completed" | "failed";
  transcodingError?: string;
  hlsUrl?: string;
}

interface WatchPageClientProps {
  recording: Recording;
}

export function WatchPageClient({ recording: initialRecording }: WatchPageClientProps) {
  const recording =
    useQuery(api.model.recordings.public.getRecordingById, {
      recordingId: initialRecording._id,
    }) ?? initialRecording;

  if (recording.transcodingStatus !== "completed" || !recording.hlsUrl) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
          {recording.transcodingStatus === "failed" && (
            <p className="text-red-500">Processing failed: {recording.transcodingError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl text-white mb-4">{recording.name}</h1>
        {recording.description && (
          <p className="text-muted-foreground mb-4">{recording.description}</p>
        )}
        <HlsPlayer src={recording.hlsUrl} />
      </div>
    </div>
  );
}
