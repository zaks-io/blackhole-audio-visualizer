"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ParameterGroupProps } from "./types";

function getStoredState(storageKey: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredState(storageKey: string, isOpen: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(isOpen));
  } catch {
    // Ignore storage errors
  }
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ParameterGroup({
  name,
  id,
  storageKey,
  defaultCollapsed = true,
  forceOpen = false,
  children,
}: ParameterGroupProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [isOpen, setIsOpen] = useState(() => {
    const stored = getStoredState(storageKey);
    return stored !== null ? stored : !defaultCollapsed;
  });

  const handleOpenChange = (open: boolean) => {
    if (!forceOpen) {
      setIsOpen(open);
      setStoredState(storageKey, open);
    }
  };

  const effectiveOpen = forceOpen || isOpen;

  if (!mounted) {
    return (
      <div className="py-2.5 px-2" data-group-id={id}>
        <div className="flex w-full items-center gap-2">
          <div className="w-0.5 h-3 rounded-full bg-muted-foreground/20" />
          <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-foreground/70">
            {name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={effectiveOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger
        data-group-id={id}
        className={cn(
          "group flex w-full items-center gap-2 py-2.5 px-2 -mx-2 rounded-md",
          "transition-all duration-200 ease-out",
          "hover:bg-white/[0.03]",
          effectiveOpen && "bg-white/[0.02]"
        )}
      >
        {/* Accent line indicator */}
        <div
          className={cn(
            "w-0.5 h-3 rounded-full transition-all duration-200",
            effectiveOpen ? "bg-primary/60" : "bg-muted-foreground/20 group-hover:bg-primary/40"
          )}
        />

        {/* Chevron with rotation */}
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0",
            "transition-all duration-200 ease-out",
            effectiveOpen
              ? "rotate-90 text-primary/70"
              : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
          )}
        />

        {/* Group name */}
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.15em] flex-1 text-left",
            "transition-colors duration-200",
            effectiveOpen ? "text-foreground" : "text-foreground/70 group-hover:text-foreground/90"
          )}
        >
          {name}
        </span>

        {/* Subtle count badge could go here */}
      </CollapsibleTrigger>

      <CollapsibleContent
        className={cn(
          "overflow-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:slide-in-from-top-1 data-[state=closed]:slide-out-to-top-1"
        )}
      >
        <div
          className={cn("pt-1 pb-3 pl-5 pr-1 space-y-3", "border-l border-white/[0.04] ml-[3px]")}
        >
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
