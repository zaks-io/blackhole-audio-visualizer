"use client";

import { useState } from "react";
import { PlaylistList } from "./PlaylistList";
import { PlaylistEditor } from "./PlaylistEditor";

export function PlaylistTab() {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  if (selectedPlaylistId) {
    return (
      <PlaylistEditor playlistId={selectedPlaylistId} onBack={() => setSelectedPlaylistId(null)} />
    );
  }

  return <PlaylistList onSelect={setSelectedPlaylistId} />;
}
