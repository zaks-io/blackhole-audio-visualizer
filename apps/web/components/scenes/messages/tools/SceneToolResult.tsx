"use client";

import { useRef, useEffect, memo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Film, ExternalLink } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import { useViewerMode } from "@/hooks/useViewerMode";
import { ToolResultBase } from "./ToolResultBase";

interface SceneToolResultProps {
  className?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

type SceneOutput = {
  sceneId?: string;
  name?: string;
  action?: string;
  success?: boolean;
};

export const SceneToolResult = memo(function SceneToolResult({
  className,
  toolName,
  output,
  status,
}: SceneToolResultProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const hasNavigated = useRef(false);

  const sceneOutput = output as SceneOutput | undefined;
  const sceneId = sceneOutput?.sceneId;
  const sceneName = sceneOutput?.name;
  const isCreate = toolName === "createScene";
  const isActive = status === "running" || status === "pending";

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (status === "done") return;
    }

    if (status === "done" && sceneId && !hasNavigated.current) {
      const isOnScenePage = pathname === `/app/scene/${sceneId}`;
      if (!isOnScenePage) {
        hasNavigated.current = true;
        useViewerMode.getState().setNavigating(sceneId);
        router.push(`/app/scene/${sceneId}`);
      }
    }
  }, [status, sceneId, pathname, router]);

  const isOnScenePage = pathname === `/app/scene/${sceneId}`;

  const sceneLink = sceneId && status === "done" && !isOnScenePage && (
    <Link
      href={`/app/scene/${sceneId}`}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-medium transition-colors"
    >
      Open
      <ExternalLink className="w-3 h-3" />
    </Link>
  );

  return (
    <ToolResultBase
      className={className}
      icon={<Film className="w-4 h-4" />}
      variant="scene"
      title={
        isActive
          ? isCreate
            ? "Creating scene..."
            : "Updating scene..."
          : isCreate
            ? "Scene Created"
            : "Scene Updated"
      }
      subtitle={sceneName}
      status={status}
      actions={sceneLink}
    />
  );
});
