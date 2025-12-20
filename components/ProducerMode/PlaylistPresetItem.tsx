"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlaylistPresetItemProps {
  id: string;
  name: string;
  index: number;
  waitDuration?: number;
  defaultWaitDuration: number;
  isCurrentlyPlaying: boolean;
  onRemove: () => void;
  onWaitDurationChange: (duration: number | undefined) => void;
}

export function PlaylistPresetItem({
  id,
  name,
  index,
  waitDuration,
  defaultWaitDuration,
  isCurrentlyPlaying,
  onRemove,
  onWaitDurationChange,
}: PlaylistPresetItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-md bg-white/5 group",
        isDragging && "opacity-50 shadow-lg",
        isCurrentlyPlaying && "ring-1 ring-primary bg-primary/10"
      )}
    >
      <button
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="text-xs text-muted-foreground tabular-nums w-5">{index + 1}.</span>

      {isCurrentlyPlaying && (
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
      )}

      <span className="flex-1 text-xs truncate">{name}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <Input
          type="number"
          min={0}
          step={1}
          value={waitDuration ?? ""}
          placeholder={`${defaultWaitDuration}`}
          onChange={(e) => {
            const val = e.target.value;
            onWaitDurationChange(val === "" ? undefined : Number(val));
          }}
          className="w-12 h-6 text-[10px] text-right px-1"
          title="Wait duration (seconds)"
        />
        <span className="text-[10px] text-muted-foreground">s</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
