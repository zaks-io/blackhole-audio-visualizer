"use client";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAudioPlayerStore } from "@/hooks/useAudioPlayerStore";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  songId: string;
  url: string;
  className?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ songId, url, className }: AudioPlayerProps) {
  const currentSongId = useAudioPlayerStore((s) => s.currentSongId);
  const isPlaying = useAudioPlayerStore((s) => s.isPlaying);
  const currentTime = useAudioPlayerStore((s) => s.currentTime);
  const duration = useAudioPlayerStore((s) => s.duration);
  const play = useAudioPlayerStore((s) => s.play);
  const pause = useAudioPlayerStore((s) => s.pause);
  const resume = useAudioPlayerStore((s) => s.resume);
  const seek = useAudioPlayerStore((s) => s.seek);

  const isThisSongActive = currentSongId === songId;
  const isThisSongPlaying = isThisSongActive && isPlaying;

  const handlePlayPause = () => {
    if (isThisSongActive) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      play(songId, url);
    }
  };

  const handleSeek = (value: number[]) => {
    if (isThisSongActive && value[0] !== undefined) {
      seek(value[0]);
    }
  };

  const displayTime = isThisSongActive ? currentTime : 0;
  const displayDuration = isThisSongActive && duration > 0 ? duration : 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button variant="ghost" size="icon-sm" onClick={handlePlayPause} className="shrink-0">
        {isThisSongPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      <Slider
        value={[displayTime]}
        min={0}
        max={displayDuration || 1}
        step={0.1}
        onValueChange={handleSeek}
        className="flex-1"
        disabled={!isThisSongActive}
      />

      <span className="text-xs text-zinc-400 tabular-nums min-w-[70px] text-right">
        {formatTime(displayTime)} / {formatTime(displayDuration)}
      </span>
    </div>
  );
}
