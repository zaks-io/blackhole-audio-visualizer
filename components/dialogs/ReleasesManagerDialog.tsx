"use client";

import { useState, useRef, type ReactNode } from "react";
import { Upload, Copy, Check, Trash2, Package, X, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useConvexReleases } from "@/hooks/useConvexReleases";
import { cn } from "@/lib/utils";

interface ReleasesManagerDialogProps {
  children: ReactNode;
}

const PLATFORM_ACCEPT = {
  windows: ".exe,.msi",
  macos: ".dmg,.pkg,.zip",
} as const;

export function ReleasesManagerDialog({ children }: ReleasesManagerDialogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [platform, setPlatform] = useState<"windows" | "macos">("macos");
  const [version, setVersion] = useState("");
  const [isLatest, setIsLatest] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { releases, isLoading, uploadRelease, deleteRelease, setLatest } = useConvexReleases();

  const handleCopyUrl = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this release? This cannot be undone.")) {
      await deleteRelease(id);
    }
  };

  const handleSetLatest = async (id: string) => {
    await setLatest(id);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    if (!fileName) {
      setFileName(selectedFile.name);
    }

    // Extract version from filename (e.g., blackhole-audio-visualizer-0.1.0-arm64.dmg -> 0.1.0)
    const versionMatch = selectedFile.name.match(/(\d+\.\d+\.\d+)/);
    if (versionMatch && !version) {
      setVersion(versionMatch[1]);
    }
  };

  const handleUpload = async () => {
    if (!file || !fileName.trim() || !version.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadRelease(
        file,
        fileName.trim(),
        platform,
        version.trim(),
        isLatest,
        setUploadProgress
      );
      setFile(null);
      setFileName("");
      setVersion("");
      setIsLatest(true);
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
    setFileName("");
    setVersion("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDownloadUrl = (platformKey: string, versionOrLatest: string): string => {
    return `/release/${platformKey}/${versionOrLatest}`;
  };

  const windowsReleases = releases.filter((r) => r.platform === "windows");
  const macosReleases = releases.filter((r) => r.platform === "macos");

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Releases</DialogTitle>
        </DialogHeader>
        <Separator />

        {/* Upload Section */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={PLATFORM_ACCEPT[platform]}
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="release-platform" className="text-xs">
                    Platform
                  </Label>
                  <Select
                    value={platform}
                    onValueChange={(v) => setPlatform(v as "windows" | "macos")}
                    disabled={isUploading}
                  >
                    <SelectTrigger id="release-platform" className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="macos">macOS</SelectItem>
                      <SelectItem value="windows">Windows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="release-version" className="text-xs">
                    Version
                  </Label>
                  <Input
                    id="release-version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="h-8 text-sm"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="release-name" className="text-xs">
                  File Name
                </Label>
                <Input
                  id="release-name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="MyApp-1.0.0.dmg"
                  className="h-8 text-sm"
                  disabled={isUploading}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="release-latest"
                  checked={isLatest}
                  onCheckedChange={(checked) => setIsLatest(checked === true)}
                  disabled={isUploading}
                />
                <Label htmlFor="release-latest" className="text-sm cursor-pointer">
                  Mark as latest
                </Label>
              </div>

              {isUploading && <Progress value={uploadProgress} className="h-1" />}

              <Button
                size="sm"
                className="w-full"
                onClick={handleUpload}
                disabled={!fileName.trim() || !version.trim() || isUploading}
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
              <p className="text-sm">Click to upload a release</p>
            </button>
          )}
        </div>

        <Separator />

        {/* Releases List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : releases.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No releases yet.</div>
          ) : (
            <div className="space-y-4 py-2">
              {/* macOS Releases */}
              {macosReleases.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">macOS</h4>
                  {macosReleases.map((release) => (
                    <ReleaseItem
                      key={release._id}
                      release={release}
                      copiedId={copiedId}
                      onCopy={handleCopyUrl}
                      onDelete={handleDelete}
                      onSetLatest={handleSetLatest}
                      getDownloadUrl={getDownloadUrl}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}

              {/* Windows Releases */}
              {windowsReleases.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Windows</h4>
                  {windowsReleases.map((release) => (
                    <ReleaseItem
                      key={release._id}
                      release={release}
                      copiedId={copiedId}
                      onCopy={handleCopyUrl}
                      onDelete={handleDelete}
                      onSetLatest={handleSetLatest}
                      getDownloadUrl={getDownloadUrl}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReleaseItemProps {
  release: {
    _id: string;
    fileName: string;
    platform: "windows" | "macos";
    version: string;
    isLatest: boolean;
    createdAt: number;
    downloadCount: number;
  };
  copiedId: string | null;
  onCopy: (id: string, url: string) => void;
  onDelete: (id: string) => void;
  onSetLatest: (id: string) => void;
  getDownloadUrl: (platform: string, version: string) => string;
  formatDate: (timestamp: number) => string;
}

function ReleaseItem({
  release,
  copiedId,
  onCopy,
  onDelete,
  onSetLatest,
  getDownloadUrl,
  formatDate,
}: ReleaseItemProps) {
  const downloadUrl = getDownloadUrl(release.platform, release.version);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{release.fileName}</p>
              {release.isLatest && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                  <Star className="h-3 w-3" />
                  Latest
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              v{release.version}
              {` · ${formatDate(release.createdAt)}`}
              {` · ${release.downloadCount ?? 0} downloads`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
          onClick={() => onDelete(release._id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex gap-2 pl-6">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => onCopy(release._id, `${window.location.origin}${downloadUrl}`)}
        >
          {copiedId === release._id ? (
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
        {!release.isLatest && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => onSetLatest(release._id)}
          >
            <Star className="h-3 w-3" />
            Set Latest
          </Button>
        )}
      </div>
    </div>
  );
}
