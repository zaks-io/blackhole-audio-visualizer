"use client";

import type { ReactNode } from "react";
import { Download, Apple, Monitor } from "lucide-react";
import { track } from "@vercel/analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface DownloadDialogProps {
  children: ReactNode;
}

export function DownloadDialog({ children }: DownloadDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Download</DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="flex flex-col gap-3 py-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/release/macos/latest"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            onClick={() => track("download_macos")}
          >
            <Apple className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">macOS</p>
              <p className="text-xs text-muted-foreground">Apple Silicon</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/release/windows/latest"
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            onClick={() => track("download_windows")}
          >
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Windows</p>
              <p className="text-xs text-muted-foreground">Windows 10+</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
