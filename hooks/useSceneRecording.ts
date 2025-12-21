"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRecording } from "./useRecording";
import type { useUnifiedPlayer } from "./useUnifiedPlayer";

interface UseSceneRecordingConfig {
  player: ReturnType<typeof useUnifiedPlayer>;
  getRecordingStream: () => MediaStream | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function useSceneRecording({
  player,
  getRecordingStream,
  canvasRef,
}: UseSceneRecordingConfig) {
  const recording = useRecording();
  const isRecordingRef = useRef(false);

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

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }

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
  }, [canvasRef, getRecordingStream, player, recording]);

  const stopRecording = useCallback(() => {
    recording.stopRecording();
  }, [recording]);

  return {
    isRecording: recording.isRecording,
    duration: recording.duration,
    error: recording.error,
    startRecording,
    stopRecording,
  };
}
