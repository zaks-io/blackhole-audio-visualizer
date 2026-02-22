"use client";

import { FileText, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import { ToolResultBase } from "./ToolResultBase";

interface ReadCompositionToolResultProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

type CompositionSection = {
  section_name: string;
  duration_ms: number;
  positive_local_styles?: string[];
  negative_local_styles?: string[];
  lines?: string[];
};

type ReadCompositionOutput = {
  action?: string;
  error?: string;
  songStatus?: string;
  compositionPlan?: {
    positive_global_styles: string[];
    negative_global_styles: string[];
    sections: CompositionSection[];
  };
  totalDurationMs?: number;
};

const sectionColors = [
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-violet-500",
  "bg-indigo-500",
  "bg-purple-400",
  "bg-fuchsia-400",
];

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function ReadCompositionToolResult({
  className,
  output,
  status,
}: ReadCompositionToolResultProps) {
  const data = output as ReadCompositionOutput | undefined;
  const isActive = status === "running" || status === "pending";

  if (!data?.compositionPlan) {
    return (
      <ToolResultBase
        className={className}
        icon={<FileText className="w-4 h-4" />}
        variant="music"
        title="Loading Composition..."
        status={status}
      />
    );
  }

  const { compositionPlan, songStatus, totalDurationMs } = data;
  const sectionCount = compositionPlan.sections.length;

  const infoBadge = (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
      <Clock className="w-3 h-3" />
      {sectionCount} sections • {formatDuration(totalDurationMs || 0)}
    </span>
  );

  const statusBadge = songStatus && (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-medium rounded-full",
        songStatus === "completed"
          ? "bg-cyan-500/20 text-cyan-300"
          : songStatus === "generating"
            ? "bg-purple-500/20 text-purple-300"
            : "bg-zinc-700/50 text-zinc-400"
      )}
    >
      {songStatus}
    </span>
  );

  return (
    <ToolResultBase
      className={className}
      icon={<FileText className="w-4 h-4" />}
      variant="music"
      title={isActive ? "Loading Composition..." : "Composition Loaded"}
      headerExtra={!isActive && infoBadge}
      status={status}
      expandable
      defaultExpanded={false}
    >
      <div className="space-y-3">
        {statusBadge && <div>{statusBadge}</div>}

        <div className="space-y-1.5">
          {compositionPlan.sections.map((section, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  sectionColors[i % sectionColors.length]
                )}
              />
              <span className="flex-1 text-sm text-zinc-200 truncate">{section.section_name}</span>
              <span className="text-xs text-zinc-500 tabular-nums font-medium">
                {formatDuration(section.duration_ms)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ToolResultBase>
  );
}
