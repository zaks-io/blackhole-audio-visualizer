import type { ScreenPermissionStatus } from "@/types/electron";

export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI?.isElectron;
}

export function isWeb(): boolean {
  return !isElectron();
}

export function canCaptureSystemAudio(): boolean {
  return isElectron();
}

export async function getScreenPermissionStatus(): Promise<ScreenPermissionStatus> {
  if (!isElectron() || !window.electronAPI) {
    return "unknown";
  }
  return window.electronAPI.getScreenPermissionStatus();
}

export async function requestScreenPermission(): Promise<boolean> {
  if (!isElectron() || !window.electronAPI) {
    return false;
  }
  return window.electronAPI.requestScreenPermission();
}

export async function getSystemAudioStream(): Promise<MediaStream | null> {
  if (!isElectron() || !window.electronAPI) {
    return null;
  }

  try {
    // Enable the loopback handler in main process
    await window.electronAPI.enableLoopbackAudio();

    // Request display media (this triggers the handler we just set)
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    // Stop and remove video tracks (per electron-audio-loopback docs)
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });

    // Check if we have audio tracks
    if (stream.getAudioTracks().length === 0) {
      console.error("No audio tracks in stream");
      return null;
    }

    return stream;
  } catch (error) {
    console.error("Failed to get system audio stream:", error);
    return null;
  }
}
