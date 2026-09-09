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
  Pencil,
  Check,
  X,
  Music,
  Shuffle,
  Clock,
  Play,
  Pause,
  Square,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { usePlaylists, usePlaylistWithPresets } from "@/hooks/usePlaylists";
import { usePlaylistPlayer } from "@/hooks/usePlaylistPlayer";
import { PlaylistPresetItem } from "./PlaylistPresetItem";
import { PresetPicker } from "./PresetPicker";
import { CameraPresetEditor } from "./CameraPresetEditor";

interface PlaylistEditorProps {
  playlistId: string;
  onBack: () => void;
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
  } = usePlaylists();
  const { playlist } = usePlaylistWithPresets(playlistId);
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

  if (!playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">This playlist is unavailable.</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to Playlists
        </Button>
      </div>
    );
  }

  const items = playlist.items ?? [];
  const presetIds = items.map((item) => item.presetId);
  const hasMissingPresets = playlist.presets.some((preset) => preset === null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = presetIds.indexOf(active.id as string);
    const newIndex = presetIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(presetIds, oldIndex, newIndex);
      reorderPresets(playlistId, newOrder);
    }
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== playlist.name) {
      updatePlaylist(playlistId, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onBack}
            aria-label="Back to playlists"
          >
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
                aria-label="Save playlist name"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setIsEditingName(false)}
                aria-label="Cancel playlist rename"
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
                aria-label="Rename playlist"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Shuffle</span>
          </div>
          <Switch
            checked={playlist.shuffle}
            onCheckedChange={() => updatePlaylist(playlistId, { shuffle: !playlist.shuffle })}
          />
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
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 0) updatePlaylist(playlistId, { defaultWaitDuration: val });
            }}
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
                  const preset = playlist.presets[index];
                  return (
                    <PlaylistPresetItem
                      key={item.presetId}
                      id={item.presetId}
                      name={preset?.name ?? "Unavailable preset"}
                      index={index}
                      waitDuration={item.waitDuration}
                      defaultWaitDuration={playlist.defaultWaitDuration}
                      isCurrentlyPlaying={playerState.currentIndex === index}
                      onRemove={() => removePreset(playlistId, item.presetId)}
                      onWaitDurationChange={(duration) =>
                        updatePlaylistItem(playlistId, item.presetId, duration)
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {hasMissingPresets && (
          <p className="mt-3 text-xs text-destructive">
            Remove unavailable presets before playing this playlist.
          </p>
        )}
      </div>

      <CameraPresetEditor
        cameraPresets={playlist.cameraPresets}
        defaultCameraDuration={playlist.defaultCameraDuration}
        onAdd={(mode) => addCameraPreset(playlistId, mode)}
        onUpdate={(index, duration) => updateCameraPreset(playlistId, index, duration)}
        onRemove={(index) => removeCameraPreset(playlistId, index)}
        onUpdateDefaultDuration={(duration) => {
          if (duration >= 0) updatePlaylist(playlistId, { defaultCameraDuration: duration });
        }}
      />

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5 shrink-0">
        <div className="flex items-center justify-center gap-2">
          {playerState.isPlaying && !playerState.isPaused ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={pause}
                aria-label="Pause playlist"
              >
                <Pause className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={skip}
                aria-label="Skip preset"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={stop}
                aria-label="Stop playlist"
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          ) : playerState.isPaused ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resume}
                aria-label="Resume playlist"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={stop}
                aria-label="Stop playlist"
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={play}
              disabled={playlist.items.length === 0 || hasMissingPresets}
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

      <PresetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(presetId) => {
          addPreset(playlistId, presetId);
          setPickerOpen(false);
        }}
        excludeIds={presetIds}
      />
    </div>
  );
}
