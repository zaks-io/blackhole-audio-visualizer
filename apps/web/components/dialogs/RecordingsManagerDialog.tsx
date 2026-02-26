"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useConvexRecordings } from "@/hooks/useConvexRecordings";
import { RecordingItem } from "./RecordingItem";
import { UploadProgress } from "./UploadProgress";

interface RecordingsManagerDialogProps {
  children: ReactNode;
}

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const recording = recordings.find((r) => r._id === confirmDeleteId);
    setIsDeleting(true);
    try {
      await deleteRecording(confirmDeleteId);
      toast.success(`Deleted "${recording?.name ?? "recording"}"`);
    } catch (error) {
      toast.error("Failed to delete recording");
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
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
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Recordings</DialogTitle>
        </DialogHeader>
        <Separator />

        <UploadProgress
          file={file}
          name={name}
          duration={duration}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onNameChange={setName}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
          onClear={clearFile}
          formatFileSize={formatFileSize}
          formatDuration={formatDuration}
        />

        <Separator />

        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : recordings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No recordings yet.</div>
          ) : (
            <div className="space-y-3 py-2">
              {recordings.map((recording) => (
                <RecordingItem
                  key={recording._id}
                  recording={recording}
                  copiedId={copiedId}
                  retryingId={retryingId}
                  transcodingId={transcodingId}
                  onCopyUrl={handleCopyUrl}
                  onDelete={setConfirmDeleteId}
                  onRetry={handleRetry}
                  onStartTranscoding={handleStartTranscoding}
                  onRetranscode={setConfirmRetranscodeId}
                  getShareableUrl={getShareableUrl}
                  formatFileSize={formatFileSize}
                  formatDuration={formatDuration}
                  formatDate={formatDate}
                />
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

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && !isDeleting && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the recording and all associated files. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
