"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { useAudioAnalyzer, type AnalyzedAudio } from "./useAudioAnalyzer";
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
  const [sourceType, setSourceType] = useState<AudioSourceType | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showMicPermissionDialog, setShowMicPermissionDialog] = useState(false);
  const [isConnectedState, setIsConnectedState] = useState(false);
  const analyzer = useAudioAnalyzer();

  const canUseSystemAudio = useSyncExternalStore(emptySubscribe, isElectron, () => false);

  const openScreenRecordingSettings = useCallback(() => {
    if (window.electronAPI?.openScreenRecordingPreferences) {
      window.electronAPI.openScreenRecordingPreferences();
    }
    setShowPermissionDialog(false);
  }, []);

  const closePermissionDialog = useCallback(() => {
    setShowPermissionDialog(false);
  }, []);

  const closeMicPermissionDialog = useCallback(() => {
    setShowMicPermissionDialog(false);
  }, []);

  const connect = useCallback(
    async (type: AudioSourceType = "microphone") => {
      if (analyzer.isConnected()) {
        analyzer.disconnect();
        setIsConnectedState(false);
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
          setSourceType("system");
          setIsConnectedState(true);
        } else {
          // Stream failed, show permission dialog
          setShowPermissionDialog(true);
        }
      } else {
        try {
          await analyzer.connect();
          setSourceType("microphone");
          setIsConnectedState(true);
        } catch (err) {
          if (err instanceof Error && err.name === "NotAllowedError") {
            setShowMicPermissionDialog(true);
          }
        }
      }
    },
    [analyzer, canUseSystemAudio]
  );

  const disconnect = useCallback(() => {
    if (sourceType === "system" && window.electronAPI?.disableLoopbackAudio) {
      window.electronAPI.disableLoopbackAudio();
    }
    analyzer.disconnect();
    setSourceType(null);
    setIsConnectedState(false);
  }, [analyzer, sourceType]);

  return {
    connect,
    disconnect,
    getAnalysis: analyzer.getAnalysis,
    isConnected: isConnectedState,
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
