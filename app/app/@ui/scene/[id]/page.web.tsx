import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SceneModeUIClient } from "./SceneModeUIClient";
import { Id } from "@/convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScenePage({ params }: PageProps) {
  const { id } = await params;

  let preloadedScene;
  try {
    preloadedScene = await preloadQuery(api.model.scenes.public.getSceneWithDetailsPublic, {
      sceneId: id as Id<"scenes">,
    });
  } catch (error) {
    // Even if preload fails (e.g. auth), we want to render the client component
    // which handles the null state gracefully
    throw error;
  }

  return <SceneModeUIClient sceneId={id} preloadedScene={preloadedScene} />;
}
