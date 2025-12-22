"use client";

import { Wrench } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import { ToolResultBase } from "./ToolResultBase";

interface DefaultToolResultProps {
  className?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

function formatToolName(name: string): string {
  return name
    .replace(/^mcp_/i, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

function extractQuery(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  if (typeof obj.query === "string") return obj.query;
  if (typeof obj.name === "string") return obj.name;
  if (typeof obj.prompt === "string") return obj.prompt;
  return undefined;
}

export function DefaultToolResult({ className, toolName, status, input }: DefaultToolResultProps) {
  const displayName = toolName ? formatToolName(toolName) : "Processing";
  const query = extractQuery(input);
  const isActive = status === "running" || status === "pending";

  return (
    <ToolResultBase
      className={className}
      icon={<Wrench className="w-4 h-4" />}
      variant="default"
      title={isActive ? `${displayName}...` : displayName}
      subtitle={query}
      status={status}
    />
  );
}
