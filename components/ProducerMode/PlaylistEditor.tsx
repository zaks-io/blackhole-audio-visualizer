"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Plus,
  Globe,
  Pencil,
  Check,
  X,
  Loader2,
  Music,
  Shuffle,
  Clock,
  Play,
  Pause,
  Square,
  SkipForward,
  Video,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConvexPlaylists, usePlaylistWithPresets } from "@/hooks/useConvexPlaylists";
import { usePlaylistPlayer } from "@/hooks/usePlaylistPlayer";
import { PlaylistPresetItem } from "./PlaylistPresetItem";
import { PresetPicker } from "./PresetPicker";

interface PlaylistEditorProps {
  playlistId: string;
  onBack: () => void;
}

const CAMERA_MODES = [
  { id: "circle", label: "Circle" },
  { id: "closeup", label: "Close Up" },
  { id: "orbit", label: "Orbit" },
  { id: "edge", label: "Edge" },
] as const;

interface CameraPresetItem {
  mode: string;
  duration?: number;
}

// Normalize camera presets to handle both old string format and new object format
function normalizeCameraPresets(
  presets: (CameraPresetItem | string)[] | undefined
): CameraPresetItem[] {
  if (!presets) return [];
  return presets.map((p) => (typeof p === "string" ? { mode: p } : p));
}

export function PlaylistEditor({ playlistId, onBack }: PlaylistEditorProps) {
  const {
    updatePlaylist,
    updatePlaylistItem,
    removePreset,
    reorderPresets,
    addPreset,
    addCameraPreset,
    updateCameraPreset,
    removeCameraPreset,
  } = useConvexPlaylists();
  const { playlist, isLoading } = usePlaylistWithPresets(playlistId);
  const {
    state: playerState,
    play,
    pause,
    resume,
    stop,
    skip,
    currentPreset,
  } = usePlaylistPlayer(playlist ?? null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (isLoading || !playlist) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = playlist.items ?? [];
  const presetIds = items.map((item) => item.presetId);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = presetIds.indexOf(active.id as string);
    const newIndex = presetIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(presetIds, oldIndex, newIndex);
      await reorderPresets(playlistId, newOrder);
    }
  };

  const handleSaveName = async () => {
    if (editedName.trim() && editedName !== playlist.name) {
      await updatePlaylist(playlistId, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleTogglePublic = async () => {
    await updatePlaylist(playlistId, { isPublic: !playlist.isPublic });
  };

  const handleToggleShuffle = async () => {
    await updatePlaylist(playlistId, { shuffle: !playlist.shuffle });
  };

  const handleUpdateDefaultWait = async (duration: number) => {
    if (duration >= 0) {
      await updatePlaylist(playlistId, { defaultWaitDuration: duration });
    }
  };

  const handleRemovePreset = async (presetId: string) => {
    await removePreset(playlistId, presetId);
  };

  const handleAddPreset = async (presetId: string) => {
    await addPreset(playlistId, presetId);
    setPickerOpen(false);
  };

  const handleWaitDurationChange = async (presetId: string, duration: number | undefined) => {
    await updatePlaylistItem(playlistId, presetId, duration);
  };

  const handleUpdateDefaultCameraDuration = async (duration: number) => {
    if (duration >= 0) {
      await updatePlaylist(playlistId, { defaultCameraDuration: duration });
    }
  };

  const handleAddCameraPreset = async (cameraMode: string) => {
    await addCameraPreset(playlistId, cameraMode);
  };

  const handleUpdateCameraPreset = async (index: number, duration: number | undefined) => {
    await updateCameraPreset(playlistId, index, duration);
  };

  const handleRemoveCameraPreset = async (index: number) => {
    await removeCameraPreset(playlistId, index);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {isEditingName ? (
            <div className="flex-1 flex items-center gap-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleSaveName}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setIsEditingName(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{playlist.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  setEditedName(playlist.name);
                  setIsEditingName(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Public</span>
          </div>
          <Switch checked={playlist.isPublic} onCheckedChange={handleTogglePublic} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Shuffle</span>
          </div>
          <Switch checked={playlist.shuffle} onCheckedChange={handleToggleShuffle} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Wait (sec)</span>
          </div>
          <Input
            type="number"
            min={0}
            step={1}
            value={playlist.defaultWaitDuration}
            onChange={(e) => handleUpdateDefaultWait(Number(e.target.value))}
            className="w-16 h-7 text-xs text-right"
          />
        </div>
      </div>

      {/* Add Preset Button */}
      <div className="px-3 py-2 border-b border-white/5">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Preset
        </Button>
      </div>

      {/* Preset List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {playlist.items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No presets in this playlist</p>
            <p className="text-xs mt-1">Add presets to build your sequence</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={presetIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {playlist.items.map((item, index) => {
                  const preset = playlist.presets.find((p) => p._id === item.presetId);
                  if (!preset) return null;
                  return (
                    <PlaylistPresetItem
                      key={item.presetId}
                      id={item.presetId}
                      name={preset.name}
                      index={index}
                      waitDuration={item.waitDuration}
                      defaultWaitDuration={playlist.defaultWaitDuration}
                      isCurrentlyPlaying={playerState.currentIndex === index}
                      onRemove={() => handleRemovePreset(item.presetId)}
                      onWaitDurationChange={(duration) =>
                        handleWaitDurationChange(item.presetId, duration)
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Camera Presets Section */}
      <div className="px-3 py-2 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Camera Modes</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CAMERA_MODES.map((mode) => (
                <DropdownMenuItem
                  key={mode.id}
                  onClick={() => handleAddCameraPreset(mode.id)}
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
            value={playlist.defaultCameraDuration ?? 20}
            onChange={(e) => handleUpdateDefaultCameraDuration(Number(e.target.value))}
            className="w-16 h-7 text-xs text-right"
          />
        </div>

        {normalizeCameraPresets(playlist.cameraPresets as (CameraPresetItem | string)[] | undefined)
          .length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-2">
            No camera modes added
          </p>
        ) : (
          <div className="space-y-1">
            {normalizeCameraPresets(
              playlist.cameraPresets as (CameraPresetItem | string)[] | undefined
            ).map((preset, index) => {
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
                    placeholder={String(playlist.defaultCameraDuration ?? 20)}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateCameraPreset(index, val === "" ? undefined : Number(val));
                    }}
                    className="w-14 h-6 text-xs text-right"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-50 hover:opacity-100 shrink-0"
                    onClick={() => handleRemoveCameraPreset(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5 shrink-0">
        <div className="flex items-center justify-center gap-2">
          {playerState.isPlaying && !playerState.isPaused ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={pause}>
                <Pause className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skip}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stop}>
                <Square className="h-4 w-4" />
              </Button>
            </>
          ) : playerState.isPaused ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resume}>
                <Play className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stop}>
                <Square className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={play}
              disabled={playlist.items.length === 0}
              className="h-8"
            >
              <Play className="h-4 w-4 mr-2" />
              Play Playlist
            </Button>
          )}
        </div>

        {playerState.isPlaying && currentPreset && (
          <div className="mt-2 text-center">
            <p className="text-[10px] text-muted-foreground">
              {playerState.status === "tweening" ? "Playing" : "Waiting"}: {currentPreset.name}
            </p>
            {playerState.status === "waiting" && (
              <Progress value={playerState.waitProgress * 100} className="h-1 mt-1" />
            )}
          </div>
        )}
      </div>

      {/* Preset Picker Dialog */}
      <PresetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleAddPreset}
        excludeIds={presetIds}
      />
    </div>
  );
}
