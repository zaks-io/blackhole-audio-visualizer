"use client";

import { useRef, useEffect, memo } from "react";

interface Peak {
  time: number;
  type: "flux" | "hfc" | "bass" | "high";
}

interface PeakTimelineProps {
  peaks: Peak[];
  windowSeconds?: number;
  height?: number;
}

const PEAK_COLORS: Record<Peak["type"], string> = {
  bass: "rgb(239, 68, 68)", // red-500
  flux: "rgb(34, 211, 238)", // cyan-400
  hfc: "rgb(168, 85, 247)", // purple-500
  high: "rgb(250, 204, 21)", // yellow-400
};

const PEAK_Y_POSITIONS: Record<Peak["type"], number> = {
  bass: 0.2,
  flux: 0.4,
  hfc: 0.6,
  high: 0.8,
};

export const PeakTimeline = memo(function PeakTimeline({
  peaks,
  windowSeconds = 2,
  height = 24,
}: PeakTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const width = rect.width;
      const canvasHeight = rect.height;
      const currentTime = performance.now();
      const windowMs = windowSeconds * 1000;
      const startTime = currentTime - windowMs;

      ctx.clearRect(0, 0, width, canvasHeight);

      // Draw background grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = (width * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }

      // Draw peaks
      for (const peak of peaks) {
        if (peak.time < startTime) continue;

        const x = ((peak.time - startTime) / windowMs) * width;
        const y = PEAK_Y_POSITIONS[peak.type] * canvasHeight;
        const color = PEAK_COLORS[peak.type];

        // Draw peak marker
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw vertical line
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [peaks, windowSeconds]);

  return (
    <div className="space-y-1">
      <canvas ref={canvasRef} className="w-full rounded bg-gray-800/50" style={{ height }} />
      <div className="flex justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>bass</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>flux</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>hfc</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span>high</span>
        </div>
      </div>
    </div>
  );
});
