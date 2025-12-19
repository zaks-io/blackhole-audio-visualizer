"use client";

import { useRef, useEffect, memo } from "react";

interface SpectrumViewProps {
  spectrum: Float32Array;
  barCount?: number;
  height?: number;
}

export const SpectrumView = memo(function SpectrumView({
  spectrum,
  barCount = 32,
  height = 48,
}: SpectrumViewProps) {
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
      const barWidth = width / barCount;
      const gap = 1;
      const binsPerBar = Math.floor(spectrum.length / barCount);

      ctx.clearRect(0, 0, width, canvasHeight);

      // Create gradient
      const gradient = ctx.createLinearGradient(0, canvasHeight, 0, 0);
      gradient.addColorStop(0, "rgb(34, 211, 238)"); // cyan-400
      gradient.addColorStop(0.5, "rgb(168, 85, 247)"); // purple-500
      gradient.addColorStop(1, "rgb(239, 68, 68)"); // red-500

      for (let i = 0; i < barCount; i++) {
        // Average the bins for this bar
        let sum = 0;
        const startBin = i * binsPerBar;
        const endBin = Math.min(startBin + binsPerBar, spectrum.length);
        for (let j = startBin; j < endBin; j++) {
          sum += spectrum[j];
        }
        const avg = binsPerBar > 0 ? sum / binsPerBar : 0;

        // Apply slight exponential scaling for better visual range
        const normalized = Math.pow(avg, 0.8);
        const barHeight = normalized * canvasHeight;

        const x = i * barWidth + gap / 2;
        const y = canvasHeight - barHeight;

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - gap, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [spectrum, barCount]);

  return <canvas ref={canvasRef} className="w-full rounded" style={{ height }} />;
});
