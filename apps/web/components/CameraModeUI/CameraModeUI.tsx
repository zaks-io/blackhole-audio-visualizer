"use client";

import type { CameraMode } from "@/components/CameraSystem";

interface CameraModeUIProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  isTransitioning: boolean;
}

const MODES: { id: CameraMode; label: string; icon: string }[] = [
  { id: "free", label: "Free Look", icon: "👁" },
  { id: "circle", label: "Circle", icon: "○" },
  { id: "closeup", label: "Close Up", icon: "↗" },
  { id: "orbit", label: "Orbit", icon: "⬇" },
  { id: "edge", label: "Edge", icon: "—" },
];

export function CameraModeUI({ currentMode, onModeChange, isTransitioning }: CameraModeUIProps) {
  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          disabled={isTransitioning && mode.id !== "free"}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg
            text-lg font-medium
            ${
              currentMode === mode.id
                ? "bg-blue-500 text-white ring-2 ring-blue-300"
                : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
            }
            ${isTransitioning && mode.id !== "free" ? "opacity-50 cursor-wait" : "hover:scale-105"}
          `}
          title={mode.label}
        >
          {mode.icon}
        </button>
      ))}
    </div>
  );
}
