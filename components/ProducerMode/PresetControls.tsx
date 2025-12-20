"use client";

import { useState, useRef, useMemo } from "react";
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
  Copy,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { usePresets } from "./usePresets";
import { usePlayPreset } from "./usePlayPreset";
import { useProducerMode } from "./useProducerMode";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useConvexPresets } from "@/hooks/useConvexPresets";
import { PRODUCER_PARAMETERS, DEFAULT_DURATION, DEFAULT_EASE } from "./producerConfig";
import type { PresetParameter } from "./types";

type UnifiedPreset = {
  id: string;
  source: "local" | "convex";
  name: string;
  colorPalette: string;
  parameters: PresetParameter[];
  isPublic: boolean;
  createdAt: number;
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
  const [migrateProgress, setMigrateProgress] = useState({ current: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudPresets: UnifiedPreset[] = useMemo(() => {
    return convexPresets.presets
      .map((p) => ({
        id: p._id,
        source: "convex" as const,
        name: p.name,
        colorPalette: p.colorPalette,
        parameters: p.parameters,
        isPublic: p.isPublic,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [convexPresets.presets]);

  const localPresetsList: UnifiedPreset[] = useMemo(() => {
    return localPresets.presets
      .map((p) => ({
        id: p.id,
        source: "local" as const,
        name: p.name,
        colorPalette: p.colorPalette,
        parameters: p.parameters,
        isPublic: false,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
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

  const handleExport = () => {
    setExportDialogOpen(true);
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

  const handleImport = () => {
    setImportJson("");
    setImportError("");
    setImportDialogOpen(true);
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
        const content = event.target?.result as string;
        setImportJson(content);
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

  const handleSelectPreset = (id: string | null) => {
    setActivePresetId(id);
    if (id) {
      const preset = unifiedPresets.find((p) => p.id === id);
      if (preset) {
        if (preset.source === "local") {
          localPresets.setActivePreset(id);
        }
        playPreset({
          id: preset.id,
          name: preset.name,
          colorPalette: preset.colorPalette,
          parameters: preset.parameters,
          createdAt: preset.createdAt,
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
          onClick={handleUpdatePreset}
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
                playPreset({
                  id: selectedPreset.id,
                  name: selectedPreset.name,
                  colorPalette: selectedPreset.colorPalette,
                  parameters: selectedPreset.parameters,
                  createdAt: selectedPreset.createdAt,
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
            <DropdownMenuItem onClick={handleExport} disabled={unifiedPresets.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImport}>
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

      {/* Create New Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Preset</DialogTitle>
            <DialogDescription>
              Save the current parameter values and tween settings as a new preset.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePreset()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePreset} disabled={!presetName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Preset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!presetName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Presets</DialogTitle>
            <DialogDescription>Copy or download all presets as JSON.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full h-48 p-3 text-xs font-mono bg-black/20 border border-white/10 rounded-md resize-none"
              value={getExportJson()}
              readOnly
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportDialogOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleCopyExport}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button onClick={handleDownloadExport}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Presets</DialogTitle>
            <DialogDescription>Paste JSON or select a file to import presets.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <textarea
              className="w-full h-48 p-3 text-xs font-mono bg-black/20 border border-white/10 rounded-md resize-none"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste JSON here..."
            />
            {importError && <p className="text-xs text-destructive">{importError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportSubmit} disabled={!importJson.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migrate to Cloud Dialog */}
      <Dialog
        open={migrateDialogOpen}
        onOpenChange={(open) => !migrating && setMigrateDialogOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Migrate Local Presets to Cloud</DialogTitle>
            <DialogDescription>
              {localPresetsList.length} local preset{localPresetsList.length !== 1 ? "s" : ""} will
              be uploaded to your cloud account. Local presets will be removed after migration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {localPresetsList.map((preset) => (
                <div
                  key={preset.id}
                  className="text-sm text-muted-foreground px-2 py-1 bg-white/5 rounded"
                >
                  {preset.name}
                </div>
              ))}
            </div>
            {migrating && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Migrating {migrateProgress.current} of {migrateProgress.total}...
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(migrateProgress.current / migrateProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMigrateDialogOpen(false)}
              disabled={migrating}
            >
              Cancel
            </Button>
            <Button onClick={handleMigrateToCloud} disabled={migrating}>
              {migrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Migrate All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
