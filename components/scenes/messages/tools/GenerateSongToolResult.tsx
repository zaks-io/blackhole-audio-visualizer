"use client";

import { cn } from "@/lib/utils";
import { Sparkles, Check } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";

interface GenerateSongToolResultProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

export function GenerateSongToolResult({ className, input, status }: GenerateSongToolResultProps) {
  const data = input as { songTitle?: string; compositionPlan?: unknown } | undefined;
  const songTitle = data?.songTitle || "Untitled";
  const isDone = status === "done";

  return (
    <div
      className={cn(
        className,
        "px-3 py-2 min-w-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-lg border border-primary/30"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/50 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-zinc-200">{songTitle}</div>
          <div className="text-xs text-zinc-500">
            {isDone ? "Ready to generate" : "Preparing..."}
          </div>
        </div>
        {isDone && <Check className="w-4 h-4 text-green-400" />}
      </div>
    </div>
  );
}
