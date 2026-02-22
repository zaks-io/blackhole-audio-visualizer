import { ConvexHttpClient } from "convex/browser";
import { api } from "@blackhole/backend/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string; version: string }> }
) {
  const { platform, version } = await params;

  if (platform !== "windows" && platform !== "macos") {
    return new Response("Invalid platform. Use 'windows' or 'macos'.", { status: 400 });
  }

  const release =
    version === "latest"
      ? await convex.query(api.model.releases.public.getLatestByPlatform, { platform })
      : await convex.query(api.model.releases.public.getReleaseByPlatformVersion, {
          platform,
          version,
        });

  if (!release || !release.url) {
    return new Response("Release not found", { status: 404 });
  }

  // Increment download count
  await convex.mutation(api.model.releases.public.incrementDownloadCount, {
    releaseId: release._id,
  });

  // Fetch the file from Convex storage
  const fileResponse = await fetch(release.url);
  if (!fileResponse.ok) {
    return new Response("Failed to fetch file", { status: 502 });
  }

  // Return with proper filename
  return new Response(fileResponse.body, {
    headers: {
      "Content-Type": fileResponse.headers.get("Content-Type") || "application/octet-stream",
      "Content-Length": fileResponse.headers.get("Content-Length") || "",
      "Content-Disposition": `attachment; filename="${release.fileName}"`,
    },
  });
}
