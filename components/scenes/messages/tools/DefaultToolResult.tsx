"use client";

import { cn } from "@/lib/utils";
import { Wrench, Loader2, Check, X } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";

interface DefaultToolResultProps {
  className?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^mcp_/i, "")
    .replace(/[_-]/g, " ")
    .trim();
}

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

export function DefaultToolResult({ className, toolName, status, input }: DefaultToolResultProps) {
  const displayName = toolName ? formatToolName(toolName) : "Tool";

  const textQuery =
    input && typeof input === "object" && "query" in input && typeof input.query === "string"
      ? input.query
      : undefined;

  return (
    <div
      className={cn(className, "px-2 py-1.5 min-h-10 min-w-0 bg-background/30 rounded-lg border")}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
            status === "running" || status === "pending"
              ? "bg-zinc-600 animate-pulse"
              : "bg-zinc-600"
          )}
        >
          <Wrench className="w-4 h-4 text-zinc-300" />
        </div>
        <div className="text-sm text-zinc-500 truncate flex items-center gap-2 flex-1">
          <span className="capitalize">{displayName}</span>
          {textQuery && <span className="text-zinc-400 truncate">{textQuery}</span>}
        </div>
        <div className="flex-shrink-0">{getStatusIcon(status)}</div>
      </div>
    </div>
  );
}
