"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ControlSectionProps {
  title: string;
  id: string;
  children: React.ReactNode;
}

const STORAGE_KEY = "control-sections-state";

function getStoredState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredState(id: string, isOpen: boolean) {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredState();
    current[id] = isOpen;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
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

export function ControlSection({ title, id, children }: ControlSectionProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [isOpen, setIsOpen] = useState(() => {
    const stored = getStoredState();
    return id in stored ? stored[id] : false;
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setStoredState(id, open);
  };

  if (!mounted) {
    return (
      <div className="py-2">
        <div className="flex w-full items-center justify-between text-sm font-medium text-foreground">
          <span className="uppercase tracking-wider text-xs">{title}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
        <span className="uppercase tracking-wider text-xs">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
