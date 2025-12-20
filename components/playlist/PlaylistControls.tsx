"use client";

import { useEffect } from "react";
import { ListMusic, Play, Pause } from "lucide-react";
import { useConvexAuth } from "convex/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConvexPlaylists, usePlaylistWithPresets } from "@/hooks/useConvexPlaylists";
import { usePlaylistPlayer } from "@/hooks/usePlaylistPlayer";
import { usePlaylistControls } from "./usePlaylistControls";

interface PlaylistControlsProps {
  compact?: boolean;
}

export function PlaylistControls({ compact = false }: PlaylistControlsProps) {
  const { isAuthenticated } = useConvexAuth();
  const { playlists, publicPlaylists, isLoading } = useConvexPlaylists();
  const { selectedPlaylistId, setSelectedPlaylistId, shouldPlay, clearTriggerPlay } =
    usePlaylistControls();
  const { playlist, isLoading: isPlaylistLoading } = usePlaylistWithPresets(selectedPlaylistId);
  const { state, play, pause, resume, stop } = usePlaylistPlayer(playlist ?? null);

  // Default to first public playlist, or clear if selected no longer exists
  useEffect(() => {
    if (isLoading) return;

    const allPlaylists = [...playlists, ...publicPlaylists];

    if (selectedPlaylistId) {
      const exists = allPlaylists.some((p) => p._id === selectedPlaylistId);
      if (!exists) {
        setSelectedPlaylistId(publicPlaylists[0]?._id ?? null);
      }
    } else if (publicPlaylists.length > 0) {
      setSelectedPlaylistId(publicPlaylists[0]._id);
    }
  }, [isLoading, selectedPlaylistId, playlists, publicPlaylists, setSelectedPlaylistId]);

  // Auto-play when triggered (e.g., from "Start listening" button)
  useEffect(() => {
    if (shouldPlay && playlist && playlist.items.length > 0 && !state.isPlaying) {
      play();
      clearTriggerPlay();
    } else if (shouldPlay) {
      clearTriggerPlay();
    }
  }, [shouldPlay, playlist, state.isPlaying, play, clearTriggerPlay]);

  const handleValueChange = (value: string) => {
    if (value === "none") {
      stop();
      setSelectedPlaylistId(null);
    } else {
      if (state.isPlaying) {
        stop();
      }
      setSelectedPlaylistId(value);
    }
  };

  const handlePlayPauseToggle = () => {
    if (!state.isPlaying) {
      play();
    } else if (state.isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const hasPlaylists = playlists.length > 0 || publicPlaylists.length > 0;
  const canPlay = playlist && playlist.items.length > 0;

  // Find selected playlist name for display
  const allPlaylists = [...playlists, ...publicPlaylists];
  const selectedPlaylist = allPlaylists.find((p) => p._id === selectedPlaylistId);

  return (
    <div className="flex items-center gap-1">
      {/* Playlist dropdown - hide on mobile when compact */}
      <div className={cn(compact && "hidden sm:block")}>
        <Select
          value={selectedPlaylistId ?? "none"}
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger
            className={cn(
              "h-10 w-36 gap-2 rounded-full border-0 bg-transparent px-3",
              "hover:bg-accent/50",
              "focus:ring-0 focus-visible:ring-0",
              isLoading && "opacity-50 cursor-wait"
            )}
          >
            <ListMusic className="h-4 w-4" />
            <SelectValue placeholder="Playlist" className="truncate">
              {selectedPlaylist?.name ?? "Playlist"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" className="!overflow-y-visible !max-h-none">
            <SelectItem value="none">None</SelectItem>

            {hasPlaylists && <SelectSeparator />}

            {isAuthenticated && playlists.length > 0 && (
              <>
                <SelectGroup>
                  <SelectLabel>My Playlists</SelectLabel>
                  {playlists.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {publicPlaylists.length > 0 && <SelectSeparator />}
              </>
            )}

            {publicPlaylists.length > 0 && (
              <SelectGroup>
                <SelectLabel>Public Playlists</SelectLabel>
                {publicPlaylists.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Play/Pause button - always visible when playlist selected */}
      {selectedPlaylistId && (
        <div className="relative">
          {state.isPlaying && (state.status === "tweening" || state.status === "waiting") && (
            <svg
              className="absolute inset-0 -rotate-90 pointer-events-none"
              width="40"
              height="40"
              viewBox="0 0 40 40"
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-primary/30"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 18}
                strokeDashoffset={2 * Math.PI * 18 * (1 - state.waitProgress)}
                className="text-primary"
              />
            </svg>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPauseToggle}
            disabled={!canPlay || isPlaylistLoading}
            className={cn(
              "h-10 w-10 rounded-full",
              state.isPlaying && !state.isPaused && "bg-primary/20 text-primary"
            )}
          >
            {state.isPlaying && !state.isPaused ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
