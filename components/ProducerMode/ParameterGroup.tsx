"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TweenSlider } from "./TweenSlider";
import type { ParameterGroup as ParameterGroupType } from "./types";

interface ParameterGroupProps {
  group: ParameterGroupType;
  defaultOpen?: boolean;
}

export function ParameterGroup({ group, defaultOpen = true }: ParameterGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-foreground/90 hover:text-foreground transition-colors"
      >
        {group.name}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[500px] opacity-100 pb-4" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-5 px-1">
          {group.parameters.map((param) => (
            <TweenSlider key={param.path} config={param} />
          ))}
        </div>
      </div>
    </div>
  );
}
