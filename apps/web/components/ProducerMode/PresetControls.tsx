"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import {
  PresetExportDialog,
  PresetImportDialog,
  PresetNameDialog,
  PresetOverwriteDialog,
} from "./PresetSaveDialog";
import { usePlayPreset } from "./usePlayPreset";
import { usePresets } from "./usePresets";
import { useProducerMode } from "./useProducerMode";

export function PresetControls() {
  const camera = useCameraMode();
  const {
    presets,
    activePresetId,
    setActivePreset,
    savePreset,
    updatePreset,
    deletePreset,
    renamePreset,
    exportPresets,
    importPresets,
  } = usePresets();
  const { playPreset, stopAll, isPlaying } = usePlayPreset();
  const resetVisualization = useVisualizationControls((state) => state.reset);
  const resetAllTweens = useProducerMode((state) => state.resetAllTweens);
  const triggerStop = usePresetSelector((state) => state.triggerStop);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");

  const selectedPreset = presets.find((preset) => preset.id === activePresetId) ?? null;

  const resetToDefaults = () => {
    stopAll();
    resetVisualization();
    resetAllTweens();
  };

  const handleCreatePreset = () => {
    const name = presetName.trim();
    if (!name) return;

    savePreset(name);
    toast.success(`Created "${name}"`);
    setPresetName("");
    setSaveDialogOpen(false);
  };

  const handleUpdatePreset = () => {
    if (!selectedPreset) return;
    updatePreset(selectedPreset.id);
    toast.success(`Saved "${selectedPreset.name}"`);
  };

  const handleRename = () => {
    const name = presetName.trim();
    if (!activePresetId || !name) return;

    renamePreset(activePresetId, name);
    setPresetName("");
    setRenameDialogOpen(false);
  };

  const handleDelete = () => {
    if (!activePresetId) return;
    deletePreset(activePresetId);
  };

  const handleCopyExport = () => {
    void navigator.clipboard.writeText(exportPresets());
    setExportDialogOpen(false);
  };

  const handleDownloadExport = () => {
    const url = URL.createObjectURL(new Blob([exportPresets()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "producer-presets.json";
    link.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  const handleImportSubmit = () => {
    const result = importPresets(importJson);
    if (!result.success) {
      setImportError("Invalid preset JSON");
      return;
    }

    toast.success(`Imported ${result.count} preset${result.count === 1 ? "" : "s"}`);
    setImportDialogOpen(false);
    setImportJson("");
    setImportError("");
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => setImportJson(String(loadEvent.target?.result ?? ""));
    reader.readAsText(file);
  };

  const handleSelectPreset = (id: string | null) => {
    setActivePreset(id);
    if (!id) return;

    const preset = presets.find((candidate) => candidate.id === id);
    if (!preset) return;

    triggerStop();
    if (preset.cameraMode) camera.setMode(preset.cameraMode as CameraMode);
    playPreset(preset);
  };

  const openRenameDialog = () => {
    if (!selectedPreset) return;
    setPresetName(selectedPreset.name);
    setRenameDialogOpen(true);
  };

  return (
    <div className="px-3 py-3 border-b border-white/5 space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={activePresetId ?? ""}
          onValueChange={(value) => handleSelectPreset(value || null)}
        >
          <SelectTrigger size="sm" className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Select preset..." />
          </SelectTrigger>
          <SelectContent>
            {presets.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No presets saved</div>
            ) : (
              presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  {preset.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setOverwriteDialogOpen(true)}
          disabled={!selectedPreset}
          title="Save changes to preset"
          aria-label="Save changes to preset"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setSaveDialogOpen(true)}
          title="Create new preset"
          aria-label="Create new preset"
        >
          <Plus className="h-4 w-4" />
        </Button>

        {isPlaying() ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={stopAll}
            title="Stop all tweens"
            aria-label="Stop preset"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => selectedPreset && handleSelectPreset(selectedPreset.id)}
            disabled={!selectedPreset}
            title="Play preset"
            aria-label="Play preset"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Preset actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={openRenameDialog} disabled={!selectedPreset}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={!selectedPreset}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setExportDialogOpen(true)}
              disabled={presets.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setImportJson("");
                setImportError("");
                setImportDialogOpen(true);
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PresetNameDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Create New Preset"
        description="Save the current parameters, camera, and tween settings as a new preset."
        value={presetName}
        onChange={setPresetName}
        onConfirm={handleCreatePreset}
        confirmLabel="Create"
      />
      <PresetNameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        title="Rename Preset"
        value={presetName}
        onChange={setPresetName}
        onConfirm={handleRename}
        confirmLabel="Rename"
      />
      <PresetExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        getJson={exportPresets}
        onCopy={handleCopyExport}
        onDownload={handleDownloadExport}
      />
      <PresetImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        value={importJson}
        onChange={setImportJson}
        error={importError}
        onSubmit={handleImportSubmit}
        onFileChange={handleFileImport}
      />
      <PresetOverwriteDialog
        open={overwriteDialogOpen}
        onOpenChange={setOverwriteDialogOpen}
        presetName={selectedPreset?.name}
        onConfirm={() => {
          handleUpdatePreset();
          setOverwriteDialogOpen(false);
        }}
      />
    </div>
  );
}
