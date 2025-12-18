"use client";

import { useState, useRef } from "react";
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

export function PresetControls() {
  const {
    presets,
    activePresetId,
    setActivePreset,
    savePreset,
    deletePreset,
    renamePreset,
    exportPresets,
    importPresets,
  } = usePresets();

  const { activePreset, playActive, stopAll, isPlaying } = usePlayPreset();
  const resetVisualization = useVisualizationControls((s) => s.reset);
  const resetAllTweens = useProducerMode((s) => s.resetAllTweens);

  const resetToDefaults = () => {
    stopAll();
    resetVisualization();
    resetAllTweens();
  };

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName("");
      setSaveDialogOpen(false);
    }
  };

  const handleRename = () => {
    if (activePresetId && presetName.trim()) {
      renamePreset(activePresetId, presetName.trim());
      setPresetName("");
      setRenameDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (activePresetId) {
      deletePreset(activePresetId);
    }
  };

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportPresets());
    setExportDialogOpen(false);
  };

  const handleDownloadExport = () => {
    const blob = new Blob([exportPresets()], { type: "application/json" });
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

  const handleImportSubmit = () => {
    const result = importPresets(importJson);
    if (result.success) {
      setImportDialogOpen(false);
      setImportJson("");
      setImportError("");
    } else {
      setImportError("Invalid JSON format");
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

  const openRenameDialog = () => {
    if (activePreset) {
      setPresetName(activePreset.name);
      setRenameDialogOpen(true);
    }
  };

  return (
    <div className="px-3 py-3 border-b border-white/5 space-y-2">
      <div className="flex items-center gap-2">
        <Select value={activePresetId ?? ""} onValueChange={(v) => setActivePreset(v || null)}>
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
          onClick={() => setSaveDialogOpen(true)}
          title="Save current as preset"
        >
          <Save className="h-4 w-4" />
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
            onClick={playActive}
            disabled={!activePreset}
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={openRenameDialog} disabled={!activePreset}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} disabled={!activePreset} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExport} disabled={presets.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImport}>
              <Upload className="h-4 w-4 mr-2" />
              Import JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Save the current parameter values and tween settings as a new preset.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Preset name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!presetName.trim()}>
              Save
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
              value={exportPresets()}
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
    </div>
  );
}
