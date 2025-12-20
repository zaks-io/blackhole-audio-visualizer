"use client";

import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConvexPlaylists } from "@/hooks/useConvexPlaylists";
import { PlaylistList } from "./PlaylistList";
import { PlaylistEditor } from "./PlaylistEditor";

export function PlaylistTab() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { isLoading: playlistsLoading } = useConvexPlaylists();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  if (authLoading || playlistsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to create and manage playlists</p>
          <Button onClick={() => loginWithRedirect()} size="sm">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (selectedPlaylistId) {
    return (
      <PlaylistEditor playlistId={selectedPlaylistId} onBack={() => setSelectedPlaylistId(null)} />
    );
  }

  return <PlaylistList onSelect={setSelectedPlaylistId} />;
}
