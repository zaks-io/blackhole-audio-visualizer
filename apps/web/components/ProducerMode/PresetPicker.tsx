"use client";

import { useMemo } from "react";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePresets } from "./usePresets";

interface PresetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (presetId: string) => void;
  excludeIds: string[];
}

export function PresetPicker({ open, onOpenChange, onSelect, excludeIds }: PresetPickerProps) {
  const presets = usePresets((state) => state.presets);

  const availablePresets = useMemo(() => {
    const excludeSet = new Set(excludeIds);
    return presets.filter((preset) => !excludeSet.has(preset.id));
  }, [presets, excludeIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Preset</DialogTitle>
          <DialogDescription>Select a preset to add to your playlist.</DialogDescription>
        </DialogHeader>

        <div className="py-2 max-h-64 overflow-y-auto">
          {availablePresets.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No presets available</p>
              <p className="text-xs mt-1">Create a preset first or remove one from this playlist</p>
            </div>
          ) : (
            <div className="space-y-1">
              {availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-left"
                  onClick={() => onSelect(preset.id)}
                >
                  <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
