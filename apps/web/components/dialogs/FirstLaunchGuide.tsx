"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { HelpDialogContent } from "./HelpDialogContent";

const STORAGE_KEY = "blackhole_getting_started";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function hasSeenGuide() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function FirstLaunchGuide() {
  const [dismissed, setDismissed] = useState(false);
  const seen = useSyncExternalStore(subscribeToStorage, hasSeenGuide, () => true);

  const rememberGuide = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <Dialog
      open={!seen && !dismissed}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) rememberGuide();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Getting Started</DialogTitle>
          <DialogDescription className="sr-only">
            Choose how to connect audio to the visualizer.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <HelpDialogContent onFullSetupGuideClick={rememberGuide} />
      </DialogContent>
    </Dialog>
  );
}
