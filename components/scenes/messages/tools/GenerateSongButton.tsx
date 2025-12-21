"use client";

import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { Music, Loader2, Check, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";

interface GenerateSongButtonProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
  onGenerate?: (songId: string) => void;
}

export function GenerateSongButton({
  className,
  output,
  status,
  onGenerate,
}: GenerateSongButtonProps) {
  const data = output as
    | {
        songId?: string;
        songTitle?: string;
        totalDurationMs?: number;
        error?: string;
      }
    | undefined;

  const songId = data?.songId;
  const songTitle = data?.songTitle || "Untitled";

  // Subscribe to song status
  const song = useQuery(
    api.model.scenes.public.getSongById,
    songId ? { songId: songId as Id<"generatedSongs"> } : "skip"
  );

  const handleClick = () => {
    if (!songId || !onGenerate) return;
    onGenerate(songId);
  };

  // Tool still executing
  if (status !== "done" || !songId) {
    return (
      <div
        className={cn(
          className,
          "px-3 py-2 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-lg border border-primary/30"
        )}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-zinc-400">Preparing song...</span>
        </div>
      </div>
    );
  }

  // Loading song data
  if (!song) {
    return (
      <div
        className={cn(
          className,
          "px-3 py-2 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-lg border border-primary/30"
        )}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Completed - show audio player
  if (song.status === "completed" && song.audioUrl) {
    return (
      <div className={cn(className, "p-3 bg-green-500/10 rounded-lg border border-green-500/30")}>
        <div className="flex items-center gap-2 mb-2">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-300">{songTitle}</span>
          <span className="text-xs text-zinc-500">
            {song.durationMs ? `${Math.round(song.durationMs / 1000)}s` : ""}
          </span>
        </div>
        <AudioPlayer songId={songId} url={song.audioUrl} />
      </div>
    );
  }

  // Failed - show error
  if (song.status === "failed") {
    return (
      <div className={cn(className, "p-3 bg-red-500/10 rounded-lg border border-red-500/30")}>
        <div className="flex items-center gap-2">
          <X className="w-4 h-4 text-red-400" />
          <div>
            <span className="text-sm font-medium text-red-300">Generation Failed</span>
            {song.error && <p className="text-xs text-red-400/70">{song.error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Generating - show progress
  if (song.status === "generating") {
    return (
      <div className={cn(className, "p-3 bg-primary/10 rounded-lg border border-primary/30")}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-primary">Generating {songTitle}...</span>
        </div>
        <div className="mt-2 h-1 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary/50 animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  // Ready - show generate button
  return (
    <div
      className={cn(
        className,
        "p-3 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-lg border border-primary/30"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Music className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{songTitle}</span>
        {data?.totalDurationMs && (
          <span className="text-xs text-zinc-500">{Math.round(data.totalDurationMs / 1000)}s</span>
        )}
      </div>
      <Button onClick={handleClick} className="w-full" disabled={!onGenerate}>
        <Play className="w-4 h-4 mr-2" />
        Generate Song
      </Button>
    </div>
  );
}
