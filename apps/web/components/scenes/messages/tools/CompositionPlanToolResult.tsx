"use client";

import { Music2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import type { CompositionPlan } from "@/hooks/useConvexScenes";
import { ToolResultBase } from "./ToolResultBase";

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

function SectionTimeline({
  sections,
  totalDuration,
}: {
  sections: CompositionPlan["sections"];
  totalDuration: number;
}) {
  return (
    <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden flex">
      {sections.map((section, i) => {
        const width = (section.duration_ms / totalDuration) * 100;
        return (
          <div
            key={i}
            className={cn(
              "h-full transition-all duration-300",
              sectionColors[i % sectionColors.length]
            )}
            style={{ width: `${width}%` }}
            title={`${section.section_name} (${formatDuration(section.duration_ms)})`}
          />
        );
      })}
    </div>
  );
}

interface CompositionPlanToolResultProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

export function CompositionPlanToolResult({
  className,
  input,
  status,
}: CompositionPlanToolResultProps) {
  const plan = input as CompositionPlan | undefined;
  const isActive = status === "running" || status === "pending";

  if (!plan || !plan.sections) {
    return (
      <ToolResultBase
        className={className}
        icon={<Music2 className="w-4 h-4" />}
        variant="music"
        title="Creating Composition..."
        status={status}
      />
    );
  }

  const totalDuration = plan.sections.reduce((acc, s) => acc + s.duration_ms, 0);
  const sectionCount = plan.sections.length;

  const infoBadge = (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
      <Clock className="w-3 h-3" />
      {sectionCount} sections • {formatDuration(totalDuration)}
    </span>
  );

  return (
    <ToolResultBase
      className={className}
      icon={<Music2 className="w-4 h-4" />}
      variant="music"
      title={isActive ? "Creating Composition..." : "Composition Created"}
      headerExtra={!isActive && infoBadge}
      status={status}
      expandable
      defaultExpanded={false}
    >
      <div className="space-y-4">
        <SectionTimeline sections={plan.sections} totalDuration={totalDuration} />

        {(plan.positive_global_styles?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.positive_global_styles.map((style, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-200 rounded-md border border-purple-500/30"
              >
                {style}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          {plan.sections.map((section, i) => (
            <div key={i} className="rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
              <div className="flex items-center gap-3 p-2">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    sectionColors[i % sectionColors.length]
                  )}
                />
                <span className="flex-1 text-sm text-zinc-200 truncate">
                  {section.section_name}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums font-medium">
                  {formatDuration(section.duration_ms)}
                </span>
              </div>
              {section.lines && section.lines.length > 0 && (
                <div className="px-2 pb-2 pl-7 space-y-0.5">
                  {section.lines.map((line, j) => (
                    <p key={j} className="text-xs text-zinc-400 italic leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ToolResultBase>
  );
}
