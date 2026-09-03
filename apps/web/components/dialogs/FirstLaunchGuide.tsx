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

const COOKIE_NAME = "blackhole_getting_started";
const COOKIE_VALUE = "1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function subscribeToCookie() {
  return () => undefined;
}

function hasSeenGuide() {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim() === `${COOKIE_NAME}=${COOKIE_VALUE}`);
}

export function FirstLaunchGuide() {
  const [dismissed, setDismissed] = useState(false);
  const seen = useSyncExternalStore(subscribeToCookie, hasSeenGuide, () => true);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
      setDismissed(true);
    }
  };

  return (
    <Dialog open={!seen && !dismissed} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Getting Started</DialogTitle>
          <DialogDescription className="sr-only">
            Choose how to connect audio to the visualizer.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <HelpDialogContent />
      </DialogContent>
    </Dialog>
  );
}
