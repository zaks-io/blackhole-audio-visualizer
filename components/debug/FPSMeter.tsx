"use client";

import { useRef, useEffect } from "react";
import { useFPSStore } from "@/hooks/useFPSMonitor";
import { useProducerMode } from "@/components/ProducerMode/useProducerMode";
import { cn } from "@/lib/utils";

const CHART_WIDTH = 60;
const CHART_HEIGHT = 20;

const WHITE = "rgba(255, 255, 255, 0.8)";

export function FPSMeter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fps = useFPSStore((s) => s.fps);
  const history = useFPSStore((s) => s.history);
  const historyVersion = useFPSStore((s) => s.historyVersion);
  const spikeCount = useFPSStore((s) => s.spikeCount);
  const maxDeltaMs = useFPSStore((s) => s.maxDeltaMs);
  const producerPanelOpen = useProducerMode((s) => s.isOpen);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

    if (history.length < 2) return;

    let max = 0;
    for (let i = 0; i < history.length; i++) {
      if (history[i] > max) max = history[i];
    }
    const range = max || 1;

    ctx.beginPath();
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 1;

    for (let i = 0; i < history.length; i++) {
      const value = history[i];
      const x = (i / (history.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - (value / range) * (CHART_HEIGHT - 2) - 1;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }, [fps, historyVersion, history]);

  return (
    <div
      className={cn(
        "fixed bottom-3 z-50 glass-panel rounded px-2 py-1 flex items-center gap-2",
        "transition-[left] duration-300 ease-out",
        producerPanelOpen ? "left-[332px]" : "left-3"
      )}
    >
      <canvas ref={canvasRef} width={CHART_WIDTH} height={CHART_HEIGHT} className="opacity-80" />
      <div className="flex flex-col leading-none">
        <span className="font-mono text-xs tabular-nums text-white/80" style={{ minWidth: "28px" }}>
          {fps}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-white/60">
          spk {spikeCount} max {Math.round(maxDeltaMs)}ms
        </span>
      </div>
    </div>
  );
}
