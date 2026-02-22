"use client";

import { useRef, useEffect, memo } from "react";
import type { TimeSubscriber } from "@/hooks/useUnifiedPlayer";

interface TimeDisplayProps {
  subscribeToTime: (callback: TimeSubscriber) => () => void;
  getCurrentTime: () => number;
  duration: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function TimeDisplayComponent({ subscribeToTime, getCurrentTime, duration }: TimeDisplayProps) {
  const currentTimeRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Set initial values
    if (currentTimeRef.current) {
      currentTimeRef.current.textContent = formatTime(getCurrentTime());
    }
    if (durationRef.current) {
      durationRef.current.textContent = formatTime(duration);
    }

    // Subscribe to time updates - direct DOM mutation, no React re-renders
    const unsubscribe = subscribeToTime((currentTime, dur) => {
      if (currentTimeRef.current) {
        currentTimeRef.current.textContent = formatTime(currentTime);
      }
      if (durationRef.current) {
        durationRef.current.textContent = formatTime(dur);
      }
    });

    return unsubscribe;
  }, [subscribeToTime, getCurrentTime, duration]);

  // Update duration when it changes (this is infrequent, only on load)
  useEffect(() => {
    if (durationRef.current) {
      durationRef.current.textContent = formatTime(duration);
    }
  }, [duration]);

  return (
    <div className="text-sm text-white/70 tabular-nums min-w-[80px] text-center">
      <span ref={currentTimeRef}>0:00</span>
      {" / "}
      <span ref={durationRef}>0:00</span>
    </div>
  );
}

export const TimeDisplay = memo(TimeDisplayComponent);
