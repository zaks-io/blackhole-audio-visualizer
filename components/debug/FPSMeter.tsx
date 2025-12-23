"use client";

import { useRef, useEffect } from "react";
import { useFPSStore } from "@/hooks/useFPSMonitor";
import { useProducerMode } from "@/components/ProducerMode/useProducerMode";
import { cn } from "@/lib/utils";

const CHART_WIDTH = 80;
const CHART_HEIGHT = 24;

const COLOR_GOOD = "rgba(255, 255, 255, 0.9)";
const COLOR_WARN = "rgba(255, 200, 50, 0.9)";
const COLOR_BAD = "rgba(255, 80, 80, 0.9)";

export function FPSMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fps = useFPSStore((s) => s.fps);
  const history = useFPSStore((s) => s.history);
  const historyIndex = useFPSStore((s) => s.historyIndex);
  const historyVersion = useFPSStore((s) => s.historyVersion);
  const maxDeltaMs = useFPSStore((s) => s.maxDeltaMs);
  const low1Percent = useFPSStore((s) => s.getLow1Percent());

  const producerPanelOpen = useProducerMode((s) => s.isOpen);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

    if (history.length < 2) return;

    const n = history.length;

    // Find dynamic range for auto-scaling
    let maxVal = -Infinity;
    for (let i = 0; i < n; i++) {
      const val = history[i];
      if (val > maxVal) maxVal = val;
    }

    // Scale 0 to Max (at least 60)
    const effectiveMax = Math.max(maxVal, 60);

    ctx.beginPath();
    ctx.lineWidth = 1; // Crisp line
    ctx.lineJoin = "bevel"; // Sharper corners than round

    for (let i = 0; i < n; i++) {
      const value = history[(historyIndex + i) % n];
      const x = (i / (n - 1)) * CHART_WIDTH;

      const normalizedHeight = value / effectiveMax;
      const y = CHART_HEIGHT - normalizedHeight * (CHART_HEIGHT - 2) - 1; // 1px padding

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Dynamic color based on current FPS
    if (fps < 30) ctx.strokeStyle = COLOR_BAD;
    else if (fps < 55) ctx.strokeStyle = COLOR_WARN;
    else ctx.strokeStyle = COLOR_GOOD;

    ctx.stroke();
  }, [fps, historyVersion, historyIndex, history]);

  return (
    <div
      className={cn(
        "fixed bottom-3 z-50 glass-panel rounded-md px-2 py-1.5 flex items-center gap-3",
        "transition-[left] duration-300 ease-out backdrop-blur-md shadow-sm border-white/5",
        producerPanelOpen ? "left-[332px]" : "left-3"
      )}
    >
      <canvas ref={canvasRef} width={CHART_WIDTH} height={CHART_HEIGHT} className="opacity-90" />

      <div className="flex flex-col gap-0.5 leading-none min-w-[50px]">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-sm font-bold font-mono tracking-tight",
              fps < 30 ? "text-red-400" : fps < 55 ? "text-yellow-400" : "text-white"
            )}
          >
            {fps}
          </span>
          <span className="text-[9px] text-white/40 font-medium">FPS</span>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-mono text-white/50">
          <span
            className={
              low1Percent > 33 ? "text-red-300" : low1Percent > 17 ? "text-yellow-300" : ""
            }
          >
            {Math.round(low1Percent)}ms
          </span>
          <span className="opacity-50">|</span>
          <span>{Math.round(maxDeltaMs)}ms</span>
        </div>
      </div>
    </div>
  );
}
