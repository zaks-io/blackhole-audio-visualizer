"use client";

import { useState, useRef, useCallback } from "react";

interface RecordingState {
  isRecording: boolean;
  duration: number;
  error: string | null;
}

function downloadRecording(blob: Blob, mimeType: string) {
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
  const filename = `visualization-${timestamp}.${extension}`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useRecording(fps = 60, videoBitsPerSecond = 100_000_000) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupInterval = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(
    (canvas: HTMLCanvasElement, audioStream: MediaStream | null) => {
      const codecs = [
        'video/mp4; codecs="avc1.42E01E,mp4a.40.2"', // H264 + AAC (Chrome 2024+, Safari)
        "video/webm;codecs=vp9,opus", // VP9 fallback
        "video/webm;codecs=vp8,opus", // VP8 fallback
        "video/webm", // WebM fallback
      ];
      const mimeType = codecs.find((codec) => MediaRecorder.isTypeSupported(codec));

      if (!mimeType) {
        setState((prev) => ({ ...prev, error: "Video recording not supported in this browser" }));
        return false;
      }

      const videoStream = canvas.captureStream(fps);

      let combinedStream: MediaStream;
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks]);
      } else {
        combinedStream = videoStream;
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond,
        audioBitsPerSecond: 320_000,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        downloadRecording(blob, mimeType);
        cleanupInterval();
      };

      mediaRecorder.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: "Recording error occurred",
          isRecording: false,
        }));
        cleanupInterval();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 1000);

      setState({
        isRecording: true,
        duration: 0,
        error: null,
      });

      return true;
    },
    [fps, videoBitsPerSecond, cleanupInterval]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isRecording: false }));
    }
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
