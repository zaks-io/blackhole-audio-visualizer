"use client";

import { useRef } from "react";
import { Save, Download, Upload, Copy, CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PresetNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
}

export function PresetNameDialog({
  open,
  onOpenChange,
  title,
  description,
  value,
  onChange,
  onConfirm,
  confirmLabel,
  disabled,
}: PresetNameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Preset name"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={disabled ?? !value.trim()}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getJson: () => string;
  onCopy: () => void;
  onDownload: () => void;
}

export function PresetExportDialog({
  open,
  onOpenChange,
  getJson,
  onCopy,
  onDownload,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Presets</DialogTitle>
          <DialogDescription>Copy or download all presets as JSON.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <textarea
            className="w-full h-48 p-3 text-xs font-mono bg-black/20 border border-white/10 rounded-md resize-none"
            value={getJson()}
            readOnly
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  error: string;
  onSubmit: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PresetImportDialog({
  open,
  onOpenChange,
  value,
  onChange,
  error,
  onSubmit,
  onFileChange,
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Presets</DialogTitle>
          <DialogDescription>Paste JSON or select a file to import presets.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <textarea
            className="w-full h-48 p-3 text-xs font-mono bg-black/20 border border-white/10 rounded-md resize-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste JSON here..."
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onFileChange}
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!value.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MigrateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localPresets: { id: string; name: string }[];
  migrating: boolean;
  progress: { current: number; total: number };
  onMigrate: () => void;
}

export function PresetMigrateDialog({
  open,
  onOpenChange,
  localPresets,
  migrating,
  progress,
  onMigrate,
}: MigrateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !migrating && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Migrate Local Presets to Cloud</DialogTitle>
          <DialogDescription>
            {localPresets.length} local preset{localPresets.length !== 1 ? "s" : ""} will be
            uploaded to your cloud account. Local presets will be removed after migration.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {localPresets.map((preset) => (
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
                Migrating {progress.current} of {progress.total}...
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={migrating}>
            Cancel
          </Button>
          <Button onClick={onMigrate} disabled={migrating}>
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
  );
}

interface OverwriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetName: string | undefined;
  onConfirm: () => void;
}

export function PresetOverwriteDialog({
  open,
  onOpenChange,
  presetName,
  onConfirm,
}: OverwriteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Overwrite Preset</DialogTitle>
          <DialogDescription>
            This will overwrite &ldquo;{presetName}&rdquo;. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <Save className="h-4 w-4 mr-2" />
            Overwrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
