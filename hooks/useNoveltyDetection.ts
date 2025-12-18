"use client";

import { useRef, useCallback } from "react";
import type { SpectralFeatures } from "./useMicrophone";

export type EnergyTrend = "building" | "dropping" | "stable";

export interface NoveltyData {
  novelty: number;
  noveltyPeak: boolean;
  energyTrend: EnergyTrend;
  sectionAge: number;
  avgEnergy: number;
  energyDelta: number;
}

const DEFAULT_NOVELTY_DATA: NoveltyData = {
  novelty: 0,
  noveltyPeak: false,
  energyTrend: "stable",
  sectionAge: 0,
  avgEnergy: 0,
  energyDelta: 0,
};

// History window sizes
const FLUX_HISTORY_SIZE = 60; // ~1 second at 60fps
const ENERGY_HISTORY_SIZE = 300; // ~5 seconds at 60fps
const NOVELTY_PEAK_THRESHOLD = 2.5; // Standard deviations above mean
const ENERGY_TREND_THRESHOLD = 0.15; // Minimum change to detect trend
const TREND_WINDOW = 120; // ~2 seconds for trend detection

export function useNoveltyDetection() {
  const fluxHistoryRef = useRef<number[]>([]);
  const energyHistoryRef = useRef<number[]>([]);
  const lastSectionChangeRef = useRef<number>(0);
  const dataRef = useRef<NoveltyData>({ ...DEFAULT_NOVELTY_DATA });
  const prevPeakRef = useRef<boolean>(false);

  const processFrame = useCallback((spectral: SpectralFeatures, timestamp: number): NoveltyData => {
    const data = dataRef.current;
    const { spectralFlux, rms } = spectral;

    // Update flux history
    const fluxHistory = fluxHistoryRef.current;
    fluxHistory.push(spectralFlux);
    if (fluxHistory.length > FLUX_HISTORY_SIZE) {
      fluxHistory.shift();
    }

    // Update energy history
    const energyHistory = energyHistoryRef.current;
    energyHistory.push(rms);
    if (energyHistory.length > ENERGY_HISTORY_SIZE) {
      energyHistory.shift();
    }

    // Calculate novelty from spectral flux statistics
    if (fluxHistory.length >= 10) {
      const mean = fluxHistory.reduce((a, b) => a + b, 0) / fluxHistory.length;
      const variance =
        fluxHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / fluxHistory.length;
      const stdDev = Math.sqrt(variance) || 0.01;

      // Novelty is how many standard deviations current flux is above mean
      const zScore = (spectralFlux - mean) / stdDev;
      data.novelty = Math.max(0, Math.min(1, zScore / 4));

      // Detect novelty peak (potential section boundary)
      const isPeak = zScore > NOVELTY_PEAK_THRESHOLD;
      data.noveltyPeak = isPeak && !prevPeakRef.current;
      prevPeakRef.current = isPeak;

      if (data.noveltyPeak) {
        lastSectionChangeRef.current = timestamp;
      }
    }

    // Calculate energy trend
    if (energyHistory.length >= TREND_WINDOW) {
      const recentWindow = energyHistory.slice(-TREND_WINDOW);
      const oldWindow = energyHistory.slice(
        Math.max(0, energyHistory.length - TREND_WINDOW * 2),
        energyHistory.length - TREND_WINDOW
      );

      const recentAvg = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;
      const oldAvg =
        oldWindow.length > 0 ? oldWindow.reduce((a, b) => a + b, 0) / oldWindow.length : recentAvg;

      const delta = recentAvg - oldAvg;
      data.energyDelta = delta;

      if (delta > ENERGY_TREND_THRESHOLD) {
        data.energyTrend = "building";
      } else if (delta < -ENERGY_TREND_THRESHOLD) {
        data.energyTrend = "dropping";
      } else {
        data.energyTrend = "stable";
      }

      data.avgEnergy = recentAvg;
    }

    // Calculate section age
    data.sectionAge =
      lastSectionChangeRef.current > 0 ? (timestamp - lastSectionChangeRef.current) / 1000 : 0;

    return { ...data };
  }, []);

  const reset = useCallback(() => {
    fluxHistoryRef.current = [];
    energyHistoryRef.current = [];
    lastSectionChangeRef.current = 0;
    prevPeakRef.current = false;
    dataRef.current = { ...DEFAULT_NOVELTY_DATA };
  }, []);

  return { processFrame, reset };
}
