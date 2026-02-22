"use client";

import { useState, useMemo } from "react";
import { Music } from "lucide-react";
import { useThreadSongs, type GeneratedSong } from "@/hooks/useConvexScenes";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ThreadAudioPlayerProps {
  threadId: string | null;
}

type CompletedSong = GeneratedSong & { audioUrl: string };

function ThreadAudioPlayerInner({ completedSongs }: { completedSongs: CompletedSong[] }) {
  // User's explicit selection (null = use latest/first)
  const [userSelectedSongId, setUserSelectedSongId] = useState<string | null>(null);

  // Compute effective selected song
  const selectedSong = useMemo(() => {
    if (completedSongs.length === 0) return null;
    if (userSelectedSongId) {
      const found = completedSongs.find((s) => s._id === userSelectedSongId);
      if (found) return found;
    }
    return completedSongs[0];
  }, [completedSongs, userSelectedSongId]);

  if (!selectedSong) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-white/5 bg-black/20">
      {completedSongs.length === 1 ? (
        <div className="flex items-center gap-2 mb-2">
          <Music className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs text-zinc-400 truncate">{selectedSong.name}</span>
        </div>
      ) : (
        <div className="mb-2">
          <Select value={selectedSong._id} onValueChange={setUserSelectedSongId}>
            <SelectTrigger size="sm" className="w-full h-7 text-xs">
              <Music className="w-3 h-3 text-primary shrink-0" />
              <SelectValue placeholder="Select a song" />
            </SelectTrigger>
            <SelectContent>
              {completedSongs.map((song, i) => (
                <SelectItem key={song._id} value={song._id}>
                  <span className="truncate">{song.name}</span>
                  {i === 0 && <span className="text-[10px] text-primary ml-1">(latest)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <AudioPlayer songId={selectedSong._id} url={selectedSong.audioUrl} />
    </div>
  );
}

export function ThreadAudioPlayer({ threadId }: ThreadAudioPlayerProps) {
  const { completedSongs } = useThreadSongs(threadId);

  if (!threadId || completedSongs.length === 0) {
    return null;
  }

  // Key on threadId to reset selection state when thread changes
  // User selection persists when new songs arrive
  return <ThreadAudioPlayerInner key={threadId} completedSongs={completedSongs} />;
}
