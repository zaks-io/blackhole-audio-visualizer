"use client";

import { memo } from "react";

interface EnergyBarProps {
  label: string;
  value: number;
  threshold?: number;
  isPeak?: boolean;
  color?: "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple";
}

const colorClasses: Record<string, { bar: string; peak: string }> = {
  red: { bar: "bg-red-500", peak: "bg-red-400" },
  orange: { bar: "bg-orange-500", peak: "bg-orange-400" },
  yellow: { bar: "bg-yellow-500", peak: "bg-yellow-400" },
  green: { bar: "bg-green-500", peak: "bg-green-400" },
  cyan: { bar: "bg-cyan-500", peak: "bg-cyan-400" },
  blue: { bar: "bg-blue-500", peak: "bg-blue-400" },
  purple: { bar: "bg-purple-500", peak: "bg-purple-400" },
};

export const EnergyBar = memo(function EnergyBar({
  label,
  value,
  threshold,
  isPeak = false,
  color = "blue",
}: EnergyBarProps) {
  const colors = colorClasses[color] || colorClasses.blue;
  const safeValue = Number.isNaN(value) ? 0 : value;
  const percentage = Math.min(100, Math.max(0, safeValue * 100));
  const thresholdPercent =
    threshold !== undefined && !Number.isNaN(threshold) ? Math.min(100, threshold * 100) : null;

  return (
    <div className="mb-1.5">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-white min-w-[2.5rem] text-right">
            {(safeValue * 100).toFixed(0)}%
          </span>
          {isPeak && <span className={`w-2 h-2 rounded-full ${colors.peak} animate-pulse`} />}
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-700/50">
        <div
          className={`h-full transition-all duration-75 ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
        {thresholdPercent !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/60"
            style={{ left: `${thresholdPercent}%` }}
          />
        )}
      </div>
    </div>
  );
});
