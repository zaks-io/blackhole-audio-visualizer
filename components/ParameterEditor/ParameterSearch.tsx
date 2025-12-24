"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ParameterSearchProps } from "./types";

export function ParameterSearch({
  value,
  onChange,
  placeholder = "Search parameters...",
}: ParameterSearchProps) {
  const hasValue = Boolean(value);

  return (
    <div className="relative group">
      {/* Subtle ambient glow when focused or has value */}
      <div
        className={cn(
          "absolute inset-0 -z-10 rounded-md opacity-0 transition-opacity duration-300",
          "bg-primary/5 blur-md",
          hasValue && "opacity-100"
        )}
      />

      <Search
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none",
          "transition-all duration-200",
          hasValue
            ? "text-primary/80"
            : "text-muted-foreground/50 group-focus-within:text-primary/60"
        )}
      />

      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-8 pl-8 pr-7 text-xs",
          "bg-white/[0.03] border-white/[0.06]",
          "placeholder:text-muted-foreground/40",
          "transition-all duration-200 ease-out",
          "hover:bg-white/[0.05] hover:border-white/[0.1]",
          "focus:bg-white/[0.06] focus:border-primary/30",
          "focus:shadow-[0_0_0_1px_oklch(0.78_0.15_195_/_0.1),_inset_0_1px_0_oklch(1_0_0_/_0.03)]",
          "focus-visible:ring-0 focus-visible:ring-offset-0"
        )}
      />

      {/* Clear button with smooth reveal */}
      <button
        type="button"
        onClick={() => onChange("")}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2",
          "p-0.5 rounded-sm",
          "text-muted-foreground/40 hover:text-foreground/80",
          "hover:bg-white/10 active:bg-white/15",
          "transition-all duration-150 ease-out",
          "opacity-0 scale-90 pointer-events-none",
          hasValue && "opacity-100 scale-100 pointer-events-auto"
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
