"use client";

import { useRef, useEffect, memo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Film, Loader2, Check, X } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";

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

function getStatusIcon(status: MessagePartStatus) {
  switch (status) {
    case "running":
    case "streaming":
    case "pending":
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case "done":
      return <Check className="w-3 h-3 text-green-400" />;
    case "failed":
      return <X className="w-3 h-3 text-red-400" />;
    default:
      return null;
  }
}

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

  useEffect(() => {
    // On first render, if already done, this is historical - don't redirect
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (status === "done") {
        return;
      }
    }

    // If we reach here and status is done, it just completed (live)
    if (status === "done" && sceneId && !hasNavigated.current) {
      const isOnScenePage = pathname === `/app/scene/${sceneId}`;
      if (!isOnScenePage) {
        hasNavigated.current = true;
        router.push(`/app/scene/${sceneId}`);
      }
    }
  }, [status, sceneId, pathname, router]);

  const actionText = isCreate ? "Scene created" : "Scene updated";

  return (
    <div
      className={cn(className, "px-2 py-1.5 min-h-10 min-w-0 bg-background/30 rounded-lg border")}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
            status === "running" || status === "pending"
              ? "bg-violet-600/50 animate-pulse"
              : "bg-violet-600/50"
          )}
        >
          <Film className="w-4 h-4 text-violet-200" />
        </div>
        <div className="text-sm text-zinc-400 truncate flex items-center gap-1.5 flex-1">
          <span>{actionText}</span>
          {sceneId ? (
            <Link
              href={`/app/scene/${sceneId}`}
              className="text-violet-400 hover:text-violet-300 hover:underline truncate"
            >
              {sceneName || sceneId}
            </Link>
          ) : (
            sceneName && <span className="text-zinc-300 truncate">{sceneName}</span>
          )}
        </div>
        <div className="flex-shrink-0">{getStatusIcon(status)}</div>
      </div>
    </div>
  );
});
