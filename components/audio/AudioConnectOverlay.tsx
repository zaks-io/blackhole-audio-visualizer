"use client";

import { useSyncExternalStore } from "react";
import { Play, Mic } from "lucide-react";
import { isElectron } from "@/lib/platform";
import { usePresetSelector } from "@/components/playlist";
import type { AudioSourceType } from "@/hooks/useAudioSource";
import { useFPSStore } from "@/hooks/useFPSMonitor";

const subscribe = () => () => {};
const getSnapshot = () => isElectron();
const getServerSnapshot = () => false;

interface AudioConnectOverlayProps {
  isConnected: boolean;
  onConnect: (type: AudioSourceType) => void;
}

export function AudioConnectOverlay({ isConnected, onConnect }: AudioConnectOverlayProps) {
  // useSyncExternalStore handles hydration mismatch by using getServerSnapshot on server
  const isElectronApp = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mode = usePresetSelector((s) => s.mode);
  const triggerPlay = usePresetSelector((s) => s.triggerPlay);
  const resetSpikes = useFPSStore((s) => s.resetSpikes);

  if (isConnected) return null;

  const Icon = isElectronApp ? Play : Mic;
  const sourceType: AudioSourceType = isElectronApp ? "system" : "microphone";

  const handleClick = () => {
    // Starting audio often causes a one-time hitch (permissions + graph warmup).
    // Reset so the overlay doesn't permanently pin the max with that initialization frame.
    resetSpikes();
    onConnect(sourceType);
    if (mode !== "none") {
      triggerPlay();
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
      <button
        onClick={handleClick}
        className="pointer-events-auto cursor-pointer group flex flex-col items-center gap-4 p-8 rounded-full glass-panel border border-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20"
      >
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-white/15">
          <Icon className="w-10 h-10 text-white/80 group-hover:text-white transition-colors" />
        </div>
      </button>
    </div>
  );
}
