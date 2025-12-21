"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useAudioAnalyzer, type AnalyzedAudio } from "./useAudioAnalyzer";
import { useAudioConnectionState } from "./useAudioConnectionState";
import {
  isElectron,
  getSystemAudioStream,
  getScreenPermissionStatus,
  requestScreenPermission,
} from "@/lib/platform";

export type AudioSourceType = "microphone" | "system";

export interface UseAudioSourceReturn {
  connect: (sourceType?: AudioSourceType) => Promise<void>;
  disconnect: () => void;
  getAnalysis: (bandCount?: number) => AnalyzedAudio;
  isConnected: boolean;
  sourceType: AudioSourceType | null;
  setOnsetDecay: (value: number) => void;
  getStream: () => MediaStream | null;
  canUseSystemAudio: boolean;
  showPermissionDialog: boolean;
  closePermissionDialog: () => void;
  openScreenRecordingSettings: () => void;
  showMicPermissionDialog: boolean;
  closeMicPermissionDialog: () => void;
  analysisRef: React.MutableRefObject<AnalyzedAudio | null>;
}

const emptySubscribe = () => () => {};

export function useAudioSource(): UseAudioSourceReturn {
  const analyzer = useAudioAnalyzer();

  // Use Zustand for reactive connection state
  const isConnected = useAudioConnectionState((s) => s.liveConnected);
  const sourceType = useAudioConnectionState((s) => s.liveSourceType);
  const showPermissionDialog = useAudioConnectionState((s) => s.showPermissionDialog);
  const showMicPermissionDialog = useAudioConnectionState((s) => s.showMicPermissionDialog);
  const setLiveConnected = useAudioConnectionState((s) => s.setLiveConnected);
  const setShowPermissionDialog = useAudioConnectionState((s) => s.setShowPermissionDialog);
  const setShowMicPermissionDialog = useAudioConnectionState((s) => s.setShowMicPermissionDialog);

  const canUseSystemAudio = useSyncExternalStore(emptySubscribe, isElectron, () => false);

  const openScreenRecordingSettings = useCallback(() => {
    if (window.electronAPI?.openScreenRecordingPreferences) {
      window.electronAPI.openScreenRecordingPreferences();
    }
    setShowPermissionDialog(false);
  }, [setShowPermissionDialog]);

  const closePermissionDialog = useCallback(() => {
    setShowPermissionDialog(false);
  }, [setShowPermissionDialog]);

  const closeMicPermissionDialog = useCallback(() => {
    setShowMicPermissionDialog(false);
  }, [setShowMicPermissionDialog]);

  const connect = useCallback(
    async (type: AudioSourceType = "microphone") => {
      if (analyzer.isConnected()) {
        analyzer.disconnect();
        setLiveConnected(false);
      }

      if (type === "system") {
        if (!canUseSystemAudio) {
          console.warn("System audio capture is only available in Electron");
          return;
        }

        // Check permission first
        const permissionStatus = await getScreenPermissionStatus();
        if (permissionStatus !== "granted") {
          // Try to trigger permission prompt
          await requestScreenPermission();

          // Check again
          const newStatus = await getScreenPermissionStatus();
          if (newStatus !== "granted") {
            // Show dialog to guide user
            setShowPermissionDialog(true);
            return;
          }
        }

        const stream = await getSystemAudioStream();
        if (stream) {
          await analyzer.connect(stream);
          setLiveConnected(true, "system");
        } else {
          // Stream failed, show permission dialog
          setShowPermissionDialog(true);
        }
      } else {
        try {
          await analyzer.connect();
          setLiveConnected(true, "microphone");
        } catch (err) {
          if (err instanceof Error && err.name === "NotAllowedError") {
            setShowMicPermissionDialog(true);
          }
        }
      }
    },
    [
      analyzer,
      canUseSystemAudio,
      setLiveConnected,
      setShowPermissionDialog,
      setShowMicPermissionDialog,
    ]
  );

  const disconnect = useCallback(() => {
    if (sourceType === "system" && window.electronAPI?.disableLoopbackAudio) {
      window.electronAPI.disableLoopbackAudio();
    }
    analyzer.disconnect();
    setLiveConnected(false);
  }, [analyzer, sourceType, setLiveConnected]);

  return {
    connect,
    disconnect,
    getAnalysis: analyzer.getAnalysis,
    isConnected,
    sourceType,
    setOnsetDecay: analyzer.setOnsetDecay,
    getStream: analyzer.getStream,
    canUseSystemAudio,
    showPermissionDialog,
    closePermissionDialog,
    openScreenRecordingSettings,
    showMicPermissionDialog,
    closeMicPermissionDialog,
    analysisRef: analyzer.analysisRef,
  };
}
