import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SceneModeUIClient } from "./SceneModeUIClient";
import { Id } from "@/convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScenePage({ params }: PageProps) {
  const { id } = await params;

  console.log(`[SSR] Preloading scene: ${id}`);

  let preloadedScene;
  try {
    preloadedScene = await preloadQuery(api.model.scenes.public.getSceneWithDetailsPublic, {
      sceneId: id as Id<"scenes">,
    });
    console.log(`[SSR] Preload complete for ${id}`);
  } catch (error) {
    console.error(`[SSR] Error preloading scene ${id}:`, error);
    // Even if preload fails (e.g. auth), we want to render the client component
    // which handles the null state gracefully
    throw error;
  }

  return <SceneModeUIClient sceneId={id} preloadedScene={preloadedScene} />;
}
