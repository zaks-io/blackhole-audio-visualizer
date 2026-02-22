import { preloadQuery } from "convex/nextjs";
import { api } from "@blackhole/backend/convex/_generated/api";
import { LiveModeUIClient } from "./LiveModeUIClient";

export default async function LiveModeUI() {
  const [preloadedPresets, preloadedPlaylists] = await Promise.all([
    preloadQuery(api.model.presets.public.getPublicPresets),
    preloadQuery(api.model.playlists.public.getPublicPlaylists),
  ]);

  return (
    <LiveModeUIClient preloadedPresets={preloadedPresets} preloadedPlaylists={preloadedPlaylists} />
  );
}
