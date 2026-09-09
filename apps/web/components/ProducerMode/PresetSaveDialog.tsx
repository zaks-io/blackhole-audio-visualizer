"use client";

import { useRef } from "react";
import { Save, Download, Upload, Copy } from "lucide-react";
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
