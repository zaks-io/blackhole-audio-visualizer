"use client";

import { useSyncExternalStore } from "react";
import { Play, Mic } from "lucide-react";
import { isElectron } from "@/lib/platform";
import type { AudioSourceType } from "@/hooks/useAudioSource";

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

  if (isConnected) return null;

  const Icon = isElectronApp ? Play : Mic;
  const sourceType: AudioSourceType = isElectronApp ? "system" : "microphone";

  const handleClick = () => {
    onConnect(sourceType);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
      <button
        onClick={handleClick}
        className="pointer-events-auto group flex flex-col items-center gap-4 p-8 rounded-3xl glass-panel border border-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20"
      >
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-white/15">
          <Icon className="w-10 h-10 text-white/80 group-hover:text-white transition-colors" />
        </div>
        <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">
          Click to start
        </span>
      </button>
    </div>
  );
}
