"use client";

import { FileEdit, Clock } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import { ToolResultBase } from "./ToolResultBase";

interface UpdateSavedCompositionToolResultProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

type UpdateCompositionOutput = {
  action?: string;
  error?: string;
  compositionPlan?: {
    sections: { section_name: string; duration_ms: number }[];
  };
  totalDurationMs?: number;
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function UpdateSavedCompositionToolResult({
  className,
  output,
  status,
}: UpdateSavedCompositionToolResultProps) {
  const data = output as UpdateCompositionOutput | undefined;
  const isActive = status === "running" || status === "pending";

  const sectionCount = data?.compositionPlan?.sections?.length;
  const totalDuration = data?.totalDurationMs;

  const infoBadge = sectionCount && totalDuration && (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
      <Clock className="w-3 h-3" />
      {sectionCount} sections • {formatDuration(totalDuration)}
    </span>
  );

  return (
    <ToolResultBase
      className={className}
      icon={<FileEdit className="w-4 h-4" />}
      variant="music"
      title={isActive ? "Updating Composition..." : "Composition Updated"}
      headerExtra={!isActive && infoBadge}
      status={status}
    />
  );
}
