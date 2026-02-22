"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";
import { LiveModeUIInner } from "./LiveModeUIInner";

interface LiveModeUIClientProps {
  preloadedPresets: Preloaded<typeof api.model.presets.public.getPublicPresets>;
  preloadedPlaylists: Preloaded<typeof api.model.playlists.public.getPublicPlaylists>;
}

export function LiveModeUIClient({ preloadedPresets, preloadedPlaylists }: LiveModeUIClientProps) {
  // Preload data so it's available immediately in cache for child components
  usePreloadedQuery(preloadedPresets);
  usePreloadedQuery(preloadedPlaylists);

  return <LiveModeUIInner />;
}
