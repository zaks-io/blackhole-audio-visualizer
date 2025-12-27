import { Metadata } from "next";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { WatchPageClient } from "./WatchPageClient";

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const preloadedRecording = await preloadQuery(api.model.recordings.public.getRecordingById, {
    recordingId: id as Id<"recordings">,
  });

  const recording = preloadedRecording._valueJSON as {
    name?: string;
    description?: string;
    thumbnailUrl?: string;
  } | null;

  const title = recording?.name ?? "Recording";
  const description = recording?.description ?? "Watch this recording";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
      images: recording?.thumbnailUrl
        ? [{ url: recording.thumbnailUrl, width: 1280, height: 720 }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: recording?.thumbnailUrl ? [recording.thumbnailUrl] : [],
    },
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { id } = await params;
  const preloadedRecording = await preloadQuery(api.model.recordings.public.getRecordingById, {
    recordingId: id as Id<"recordings">,
  });

  return (
    <div className="h-screen w-screen bg-black">
      <WatchPageClient preloadedRecording={preloadedRecording} />
    </div>
  );
}
