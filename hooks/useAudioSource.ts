"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { useMicrophone, type AudioData } from "./useMicrophone";
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
  getFrequencyData: (bandCount: number) => AudioData;
  isConnected: boolean;
  sourceType: AudioSourceType | null;
  setOnsetDecay: (value: number) => void;
  getStream: () => MediaStream | null;
  canUseSystemAudio: boolean;
  showPermissionDialog: boolean;
  closePermissionDialog: () => void;
  openScreenRecordingSettings: () => void;
}

const emptySubscribe = () => () => {};

export function useAudioSource(): UseAudioSourceReturn {
  const [sourceType, setSourceType] = useState<AudioSourceType | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const microphone = useMicrophone();

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

  const connect = useCallback(
    async (type: AudioSourceType = "microphone") => {
      if (microphone.isConnected) {
        microphone.disconnect();
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
          await microphone.connect(stream);
          setSourceType("system");
        } else {
          // Stream failed, show permission dialog
          setShowPermissionDialog(true);
        }
      } else {
        await microphone.connect();
        setSourceType("microphone");
      }
    },
    [microphone, canUseSystemAudio]
  );

  const disconnect = useCallback(() => {
    if (sourceType === "system" && window.electronAPI?.disableLoopbackAudio) {
      window.electronAPI.disableLoopbackAudio();
    }
    microphone.disconnect();
    setSourceType(null);
  }, [microphone, sourceType]);

  return {
    connect,
    disconnect,
    getFrequencyData: microphone.getFrequencyData,
    isConnected: microphone.isConnected,
    sourceType,
    setOnsetDecay: microphone.setOnsetDecay,
    getStream: microphone.getStream,
    canUseSystemAudio,
    showPermissionDialog,
    closePermissionDialog,
    openScreenRecordingSettings,
  };
}
