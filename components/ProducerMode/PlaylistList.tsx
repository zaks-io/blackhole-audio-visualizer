"use client";

import { useState } from "react";
import { Plus, ListMusic, Globe, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConvexPlaylists } from "@/hooks/useConvexPlaylists";

interface PlaylistListProps {
  onSelect: (playlistId: string) => void;
}

export function PlaylistList({ onSelect }: PlaylistListProps) {
  const { playlists, createPlaylist, deletePlaylist } = useConvexPlaylists();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!playlistName.trim()) return;

    setIsCreating(true);
    try {
      const result = await createPlaylist(playlistName.trim(), false);
      setPlaylistName("");
      setCreateDialogOpen(false);
      if (result?.playlistId) {
        onSelect(result.playlistId);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    await deletePlaylist(playlistId);
  };

  const sortedPlaylists = [...playlists].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-white/5">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Playlist
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {sortedPlaylists.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <ListMusic className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No playlists yet</p>
            <p className="text-xs mt-1">Create one to organize your presets</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedPlaylists.map((playlist) => (
              <div
                key={playlist._id}
                className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white/5 cursor-pointer group"
                onClick={() => onSelect(playlist._id)}
              >
                <ListMusic className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{playlist.name}</span>
                    {playlist.isPublic && (
                      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {playlist.items.length} preset{playlist.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(e, playlist._id)}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Playlist</DialogTitle>
            <DialogDescription>Create a new playlist to organize your presets.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Playlist name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!playlistName.trim() || isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
