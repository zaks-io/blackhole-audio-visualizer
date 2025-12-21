"use client";

import { cn } from "@/lib/utils";
import { Music2, Clock, Loader2, Check } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import type { CompositionPlan } from "@/hooks/useConvexScenes";

interface CompositionPlanToolResultProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function CompositionPlanToolResult({
  className,
  input,
  status,
}: CompositionPlanToolResultProps) {
  const plan = input as CompositionPlan | undefined;
  const isRunning = status === "running" || status === "pending";

  if (!plan || !plan.sections) {
    return (
      <div
        className={cn(className, "px-2 py-1.5 min-h-10 min-w-0 bg-background/30 rounded-lg border")}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-600/50 flex items-center justify-center flex-shrink-0">
            <Music2 className="w-4 h-4 text-purple-300" />
          </div>
          <span className="text-sm text-zinc-500">Updating composition...</span>
          {isRunning && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
        </div>
      </div>
    );
  }

  const totalDuration = plan.sections.reduce((acc, s) => acc + s.duration_ms, 0);

  return (
    <div
      className={cn(className, "px-3 py-2 min-w-0 bg-background/30 rounded-lg border space-y-2")}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-600/50 flex items-center justify-center flex-shrink-0">
          <Music2 className="w-4 h-4 text-purple-300" />
        </div>
        <span className="text-sm text-zinc-300 font-medium">Composition Plan</span>
        <div className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
          <Clock className="w-3 h-3" />
          {formatDuration(totalDuration)}
        </div>
        {isRunning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3 text-green-400" />
        )}
      </div>

      {plan.positive_global_styles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {plan.positive_global_styles.slice(0, 3).map((style, i) => (
            <span key={i} className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">
              {style}
            </span>
          ))}
          {plan.positive_global_styles.length > 3 && (
            <span className="text-xs text-zinc-500">+{plan.positive_global_styles.length - 3}</span>
          )}
        </div>
      )}

      <div className="space-y-1">
        {plan.sections.map((section, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-zinc-500 w-4">{i + 1}.</span>
            <span className="flex-1 truncate">{section.section_name}</span>
            <span className="text-zinc-600">{formatDuration(section.duration_ms)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
