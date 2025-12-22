import { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { WatchPageClient } from "./WatchPageClient";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const recording = await convex.query(api.model.recordings.public.getRecordingById, {
    recordingId: id as Id<"recordings">,
  });

  return {
    title: recording?.name ?? "Recording",
    description: recording?.description ?? "Watch this recording",
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { id } = await params;
  const recording = await convex.query(api.model.recordings.public.getRecordingById, {
    recordingId: id as Id<"recordings">,
  });

  if (!recording) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Recording not found</p>
      </div>
    );
  }

  return <WatchPageClient recording={recording} />;
}
