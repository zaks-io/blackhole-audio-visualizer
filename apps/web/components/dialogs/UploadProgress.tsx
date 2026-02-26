"use client";

import { useRef } from "react";
import { Upload, X, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  file: File | null;
  name: string;
  duration: number | undefined;
  isUploading: boolean;
  uploadProgress: number;
  onNameChange: (name: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClear: () => void;
  formatFileSize: (bytes: number) => string;
  formatDuration: (seconds: number) => string;
}

export function UploadProgress({
  file,
  name,
  duration,
  isUploading,
  uploadProgress,
  onNameChange,
  onFileChange,
  onUpload,
  onClear,
  formatFileSize,
  formatDuration,
}: UploadProgressProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={onFileChange}
        className="hidden"
      />

      {file ? (
        <div className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Video className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                  {duration !== undefined && ` · ${formatDuration(duration)}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onClear}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recording-name" className="text-xs">
              Name
            </Label>
            <Input
              id="recording-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Recording name"
              className="h-8 text-sm"
              disabled={isUploading}
            />
          </div>

          {isUploading && <Progress value={uploadProgress} className="h-1" />}

          <Button
            size="sm"
            className="w-full"
            onClick={onUpload}
            disabled={!name.trim() || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1.5" />
                Upload
              </>
            )}
          </Button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            "hover:border-primary/50 hover:bg-muted/50 text-muted-foreground"
          )}
        >
          <Upload className="h-5 w-5 mx-auto mb-1" />
          <p className="text-sm">Click to upload a video</p>
        </button>
      )}
    </div>
  );
}
