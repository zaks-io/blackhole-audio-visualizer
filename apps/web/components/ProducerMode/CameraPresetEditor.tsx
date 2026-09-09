"use client";

import { Clock, Video, Plus, Trash2 } from "lucide-react";
import type { CameraPresetItem } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CAMERA_MODES = [
  { id: "circle", label: "Circle" },
  { id: "closeup", label: "Close Up" },
  { id: "orbit", label: "Orbit" },
  { id: "edge", label: "Edge" },
] as const;

interface CameraPresetEditorProps {
  cameraPresets: CameraPresetItem[] | undefined;
  defaultCameraDuration: number | undefined;
  onAdd: (mode: string) => void;
  onUpdate: (index: number, duration: number | undefined) => void;
  onRemove: (index: number) => void;
  onUpdateDefaultDuration: (duration: number) => void;
}

export function CameraPresetEditor({
  cameraPresets,
  defaultCameraDuration,
  onAdd,
  onUpdate,
  onRemove,
  onUpdateDefaultDuration,
}: CameraPresetEditorProps) {
  const normalized = cameraPresets ?? [];

  return (
    <div className="px-3 py-2 border-t border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Camera Modes</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Add camera mode">
              <Plus className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {CAMERA_MODES.map((mode) => (
              <DropdownMenuItem
                key={mode.id}
                onClick={() => onAdd(mode.id)}
                className="cursor-pointer"
              >
                {mode.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Duration (sec)</span>
        </div>
        <Input
          type="number"
          min={1}
          step={1}
          value={defaultCameraDuration ?? 20}
          onChange={(e) => onUpdateDefaultDuration(Number(e.target.value))}
          className="w-16 h-7 text-xs text-right"
        />
      </div>

      {normalized.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-2">No camera modes added</p>
      ) : (
        <div className="space-y-1">
          {normalized.map((preset, index) => {
            const modeInfo = CAMERA_MODES.find((m) => m.id === preset.mode);
            return (
              <div
                key={`${preset.mode}-${index}`}
                className="flex items-center justify-between py-1 px-2 rounded bg-white/5 gap-2"
              >
                <span className="text-xs flex-1">{modeInfo?.label ?? preset.mode}</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={preset.duration ?? ""}
                  placeholder={String(defaultCameraDuration ?? 20)}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdate(index, val === "" ? undefined : Number(val));
                  }}
                  className="w-14 h-6 text-xs text-right"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-50 hover:opacity-100 shrink-0"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
