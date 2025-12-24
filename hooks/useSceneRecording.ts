"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRecording } from "./useRecording";
import type { useUnifiedPlayer } from "./useUnifiedPlayer";

interface UseSceneRecordingConfig {
  player: ReturnType<typeof useUnifiedPlayer>;
  getRecordingStream: () => MediaStream | null;
}

export function useSceneRecording({ player, getRecordingStream }: UseSceneRecordingConfig) {
  const recording = useRecording();
  const isRecordingRef = useRef(false);
  const previousLoopStateRef = useRef<boolean | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = recording.isRecording;
  }, [recording.isRecording]);

  // Auto-stop when scene ends
  useEffect(() => {
    if (player.state.status === "ended" && isRecordingRef.current) {
      recording.stopRecording();
    }
  }, [player.state.status, recording]);

  // Ensure loop stays disabled while recording
  useEffect(() => {
    if (recording.isRecording) {
      player.setLoop(false);
    }
  }, [recording.isRecording, player]);

  const startRecording = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }

    // Store current loop state before disabling it
    previousLoopStateRef.current = player.loopEnabled;

    // Disable loop so recording stops at end
    player.setLoop(false);

    // Stop any current playback and reset to beginning
    player.stop();

    // Start playback first (this ensures audio element is connected)
    player.play();

    // Give a short delay for the audio context to be set up, then start recording
    setTimeout(() => {
      const audioStream = getRecordingStream();
      if (!audioStream) {
        console.error("Audio stream not available - ensure audio is loaded");
        player.stop();
        return;
      }

      recording.startRecording(canvas, audioStream);
    }, 100);
  }, [getRecordingStream, player, recording]);

  const stopRecording = useCallback(() => {
    recording.stopRecording();

    // Restore previous loop state after recording stops
    if (previousLoopStateRef.current !== null) {
      player.setLoop(previousLoopStateRef.current);
      previousLoopStateRef.current = null;
    }
  }, [recording, player]);

  return {
    isRecording: recording.isRecording,
    duration: recording.duration,
    error: recording.error,
    startRecording,
    stopRecording,
  };
}
