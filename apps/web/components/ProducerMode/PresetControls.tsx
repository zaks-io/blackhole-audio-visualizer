"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Save,
  Play,
  Square,
  Download,
  Upload,
  MoreHorizontal,
  Trash2,
  Pencil,
  RotateCcw,
  Globe,
  Loader2,
  CloudUpload,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePresets } from "./usePresets";
import { usePlayPreset } from "./usePlayPreset";
import { useProducerMode } from "./useProducerMode";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useConvexPresets } from "@/hooks/useConvexPresets";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import { PRODUCER_PARAMETERS, DEFAULT_DURATION, DEFAULT_EASE } from "./producerConfig";
import {
  PresetNameDialog,
  PresetExportDialog,
  PresetImportDialog,
  PresetMigrateDialog,
  PresetOverwriteDialog,
} from "./PresetSaveDialog";
import type { PresetParameter } from "./types";

type UnifiedPreset = {
  id: string;
  source: "local" | "convex";
  name: string;
  colorPalette: string;
  parameters: PresetParameter[];
  isPublic: boolean;
  updatedAt?: number;
};

function buildParametersFromState(): PresetParameter[] {
  const vizState = useVisualizationControls.getState();
  const producerState = useProducerMode.getState();

  const parameters: PresetParameter[] = [];
  for (const group of PRODUCER_PARAMETERS) {
    for (const param of group.parameters) {
      const value = vizState.getByPath(param.path) as number;
      const tweenState = producerState.tweenStates[param.path];
      parameters.push({
        path: param.path,
        value,
        duration: tweenState?.duration ?? DEFAULT_DURATION,
        ease: tweenState?.ease ?? DEFAULT_EASE,
      });
    }
  }
  return parameters;
}

export function PresetControls() {
  const localPresets = usePresets();
  const convexPresets = useConvexPresets();

  const { playPreset, stopAll, isPlaying } = usePlayPreset();
  const resetVisualization = useVisualizationControls((s) => s.reset);
  const resetAllTweens = useProducerMode((s) => s.resetAllTweens);

  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [migrateProgress, setMigrateProgress] = useState({ current: 0, total: 0 });

  const cloudPresets: UnifiedPreset[] = useMemo(() => {
    return convexPresets.presets
      .map((p) => ({
        id: p._id,
        source: "convex" as const,
        name: p.name,
        colorPalette: p.colorPalette,
        parameters: p.parameters,
        isPublic: p.isPublic,
        updatedAt: p.updatedAt,
      }))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [convexPresets.presets]);

  const localPresetsList: UnifiedPreset[] = useMemo(() => {
    return localPresets.presets.map((p) => ({
      id: p.id,
      source: "local" as const,
      name: p.name,
      colorPalette: p.colorPalette,
      parameters: p.parameters,
      isPublic: false,
    }));
  }, [localPresets.presets]);

  const unifiedPresets: UnifiedPreset[] = useMemo(() => {
    if (convexPresets.isAuthenticated) {
      return cloudPresets;
    }
    return localPresetsList;
  }, [convexPresets.isAuthenticated, cloudPresets, localPresetsList]);

  const selectedPreset = useMemo(() => {
    return unifiedPresets.find((p) => p.id === activePresetId) ?? null;
  }, [unifiedPresets, activePresetId]);

  const resetToDefaults = () => {
    stopAll();
    resetVisualization();
    resetAllTweens();
  };

  const handleCreatePreset = async () => {
    if (!presetName.trim()) return;

    const vizState = useVisualizationControls.getState();
    const parameters = buildParametersFromState();

    if (convexPresets.isAuthenticated) {
      const result = await convexPresets.createPreset(
        presetName.trim(),
        vizState.colorPalette,
        parameters,
        false
      );
      setActivePresetId(result.presetId as string);
    } else {
      const newId = localPresets.savePreset(presetName.trim());
      setActivePresetId(newId);
    }
    toast.success(`Created "${presetName.trim()}"`);
    setPresetName("");
    setSaveDialogOpen(false);
  };

  const handleUpdatePreset = async () => {
    if (!selectedPreset) return;

    const vizState = useVisualizationControls.getState();
    const parameters = buildParametersFromState();

    if (selectedPreset.source === "convex") {
      await convexPresets.updatePreset(selectedPreset.id, {
        colorPalette: vizState.colorPalette,
        parameters,
      });
    } else {
      localPresets.updatePreset(selectedPreset.id);
    }
    toast.success(`Saved "${selectedPreset.name}"`);
  };

  const handleRename = async () => {
    if (!activePresetId || !presetName.trim() || !selectedPreset) return;

    if (selectedPreset.source === "convex") {
      await convexPresets.updatePreset(activePresetId, { name: presetName.trim() });
    } else {
      localPresets.renamePreset(activePresetId, presetName.trim());
    }
    setPresetName("");
    setRenameDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!activePresetId || !selectedPreset) return;

    if (selectedPreset.source === "convex") {
      await convexPresets.deletePreset(activePresetId);
    } else {
      localPresets.deletePreset(activePresetId);
    }
    setActivePresetId(null);
  };

  const handleTogglePublic = async () => {
    if (!activePresetId || !selectedPreset || selectedPreset.source !== "convex") return;
    await convexPresets.updatePreset(activePresetId, { isPublic: !selectedPreset.isPublic });
  };

  const getExportJson = () => {
    if (convexPresets.isAuthenticated) {
      return JSON.stringify(convexPresets.presets, null, 2);
    }
    return localPresets.exportPresets();
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(getExportJson());
    setExportDialogOpen(false);
  };

  const handleDownloadExport = () => {
    const blob = new Blob([getExportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "producer-presets.json";
    a.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  const handleImportSubmit = async () => {
    if (convexPresets.isAuthenticated) {
      try {
        const imported = JSON.parse(importJson);
        const presets = Array.isArray(imported) ? imported : [imported];
        for (const preset of presets) {
          if (preset.name && preset.colorPalette && Array.isArray(preset.parameters)) {
            await convexPresets.createPreset(
              preset.name,
              preset.colorPalette,
              preset.parameters,
              false
            );
          }
        }
        setImportDialogOpen(false);
        setImportJson("");
        setImportError("");
      } catch {
        setImportError("Invalid JSON format");
      }
    } else {
      const result = localPresets.importPresets(importJson);
      if (result.success) {
        setImportDialogOpen(false);
        setImportJson("");
        setImportError("");
      } else {
        setImportError("Invalid JSON format");
      }
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportJson(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleMigrateToCloud = async () => {
    if (localPresetsList.length === 0) return;

    setMigrating(true);
    setMigrateProgress({ current: 0, total: localPresetsList.length });

    for (let i = 0; i < localPresetsList.length; i++) {
      const preset = localPresetsList[i];
      await convexPresets.createPreset(preset.name, preset.colorPalette, preset.parameters, false);
      setMigrateProgress({ current: i + 1, total: localPresetsList.length });
    }

    localPresets.clearPresets();
    setMigrating(false);
    setMigrateDialogOpen(false);
  };

  const openRenameDialog = () => {
    if (selectedPreset) {
      setPresetName(selectedPreset.name);
      setRenameDialogOpen(true);
    }
  };

  const triggerStop = usePresetSelector((s) => s.triggerStop);

  const handleSelectPreset = (id: string | null) => {
    setActivePresetId(id);
    if (id) {
      const preset = unifiedPresets.find((p) => p.id === id);
      if (preset) {
        if (preset.source === "local") {
          localPresets.setActivePreset(id);
        }
        triggerStop();
        playPreset({
          id: preset.id,
          name: preset.name,
          colorPalette: preset.colorPalette,
          parameters: preset.parameters,
        });
      }
    } else {
      localPresets.setActivePreset(null);
    }
  };

  const isLoading = convexPresets.isLoading;

  return (
    <div className="px-3 py-3 border-b border-white/5 space-y-2">
      <div className="flex items-center gap-2">
        <Select value={activePresetId ?? ""} onValueChange={(v) => handleSelectPreset(v || null)}>
          <SelectTrigger size="sm" className="flex-1 h-8 text-xs">
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <SelectValue placeholder="Select preset..." />
            )}
          </SelectTrigger>
          <SelectContent>
            {unifiedPresets.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No presets saved</div>
            ) : (
              unifiedPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {preset.name}
                    {preset.isPublic && <Globe className="h-3 w-3 text-muted-foreground" />}
                  </span>
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
        >
          <Save className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setSaveDialogOpen(true)}
          title="Create new preset"
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
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              if (selectedPreset) {
                triggerStop();
                playPreset({
                  id: selectedPreset.id,
                  name: selectedPreset.name,
                  colorPalette: selectedPreset.colorPalette,
                  parameters: selectedPreset.parameters,
                });
              }
            }}
            disabled={!selectedPreset}
            title="Play preset"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={openRenameDialog} disabled={!selectedPreset}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {selectedPreset?.source === "convex" && (
              <DropdownMenuItem onClick={handleTogglePublic}>
                <Globe className="h-4 w-4 mr-2" />
                {selectedPreset.isPublic ? "Make Private" : "Make Public"}
              </DropdownMenuItem>
            )}
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
              disabled={unifiedPresets.length === 0}
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
            {convexPresets.isAuthenticated && localPresetsList.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMigrateDialogOpen(true)}>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Migrate to Cloud ({localPresetsList.length})
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PresetNameDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="Create New Preset"
        description="Save the current parameter values and tween settings as a new preset."
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
        getJson={getExportJson}
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

      <PresetMigrateDialog
        open={migrateDialogOpen}
        onOpenChange={setMigrateDialogOpen}
        localPresets={localPresetsList}
        migrating={migrating}
        progress={migrateProgress}
        onMigrate={handleMigrateToCloud}
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
