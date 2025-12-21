import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { LiveModeUIClient } from "./LiveModeUIClient";

export default async function LiveModeUI() {
  // Preload public presets and playlists on the server
  // Note: These queries will run in parallel
  const preloadedPresets = await preloadQuery(api.model.presets.public.getPublicPresets);
  const preloadedPlaylists = await preloadQuery(api.model.playlists.public.getPublicPlaylists);

  return (
    <LiveModeUIClient preloadedPresets={preloadedPresets} preloadedPlaylists={preloadedPlaylists} />
  );
}
