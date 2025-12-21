"use client";

import { create } from "zustand";
import type { AudioSourceType } from "./useAudioSource";

interface AudioConnectionState {
  // Live mode connection state
  liveConnected: boolean;
  liveSourceType: AudioSourceType | null;

  // Scene mode connection state
  sceneConnected: boolean;

  // Permission dialogs
  showPermissionDialog: boolean;
  showMicPermissionDialog: boolean;

  // Actions
  setLiveConnected: (connected: boolean, sourceType?: AudioSourceType | null) => void;
  setSceneConnected: (connected: boolean) => void;
  setShowPermissionDialog: (show: boolean) => void;
  setShowMicPermissionDialog: (show: boolean) => void;
}

export const useAudioConnectionState = create<AudioConnectionState>((set) => ({
  liveConnected: false,
  liveSourceType: null,
  sceneConnected: false,
  showPermissionDialog: false,
  showMicPermissionDialog: false,

  setLiveConnected: (connected, sourceType = null) =>
    set({ liveConnected: connected, liveSourceType: connected ? sourceType : null }),
  setSceneConnected: (connected) => set({ sceneConnected: connected }),
  setShowPermissionDialog: (show) => set({ showPermissionDialog: show }),
  setShowMicPermissionDialog: (show) => set({ showMicPermissionDialog: show }),
}));
