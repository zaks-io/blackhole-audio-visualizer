"use client";

import { useState, useRef, type ReactNode } from "react";
import {
  Upload,
  Copy,
  Check,
  Trash2,
  Video,
  ExternalLink,
  X,
  Loader2,
  RotateCcw,
  Download,
  Play,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useConvexRecordings } from "@/hooks/useConvexRecordings";
import { cn } from "@/lib/utils";

interface RecordingsManagerDialogProps {
  children: ReactNode;
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    uploaded: { label: "Uploaded", className: "bg-zinc-500/20 text-zinc-400" },
    pending: { label: "Pending", className: "bg-yellow-500/20 text-yellow-500" },
    processing: { label: "Processing", className: "bg-blue-500/20 text-blue-500" },
    completed: { label: "Ready", className: "bg-green-500/20 text-green-500" },
    failed: { label: "Failed", className: "bg-red-500/20 text-red-500" },
  };

  const config = statusConfig[status] ?? statusConfig.uploaded;

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs", config.className)}>{config.label}</span>
  );
}

export function RecordingsManagerDialog({ children }: RecordingsManagerDialogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [transcodingId, setTranscodingId] = useState<string | null>(null);
  const [confirmRetranscodeId, setConfirmRetranscodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    recordings,
    isLoading,
    uploadRecording,
    startTranscoding,
    deleteRecording,
    retryTranscoding,
  } = useConvexRecordings();

  const handleCopyUrl = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this recording? This cannot be undone.")) {
      await deleteRecording(id);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryTranscoding(id);
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setRetryingId(null);
    }
  };

  const handleConfirmRetranscode = async () => {
    if (confirmRetranscodeId) {
      await handleRetry(confirmRetranscodeId);
      setConfirmRetranscodeId(null);
    }
  };

  const handleStartTranscoding = async (id: string) => {
    setTranscodingId(id);
    try {
      await startTranscoding(id);
    } catch (error) {
      console.error("Start transcoding failed:", error);
    } finally {
      setTranscodingId(null);
    }
  };

  const extractVideoDuration = (videoFile: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(isFinite(video.duration) ? video.duration : undefined);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(undefined);
      };
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
    const videoDuration = await extractVideoDuration(selectedFile);
    setDuration(videoDuration);
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadRecording(file, name.trim(), undefined, duration, setUploadProgress);
      setFile(null);
      setName("");
      setDuration(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setName("");
    setDuration(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getShareableUrl = (recordingId: string): string => {
    return `${window.location.origin}/watch/${recordingId}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Recordings</DialogTitle>
        </DialogHeader>
        <Separator />

        {/* Upload Section */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
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
                  onClick={clearFile}
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Recording name"
                  className="h-8 text-sm"
                  disabled={isUploading}
                />
              </div>

              {isUploading && <Progress value={uploadProgress} className="h-1" />}

              <Button
                size="sm"
                className="w-full"
                onClick={handleUpload}
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

        <Separator />

        {/* Recordings List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : recordings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No recordings yet.</div>
          ) : (
            <div className="space-y-3 py-2">
              {recordings.map((recording) => (
                <div key={recording._id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{recording.name}</p>
                          <StatusBadge status={recording.transcodingStatus} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(recording.fileSize)}
                          {recording.duration !== undefined &&
                            ` · ${formatDuration(recording.duration)}`}
                          {` · ${formatDate(recording._creationTime)}`}
                          {` · ${recording.downloadCount ?? 0} views`}
                        </p>
                        {recording.transcodingStatus === "failed" && recording.transcodingError && (
                          <p className="text-xs text-red-500 mt-1">{recording.transcodingError}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleDelete(recording._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex gap-2 pl-6">
                    {recording.transcodingStatus === "completed" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() =>
                            handleCopyUrl(recording._id, getShareableUrl(recording._id))
                          }
                        >
                          {copiedId === recording._id ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
                          <a
                            href={getShareableUrl(recording._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </Button>
                      </>
                    )}
                    {recording.transcodingStatus === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => handleRetry(recording._id)}
                        disabled={retryingId === recording._id}
                      >
                        {retryingId === recording._id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </>
                        )}
                      </Button>
                    )}
                    {recording.transcodingStatus === "uploaded" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => handleStartTranscoding(recording._id)}
                        disabled={transcodingId === recording._id}
                      >
                        {transcodingId === recording._id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Start Transcoding
                          </>
                        )}
                      </Button>
                    )}
                    {(recording.transcodingStatus === "pending" ||
                      recording.transcodingStatus === "processing") && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {recording.transcodingStatus === "pending" ? "Waiting..." : "Processing..."}
                      </span>
                    )}
                    {(recording.sourceUrl || recording.transcodingStatus === "completed") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {recording.sourceUrl && (
                            <DropdownMenuItem asChild>
                              <a href={recording.sourceUrl} download>
                                <Download className="h-4 w-4" />
                                Download Original
                              </a>
                            </DropdownMenuItem>
                          )}
                          {recording.transcodingStatus === "completed" && (
                            <DropdownMenuItem
                              onClick={() => setConfirmRetranscodeId(recording._id)}
                              disabled={retryingId === recording._id}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {retryingId === recording._id ? "Retranscoding..." : "Retranscode"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog
        open={!!confirmRetranscodeId}
        onOpenChange={(open) => !open && setConfirmRetranscodeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retranscode Recording</AlertDialogTitle>
            <AlertDialogDescription>
              This will regenerate the video and thumbnail. The process may take a few minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRetranscode}>Retranscode</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
