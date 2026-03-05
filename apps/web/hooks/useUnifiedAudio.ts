"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAudioSource, type AudioSourceType } from "./useAudioSource";
import { useAudioElementAnalyzer } from "./useAudioElementAnalyzer";
import { useAudioConnectionState } from "./useAudioConnectionState";
import { useViewerMode } from "./useViewerMode";
import type { AnalyzedAudio } from "./useAudioAnalyzer";

export interface UnifiedAudioConfig {
  sceneAudioElement: HTMLAudioElement | null;
}

export interface UnifiedAudioReturn {
  // Unified interface
  getAnalysis: (bandCount?: number) => AnalyzedAudio;
  isConnected: boolean;
  getRecordingStream: () => MediaStream | null;

  // Live mode specific (only relevant when mode === 'live')
  connectLive: (sourceType?: AudioSourceType) => Promise<void>;
  disconnectLive: () => void;
  liveSourceType: AudioSourceType | null;
  canUseSystemAudio: boolean;
  setOnsetDecay: (value: number) => void;

  // Permission dialogs (live mode only)
  showPermissionDialog: boolean;
  closePermissionDialog: () => void;
  openScreenRecordingSettings: () => void;
  showMicPermissionDialog: boolean;
  closeMicPermissionDialog: () => void;

  // Analysis ref for debug panels
  analysisRef: React.MutableRefObject<AnalyzedAudio | null>;
}

export function useUnifiedAudio(config: UnifiedAudioConfig): UnifiedAudioReturn {
  const { sceneAudioElement } = config;
  const mode = useViewerMode((s) => s.mode);
  const previousModeRef = useRef(mode);

  // Use Zustand for reactive connection state
  const liveConnected = useAudioConnectionState((s) => s.liveConnected);
  const sceneConnected = useAudioConnectionState((s) => s.sceneConnected);

  // Live audio source
  const liveAudio = useAudioSource();

  // Scene audio analyzer
  const sceneAudio = useAudioElementAnalyzer(mode === "scene" ? sceneAudioElement : null);

  // Handle mode transitions - clean handoff
  useEffect(() => {
    if (previousModeRef.current !== mode) {
      // Switching modes - disconnect previous source
      if (previousModeRef.current === "live" && liveConnected) {
        liveAudio.disconnect();
      }
      previousModeRef.current = mode;
    }
  }, [mode, liveAudio, liveConnected]);

  // Unified getAnalysis that returns data from the active source
  const getAnalysis = useCallback(
    (bandCount?: number): AnalyzedAudio => {
      if (mode === "scene") {
        return sceneAudio.getAnalysis();
      }
      return liveAudio.getAnalysis(bandCount);
    },
    [mode, sceneAudio, liveAudio]
  );

  // Unified isConnected - use reactive Zustand state
  const isConnected = mode === "scene" ? sceneConnected : liveConnected;

  // Unified recording stream
  const getRecordingStream = useCallback((): MediaStream | null => {
    if (mode === "scene") {
      return sceneAudio.getRecordingStream();
    }
    return liveAudio.getStream();
  }, [mode, sceneAudio, liveAudio]);

  return {
    // Unified
    getAnalysis,
    isConnected,
    getRecordingStream,

    // Live mode specific
    connectLive: liveAudio.connect,
    disconnectLive: liveAudio.disconnect,
    liveSourceType: liveAudio.sourceType,
    canUseSystemAudio: liveAudio.canUseSystemAudio,
    setOnsetDecay: liveAudio.setOnsetDecay,

    // Permission dialogs
    showPermissionDialog: liveAudio.showPermissionDialog,
    closePermissionDialog: liveAudio.closePermissionDialog,
    openScreenRecordingSettings: liveAudio.openScreenRecordingSettings,
    showMicPermissionDialog: liveAudio.showMicPermissionDialog,
    closeMicPermissionDialog: liveAudio.closeMicPermissionDialog,

    // Analysis ref
    analysisRef: mode === "scene" ? sceneAudio.analysisRef : liveAudio.analysisRef,
  };
}
