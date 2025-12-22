"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";

export type ToolVariant = "default" | "music" | "scene" | "generate" | "error";

export interface ToolResultBaseProps {
  className?: string;
  icon: React.ReactNode;
  variant?: ToolVariant;
  title: string;
  subtitle?: React.ReactNode;
  status: MessagePartStatus;
  expandable?: boolean;
  defaultExpanded?: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

const containerStyles: Record<ToolVariant, string> = {
  default: "bg-zinc-900/60 border-zinc-700/50",
  music: "bg-purple-950/30 border-purple-500/30",
  scene: "bg-violet-950/30 border-violet-500/30",
  generate: "bg-cyan-950/20 border-cyan-500/30",
  error: "bg-red-950/30 border-red-500/40",
};

const glowStyles: Record<ToolVariant, string> = {
  default: "",
  music: "shadow-[0_0_30px_-5px_rgba(168,85,247,0.2)]",
  scene: "shadow-[0_0_30px_-5px_rgba(139,92,246,0.2)]",
  generate: "shadow-[0_0_30px_-5px_rgba(0,212,255,0.25)]",
  error: "shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]",
};

const iconContainerStyles: Record<ToolVariant, string> = {
  default: "bg-zinc-800 text-zinc-400",
  music:
    "bg-gradient-to-br from-purple-500/40 to-purple-600/30 text-purple-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
  scene:
    "bg-gradient-to-br from-violet-500/40 to-violet-600/30 text-violet-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
  generate:
    "bg-gradient-to-br from-cyan-500/40 to-cyan-600/30 text-cyan-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
  error: "bg-gradient-to-br from-red-500/40 to-red-600/30 text-red-300",
};

const titleColors: Record<ToolVariant, string> = {
  default: "text-zinc-200",
  music: "text-purple-100",
  scene: "text-violet-100",
  generate: "text-cyan-100",
  error: "text-red-200",
};

function StatusIndicator({ status, variant }: { status: MessagePartStatus; variant: ToolVariant }) {
  const isActive = status === "running" || status === "streaming" || status === "pending";

  if (isActive) {
    return (
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-600 border-t-cyan-400 animate-spin" />
      </div>
    );
  }

  if (status === "done") {
    const checkColor = variant === "error" ? "text-red-400" : "text-cyan-400";
    return <Check className={cn("w-4 h-4", checkColor)} strokeWidth={3} />;
  }

  if (status === "failed") {
    return <X className="w-4 h-4 text-red-400" strokeWidth={3} />;
  }

  return null;
}

export function ToolResultBase({
  className,
  icon,
  variant = "default",
  title,
  subtitle,
  status,
  expandable = false,
  defaultExpanded = true,
  children,
  actions,
  headerExtra,
}: ToolResultBaseProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const isActive = status === "running" || status === "streaming" || status === "pending";
  const isDone = status === "done";

  const containerClasses = cn(
    "relative rounded-xl border overflow-hidden transition-all duration-300",
    containerStyles[variant],
    isDone && variant !== "default" && variant !== "error" && glowStyles[variant],
    isActive && "animate-pulse-subtle",
    className
  );

  const header = (
    <div className="flex items-center gap-3 p-3">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300",
          iconContainerStyles[variant],
          isActive && "scale-110"
        )}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-semibold", titleColors[variant])}>{title}</span>
          {headerExtra}
        </div>
        {subtitle && <div className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</div>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <StatusIndicator status={status} variant={variant} />
        {expandable && children && (
          <ChevronDown
            className={cn(
              "w-4 h-4 text-zinc-500 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        )}
      </div>
    </div>
  );

  if (!expandable || !children) {
    return <div className={containerClasses}>{header}</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={containerClasses}>
      <CollapsibleTrigger className="w-full text-left cursor-pointer focus:outline-none">
        {header}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 pt-0">
          <div className="border-t border-white/5 pt-3">{children}</div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
