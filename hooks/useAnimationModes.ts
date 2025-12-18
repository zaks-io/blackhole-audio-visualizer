"use client";

import { useRef, useCallback, useEffect } from "react";
import { gsap } from "gsap";
import type { AudioTriggers } from "./useAudioTriggers";

export interface AnimationParams {
  // Black Hole
  eventHorizonRadius: number;
  iscoRatio: number;
  beatPulse: number;

  // Particles
  pointSize: number;
  brightness: number;
  alpha: number;

  // Physics
  gravity: number;
  timeScale: number;
  softening: number;
  orbitDecay: number;
  iscoStrength: number;

  // Emitters
  emitRadius: number;
  emitterCount: number;
  emitterTilt: number;
  inwardAngle: number;
  spawnRate: number;
  emitterSpread: number;

  // Audio
  amplitude: number;
  beatRepulsion: number;
}

export interface AnimationMode {
  name: string;
  params: Partial<AnimationParams>;
  transitionDuration: number;
}

const DEFAULT_PARAMS: AnimationParams = {
  eventHorizonRadius: 5,
  iscoRatio: 3.0,
  beatPulse: 2,
  pointSize: 1.0,
  brightness: 1.5,
  alpha: 0.8,
  gravity: 100000,
  timeScale: 5.0,
  softening: 1.0,
  orbitDecay: 1,
  iscoStrength: 0.5,
  emitRadius: 200,
  emitterCount: 36,
  emitterTilt: 0,
  inwardAngle: 0,
  spawnRate: 1.0,
  emitterSpread: 0,
  amplitude: 5,
  beatRepulsion: 20,
};

export const ANIMATION_MODES: Record<string, AnimationMode> = {
  default: {
    name: "Default",
    params: { ...DEFAULT_PARAMS },
    transitionDuration: 2000,
  },

  calm: {
    name: "Calm",
    params: {
      beatPulse: 0.5,
      brightness: 1.0,
      alpha: 0.6,
      gravity: 50000,
      timeScale: 2.0,
      orbitDecay: 0.5,
      spawnRate: 0.5,
      beatRepulsion: 5,
      amplitude: 3,
    },
    transitionDuration: 3000,
  },

  intense: {
    name: "Intense",
    params: {
      beatPulse: 2.0,
      brightness: 2.5,
      alpha: 1.0,
      gravity: 150000,
      timeScale: 8.0,
      orbitDecay: 3,
      spawnRate: 2.0,
      beatRepulsion: 50,
      amplitude: 8,
      iscoStrength: 0.8,
    },
    transitionDuration: 500,
  },

  drop: {
    name: "Drop",
    params: {
      eventHorizonRadius: 8,
      iscoRatio: 2.5,
      beatPulse: 2.0,
      brightness: 3.0,
      alpha: 1.0,
      gravity: 200000,
      timeScale: 10.0,
      orbitDecay: 5,
      spawnRate: 3.0,
      beatRepulsion: 80,
      amplitude: 10,
      iscoStrength: 1.0,
      emitterSpread: 0.3,
    },
    transitionDuration: 200,
  },

  buildup: {
    name: "Buildup",
    params: {
      beatPulse: 1.5,
      brightness: 2.0,
      gravity: 120000,
      timeScale: 6.0,
      orbitDecay: 2,
      spawnRate: 1.5,
      beatRepulsion: 30,
      amplitude: 6,
      emitRadius: 150,
    },
    transitionDuration: 4000,
  },

  breakdown: {
    name: "Breakdown",
    params: {
      beatPulse: 0.3,
      brightness: 0.8,
      alpha: 0.5,
      gravity: 30000,
      timeScale: 1.5,
      orbitDecay: 0.3,
      spawnRate: 0.3,
      beatRepulsion: 0,
      amplitude: 2,
      iscoStrength: 0.2,
    },
    transitionDuration: 2000,
  },

  spiral: {
    name: "Spiral",
    params: {
      emitRadius: 100,
      emitterTilt: 20,
      inwardAngle: 0.3,
      gravity: 80000,
      timeScale: 4.0,
      orbitDecay: 1.5,
      iscoStrength: 0.3,
    },
    transitionDuration: 2000,
  },

  wide: {
    name: "Wide",
    params: {
      emitRadius: 200,
      emitterTilt: 0,
      inwardAngle: -0.2,
      gravity: 120000,
      timeScale: 6.0,
      orbitDecay: 0.8,
      spawnRate: 1.5,
    },
    transitionDuration: 2000,
  },
};

export type AnimationModeId = keyof typeof ANIMATION_MODES;

interface UseAnimationModesOptions {
  onParamsChange: (params: Partial<AnimationParams>) => void;
  autoMode?: boolean;
}

export function useAnimationModes({ onParamsChange, autoMode = true }: UseAnimationModesOptions) {
  const currentModeRef = useRef<AnimationModeId>("default");
  const currentParamsRef = useRef<AnimationParams>({ ...DEFAULT_PARAMS });
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);
  const cooldownRef = useRef<number>(3000); // Minimum time between auto mode changes

  const transitionTo = useCallback(
    (modeId: AnimationModeId) => {
      const mode = ANIMATION_MODES[modeId];
      if (!mode) return;

      // Kill any existing tween
      if (tweenRef.current) {
        tweenRef.current.kill();
      }

      currentModeRef.current = modeId;

      // Create target params by merging default with mode params
      const targetParams = { ...DEFAULT_PARAMS, ...mode.params };

      // Tween current params to target
      tweenRef.current = gsap.to(currentParamsRef.current, {
        ...targetParams,
        duration: mode.transitionDuration / 1000,
        ease: "power2.inOut",
        onUpdate: () => {
          onParamsChange({ ...currentParamsRef.current });
        },
      });
    },
    [onParamsChange]
  );

  const processTriggersForMode = useCallback(
    (triggers: AudioTriggers, timestamp: number) => {
      if (!autoMode) return;

      const timeSinceLastTrigger = timestamp - lastTriggerTimeRef.current;
      if (timeSinceLastTrigger < cooldownRef.current) return;

      // Priority-based mode selection
      if (triggers.dropDetected) {
        transitionTo("drop");
        lastTriggerTimeRef.current = timestamp;
        cooldownRef.current = 5000; // Longer cooldown after drop
      } else if (triggers.buildupDetected && currentModeRef.current !== "buildup") {
        transitionTo("buildup");
        lastTriggerTimeRef.current = timestamp;
        cooldownRef.current = 2000;
      } else if (triggers.breakdownDetected && currentModeRef.current !== "breakdown") {
        transitionTo("breakdown");
        lastTriggerTimeRef.current = timestamp;
        cooldownRef.current = 2000;
      } else if (triggers.possibleSongChange) {
        // Reset to default on song change
        transitionTo("default");
        lastTriggerTimeRef.current = timestamp;
        cooldownRef.current = 5000;
      } else if (triggers.intensity > 0.6 && currentModeRef.current === "calm") {
        // Transition from calm to intense when energy picks up
        transitionTo("intense");
        lastTriggerTimeRef.current = timestamp;
        cooldownRef.current = 3000;
      } else if (triggers.intensity < 0.2 && currentModeRef.current === "intense") {
        // Transition from intense to calm when energy drops
        transitionTo("calm");
        lastTriggerTimeRef.current = timestamp;
        cooldownRef.current = 3000;
      }
    },
    [autoMode, transitionTo]
  );

  const setMode = useCallback(
    (modeId: AnimationModeId) => {
      transitionTo(modeId);
    },
    [transitionTo]
  );

  const getCurrentMode = useCallback(() => currentModeRef.current, []);

  const getCurrentParams = useCallback(() => ({ ...currentParamsRef.current }), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, []);

  return {
    setMode,
    getCurrentMode,
    getCurrentParams,
    processTriggersForMode,
    availableModes: Object.keys(ANIMATION_MODES) as AnimationModeId[],
  };
}
