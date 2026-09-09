"use client";

import { create } from "zustand";
import type { AudioSourceType } from "./useAudioSource";

interface AudioConnectionState {
  liveConnected: boolean;
  liveSourceType: AudioSourceType | null;

  // Permission dialogs
  showPermissionDialog: boolean;
  showMicPermissionDialog: boolean;

  setLiveConnected: (connected: boolean, sourceType?: AudioSourceType | null) => void;
  setShowPermissionDialog: (show: boolean) => void;
  setShowMicPermissionDialog: (show: boolean) => void;
}

export const useAudioConnectionState = create<AudioConnectionState>((set) => ({
  liveConnected: false,
  liveSourceType: null,
  showPermissionDialog: false,
  showMicPermissionDialog: false,

  setLiveConnected: (connected, sourceType = null) =>
    set({ liveConnected: connected, liveSourceType: connected ? sourceType : null }),
  setShowPermissionDialog: (show) => set({ showPermissionDialog: show }),
  setShowMicPermissionDialog: (show) => set({ showMicPermissionDialog: show }),
}));
