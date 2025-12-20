"use client";

import { useState } from "react";
import {
  MoreVertical,
  HelpCircle,
  User,
  LogOut,
  Gauge,
  Zap,
  ListMusic,
  Monitor,
  Mic,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUIState } from "@/hooks/useUIState";
import { useConvexPlaylists } from "@/hooks/useConvexPlaylists";
import { usePlaylistControls } from "@/components/playlist/usePlaylistControls";

export function MobileOverflowMenu() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { isLoading: isAuthLoading } = useConvexAuth();
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
  const { fpsVisible, toggleFPS, bassStrobeEnabled, toggleBassStrobe } = useUIState();
  const { playlists, publicPlaylists, isLoading: isPlaylistLoading } = useConvexPlaylists();
  const { selectedPlaylistId, setSelectedPlaylistId } = usePlaylistControls();

  const handleSignIn = () => {
    loginWithRedirect({
      appState: {
        returnTo: typeof window !== "undefined" ? window.location.pathname : "/",
      },
    });
  };

  const handleSignOut = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handlePlaylistSelect = (playlistId: string | null) => {
    setSelectedPlaylistId(playlistId);
  };

  // Filter out public playlists that are already in user's playlists (to avoid duplicates)
  const userPlaylistIds = new Set(playlists.map((p) => p._id));
  const filteredPublicPlaylists = publicPlaylists.filter((p) => !userPlaylistIds.has(p._id));
  const allPlaylists = [...playlists, ...filteredPublicPlaylists];
  const selectedPlaylist = allPlaylists.find((p) => p._id === selectedPlaylistId);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.charAt(0).toUpperCase() ||
    "?";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full sm:hidden">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Playlist Selection */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <ListMusic className="mr-2 h-4 w-4" />
              <span className="truncate">{selectedPlaylist?.name ?? "Playlist"}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => handlePlaylistSelect(null)}
                className="cursor-pointer"
              >
                None
              </DropdownMenuItem>
              {!isPlaylistLoading && (
                <>
                  {isAuthenticated && playlists.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        My Playlists
                      </DropdownMenuLabel>
                      {playlists.map((p) => (
                        <DropdownMenuItem
                          key={p._id}
                          onClick={() => handlePlaylistSelect(p._id)}
                          className="cursor-pointer"
                        >
                          {p.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {filteredPublicPlaylists.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Public Playlists
                      </DropdownMenuLabel>
                      {filteredPublicPlaylists.map((p) => (
                        <DropdownMenuItem
                          key={p._id}
                          onClick={() => handlePlaylistSelect(p._id)}
                          className="cursor-pointer"
                        >
                          {p.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Settings */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Settings</DropdownMenuLabel>
          <div className="px-2 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">FPS Meter</span>
            </div>
            <Switch checked={fpsVisible} onCheckedChange={toggleFPS} />
          </div>
          <div className="px-2 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Bass Strobe</span>
            </div>
            <Switch checked={bassStrobeEnabled} onCheckedChange={toggleBassStrobe} />
          </div>

          <DropdownMenuSeparator />

          {/* Help */}
          <DropdownMenuItem onClick={() => setHelpOpen(true)} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* User */}
          {isAuthLoading ? (
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              Loading...
            </DropdownMenuItem>
          ) : isAuthenticated ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.picture} alt={user?.name || "User"} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">{user?.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleSignIn} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Sign In
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Getting Started</DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Monitor className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">
                  Desktop App <span className="text-cyan-400">(Recommended)</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Captures system audio directly. Just play music and the visualizer reacts
                  automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Mic className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Web & Mobile</h4>
                <p className="text-sm text-muted-foreground">
                  Uses your microphone to capture sound. Play music through your speakers or let it
                  pick up ambient audio around you.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Advanced: BlackHole (macOS)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Route system audio directly to your microphone input for high-quality capture on
                  web.
                </p>
                <a
                  href="https://existential.audio/blackhole/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Download BlackHole
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
