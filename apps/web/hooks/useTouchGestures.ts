"use client";

import { useCallback, useRef, useEffect, useState } from "react";

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  lastTapRegion: "left" | "center" | "right" | null;
}

interface GestureState {
  isGesturing: boolean;
  gestureType: "volume" | "seek-left" | "seek-right" | null;
  gestureValue: number;
}

interface UseTouchGesturesOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  onTap: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onVerticalSwipe: (delta: number, side: "left" | "right") => void;
  onSwipeEnd?: () => void;
  enabled?: boolean;
}

const TAP_THRESHOLD = 10; // pixels - movement beyond this is a drag
const DOUBLE_TAP_WINDOW = 300; // ms
const SWIPE_THRESHOLD = 15; // pixels before swipe is recognized

export function useTouchGestures({
  containerRef,
  onTap,
  onDoubleTapLeft,
  onDoubleTapRight,
  onVerticalSwipe,
  onSwipeEnd,
  enabled = true,
}: UseTouchGesturesOptions) {
  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    lastTapRegion: null,
  });

  const [gestureState, setGestureState] = useState<GestureState>({
    isGesturing: false,
    gestureType: null,
    gestureValue: 0,
  });

  const tapTimeoutRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);
  const swipeSideRef = useRef<"left" | "right" | null>(null);

  const getRegion = useCallback(
    (clientX: number): "left" | "center" | "right" => {
      const container = containerRef.current;
      if (!container) return "center";

      const rect = container.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const thirdWidth = rect.width / 3;

      if (relativeX < thirdWidth) return "left";
      if (relativeX > thirdWidth * 2) return "right";
      return "center";
    },
    [containerRef]
  );

  const getSide = useCallback(
    (clientX: number): "left" | "right" => {
      const container = containerRef.current;
      if (!container) return "right";

      const rect = container.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      return relativeX < rect.width / 2 ? "left" : "right";
    },
    [containerRef]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchState.current = {
        ...touchState.current,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };
      isSwipingRef.current = false;
      swipeSideRef.current = getSide(touch.clientX);
    },
    [enabled, getSide]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchState.current.startX);
      const deltaY = touch.clientY - touchState.current.startY;
      const absDeltaY = Math.abs(deltaY);

      // Determine if this is a vertical swipe
      if (absDeltaY > SWIPE_THRESHOLD && absDeltaY > deltaX) {
        if (!isSwipingRef.current) {
          isSwipingRef.current = true;
          // Cancel any pending tap
          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
          }
        }

        e.preventDefault();

        const side = swipeSideRef.current || "right";

        // Normalize delta: negative = swipe up (increase), positive = swipe down (decrease)
        // Swipe sensitivity: 200px = full range
        const normalizedDelta = -deltaY / 200;

        setGestureState({
          isGesturing: true,
          gestureType: "volume",
          gestureValue: Math.max(0, Math.min(1, normalizedDelta + 0.5)),
        });

        onVerticalSwipe(normalizedDelta, side);
      }
    },
    [enabled, onVerticalSwipe]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchState.current.startX);
      const deltaY = Math.abs(touch.clientY - touchState.current.startY);
      const elapsed = Date.now() - touchState.current.startTime;

      // If we were swiping, end the gesture
      if (isSwipingRef.current) {
        setGestureState({
          isGesturing: false,
          gestureType: null,
          gestureValue: 0,
        });
        onSwipeEnd?.();
        isSwipingRef.current = false;
        return;
      }

      // Check if this was a tap (minimal movement, quick touch)
      const isTap = deltaX < TAP_THRESHOLD && deltaY < TAP_THRESHOLD && elapsed < 500;

      if (isTap) {
        const region = getRegion(touch.clientX);
        const now = Date.now();
        const timeSinceLastTap = now - touchState.current.lastTapTime;

        // Check for double-tap in same region
        if (timeSinceLastTap < DOUBLE_TAP_WINDOW && touchState.current.lastTapRegion === region) {
          // Clear any pending single tap
          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
          }

          // Handle double-tap
          if (region === "left") {
            setGestureState({
              isGesturing: true,
              gestureType: "seek-left",
              gestureValue: -10,
            });
            onDoubleTapLeft();
            // Clear gesture state after animation
            setTimeout(() => {
              setGestureState({
                isGesturing: false,
                gestureType: null,
                gestureValue: 0,
              });
            }, 600);
          } else if (region === "right") {
            setGestureState({
              isGesturing: true,
              gestureType: "seek-right",
              gestureValue: 10,
            });
            onDoubleTapRight();
            setTimeout(() => {
              setGestureState({
                isGesturing: false,
                gestureType: null,
                gestureValue: 0,
              });
            }, 600);
          }

          // Reset tap tracking
          touchState.current.lastTapTime = 0;
          touchState.current.lastTapRegion = null;
        } else {
          // First tap - wait for potential second tap
          touchState.current.lastTapTime = now;
          touchState.current.lastTapRegion = region;

          // Set timeout for single tap
          tapTimeoutRef.current = window.setTimeout(() => {
            onTap();
            touchState.current.lastTapTime = 0;
            touchState.current.lastTapRegion = null;
          }, DOUBLE_TAP_WINDOW);
        }
      }
    },
    [enabled, getRegion, onTap, onDoubleTapLeft, onDoubleTapRight, onSwipeEnd]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);

      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, [containerRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return gestureState;
}
