"use client";

import { useMemo } from "react";
import { Music, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConvexPresets } from "@/hooks/useConvexPresets";

interface PresetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (presetId: string) => void;
  excludeIds: string[];
}

export function PresetPicker({ open, onOpenChange, onSelect, excludeIds }: PresetPickerProps) {
  const { presets, publicPresets, isLoading, isAuthenticated } = useConvexPresets();

  const availablePresets = useMemo(() => {
    const excludeSet = new Set(excludeIds);
    const result = [];

    for (const preset of presets) {
      if (!excludeSet.has(preset._id)) {
        result.push({ ...preset, isOwned: true });
      }
    }

    for (const preset of publicPresets) {
      if (!excludeSet.has(preset._id) && !presets.some((p) => p._id === preset._id)) {
        result.push({ ...preset, isOwned: false });
      }
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [presets, publicPresets, excludeIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Preset</DialogTitle>
          <DialogDescription>Select a preset to add to your playlist.</DialogDescription>
        </DialogHeader>

        <div className="py-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availablePresets.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No presets available</p>
              <p className="text-xs mt-1">
                {isAuthenticated
                  ? "Create a preset first or all presets are already added"
                  : "Sign in to create presets"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {availablePresets.map((preset) => (
                <button
                  key={preset._id}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-left"
                  onClick={() => onSelect(preset._id)}
                >
                  <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{preset.name}</span>
                  {preset.isPublic && !preset.isOwned && (
                    <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
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
