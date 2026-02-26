"use client";

import {
  Copy,
  Check,
  Trash2,
  Video,
  ExternalLink,
  Loader2,
  RotateCcw,
  Download,
  Play,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

interface Recording {
  _id: string;
  name: string;
  fileSize: number;
  duration?: number;
  _creationTime: number;
  downloadCount?: number;
  transcodingStatus: string;
  transcodingError?: string;
  sourceUrl?: string;
}

interface RecordingItemProps {
  recording: Recording;
  copiedId: string | null;
  retryingId: string | null;
  transcodingId: string | null;
  onCopyUrl: (id: string, url: string) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onStartTranscoding: (id: string) => void;
  onRetranscode: (id: string) => void;
  getShareableUrl: (id: string) => string;
  formatFileSize: (bytes: number) => string;
  formatDuration: (seconds: number) => string;
  formatDate: (timestamp: number) => string;
}

export function RecordingItem({
  recording,
  copiedId,
  retryingId,
  transcodingId,
  onCopyUrl,
  onDelete,
  onRetry,
  onStartTranscoding,
  onRetranscode,
  getShareableUrl,
  formatFileSize,
  formatDuration,
  formatDate,
}: RecordingItemProps) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
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
              {recording.duration !== undefined && ` · ${formatDuration(recording.duration)}`}
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
          onClick={() => onDelete(recording._id)}
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
              onClick={() => onCopyUrl(recording._id, getShareableUrl(recording._id))}
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
              <a href={getShareableUrl(recording._id)} target="_blank" rel="noopener noreferrer">
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
            onClick={() => onRetry(recording._id)}
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
            onClick={() => onStartTranscoding(recording._id)}
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
                  onClick={() => onRetranscode(recording._id)}
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
  );
}
