"use client";

import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { Music, Loader2, Check, X, Play, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioPlayerStore } from "@/hooks/useAudioPlayerStore";
import { api } from "@blackhole/backend/convex/_generated/api";
import type { Id } from "@blackhole/backend/convex/_generated/dataModel";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import { ToolResultBase } from "./ToolResultBase";

interface GenerateSongButtonProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
  onGenerate?: (songId: string) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function GeneratingWaveform() {
  return (
    <div className="flex items-center justify-center gap-0.5 h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-cyan-400 rounded-full"
          style={{
            height: `${8 + (i % 3) * 4}px`,
            animation: "pulse 0.8s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
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

  const song = useQuery(
    api.model.scenes.public.getSongById,
    songId ? { songId: songId as Id<"generatedSongs"> } : "skip"
  );

  const playAudio = useAudioPlayerStore((s) => s.play);

  const handleClick = () => {
    if (!songId || !onGenerate) return;
    onGenerate(songId);
  };

  // Loading state
  if (status !== "done" || !songId || !song) {
    return (
      <ToolResultBase
        className={className}
        icon={<Loader2 className="w-4 h-4 animate-spin" />}
        variant="generate"
        title="Preparing song..."
        status={status}
      />
    );
  }

  // COMPLETED - Simple play button (media player at bottom handles controls)
  if (song.status === "completed" && song.audioUrl) {
    const durationBadge = song.durationMs && (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-medium">
        {formatDuration(song.durationMs)}
      </span>
    );

    const playButton = (
      <button
        onClick={() => playAudio(songId, song.audioUrl!)}
        className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-[0_0_20px_rgba(0,212,255,0.5)]"
      >
        <Play className="w-4 h-4 text-cyan-950 ml-0.5" fill="currentColor" />
      </button>
    );

    return (
      <ToolResultBase
        className={className}
        icon={<Check className="w-4 h-4" />}
        variant="generate"
        title="Song Generated"
        subtitle={songTitle}
        headerExtra={durationBadge}
        actions={playButton}
        status="done"
      />
    );
  }

  // FAILED
  if (song.status === "failed") {
    return (
      <ToolResultBase
        className={className}
        icon={<X className="w-4 h-4" />}
        variant="error"
        title="Generation Failed"
        subtitle={song.error}
        status="failed"
      />
    );
  }

  // GENERATING - Animated progress
  if (song.status === "generating") {
    return (
      <div
        className={cn(
          className,
          "relative rounded-xl border overflow-hidden",
          "bg-gradient-to-r from-cyan-950/40 via-cyan-900/20 to-cyan-950/40",
          "border-cyan-500/30",
          "shadow-[0_0_40px_-10px_rgba(0,212,255,0.3)]"
        )}
      >
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/40 to-cyan-600/30 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <Disc3
                className="w-4 h-4 text-cyan-300 animate-spin"
                style={{ animationDuration: "3s" }}
              />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-cyan-100">Generating Song...</div>
              <div className="text-xs text-cyan-400/70 mt-0.5">{songTitle}</div>
            </div>
            <GeneratingWaveform />
          </div>
        </div>
        <div className="h-1 bg-cyan-950">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 animate-pulse"
            style={{ width: "65%" }}
          />
        </div>
      </div>
    );
  }

  // READY - Bold "Generate Now" CTA
  const estimatedDuration = data?.totalDurationMs && (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-medium">
      ~{formatDuration(data.totalDurationMs)}
    </span>
  );

  return (
    <div
      className={cn(
        className,
        "relative rounded-xl border overflow-hidden",
        "bg-gradient-to-br from-cyan-950/30 via-purple-950/20 to-cyan-950/30",
        "border-cyan-500/40"
      )}
    >
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/40 to-purple-500/30 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Music className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Generate Now</span>
              {estimatedDuration}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">{songTitle}</div>
          </div>
          <Button
            onClick={handleClick}
            disabled={!onGenerate}
            className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-cyan-950 font-semibold shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] transition-all"
          >
            <Play className="w-4 h-4 mr-1.5" />
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}
