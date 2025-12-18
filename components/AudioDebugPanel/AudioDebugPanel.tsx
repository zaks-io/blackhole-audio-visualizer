"use client";

import type { RefObject } from "react";
import { useState, useRef, useEffect } from "react";
import type { AudioTriggers, TriggerSettings } from "@/hooks/useAudioTriggers";
import type { AnimationModeId } from "@/hooks/useAnimationModes";

interface AudioDebugPanelProps {
  triggersRef: RefObject<AudioTriggers | null>;
  currentMode: AnimationModeId;
  onModeChange: (mode: AnimationModeId) => void;
  availableModes: AnimationModeId[];
  autoMode: boolean;
  onAutoModeChange: (enabled: boolean) => void;
  triggerSettings: TriggerSettings;
  onTriggerSettingsChange: (settings: TriggerSettings) => void;
}

function ProgressBar({
  value,
  label,
  color = "blue",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
  };

  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full transition-all duration-75 ${colorClasses[color] || colorClasses.blue}`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
    </div>
  );
}

function TriggerIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`rounded px-2 py-1 text-xs font-medium transition-all ${
        active ? "bg-green-500 text-white" : "bg-gray-700 text-gray-400"
      }`}
    >
      {label}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"
      />
    </div>
  );
}

function NoveltyGraph({ history }: { history: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);

    if (history.length < 2) return;

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 1;
    ctx.beginPath();

    const step = width / (history.length - 1);
    history.forEach((value, i) => {
      const x = i * step;
      const y = height - value * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [history]);

  return <canvas ref={canvasRef} width={200} height={40} className="w-full rounded" />;
}

export function AudioDebugPanel({
  triggersRef,
  currentMode,
  onModeChange,
  availableModes,
  autoMode,
  onAutoModeChange,
  triggerSettings,
  onTriggerSettingsChange,
}: AudioDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [triggers, setTriggers] = useState<AudioTriggers | null>(null);
  const [noveltyHistory, setNoveltyHistory] = useState<number[]>([]);
  const [showTriggerSettings, setShowTriggerSettings] = useState(false);

  // Poll the ref at 10Hz for UI updates (debug panel doesn't need 60fps)
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setTriggers(triggersRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, triggersRef]);

  useEffect(() => {
    if (triggers) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing external trigger data to local history
      setNoveltyHistory((prev) => {
        const next = [...prev, triggers.novelty.novelty];
        if (next.length > 100) next.shift();
        return next;
      });
    }
  }, [triggers]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed left-6 top-20 z-50 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-sm text-white shadow-xl backdrop-blur-sm hover:bg-gray-800"
      >
        Audio
      </button>
    );
  }

  const spectral = triggers?.spectral;
  const bpm = triggers?.bpm;
  const novelty = triggers?.novelty;

  return (
    <div className="fixed left-6 top-6 z-50 w-72 rounded-lg border border-gray-700 bg-gray-900/90 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-gray-700 p-3">
        <h3 className="text-sm font-semibold text-white">Audio Analysis</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
          title="Hide panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-3">
        {/* BPM Section */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">BPM</span>
            <span className="font-mono text-lg font-bold text-white">{bpm?.bpm || "--"}</span>
          </div>
          <ProgressBar value={bpm?.confidence || 0} label="Confidence" color="green" />
          <ProgressBar value={bpm?.beatPhase || 0} label="Beat Phase" color="purple" />
        </div>

        {/* Spectral Features */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-gray-300">Spectral Features</div>
          <ProgressBar value={spectral?.rms || 0} label="RMS (Loudness)" color="blue" />
          <ProgressBar
            value={spectral?.spectralCentroid || 0}
            label="Centroid (Brightness)"
            color="yellow"
          />
          <ProgressBar value={spectral?.spectralFlux || 0} label="Flux (Onset)" color="cyan" />
          <ProgressBar value={spectral?.bassEnergy || 0} label="Bass Energy" color="red" />
          <ProgressBar value={spectral?.subBassRatio || 0} label="Sub-Bass Ratio" color="red" />
          <ProgressBar
            value={spectral?.perceptualSharpness || 0}
            label="Sharpness"
            color="purple"
          />
        </div>

        {/* Novelty Graph */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">Novelty Curve</span>
            <span className="font-mono text-xs text-gray-400">
              {((novelty?.novelty || 0) * 100).toFixed(0)}%
            </span>
          </div>
          <NoveltyGraph history={noveltyHistory} />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
            <span>Trend: {novelty?.energyTrend || "stable"}</span>
            <span>Section: {(novelty?.sectionAge || 0).toFixed(1)}s</span>
          </div>
        </div>

        {/* Triggers */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-gray-300">Active Triggers</div>
          <div className="flex flex-wrap gap-1">
            <TriggerIndicator active={triggers?.onBeat || false} label="Beat" />
            <TriggerIndicator active={triggers?.onDownbeat || false} label="Downbeat" />
            <TriggerIndicator active={triggers?.dropDetected || false} label="Drop" />
            <TriggerIndicator active={triggers?.buildupDetected || false} label="Buildup" />
            <TriggerIndicator active={triggers?.breakdownDetected || false} label="Breakdown" />
            <TriggerIndicator active={triggers?.possibleSongChange || false} label="Song Change" />
          </div>
        </div>

        {/* Trigger Settings */}
        <div className="mb-4">
          <button
            onClick={() => setShowTriggerSettings(!showTriggerSettings)}
            className="mb-2 flex w-full items-center justify-between text-xs font-medium text-gray-300 hover:text-white"
          >
            <span>Trigger Settings</span>
            <span>{showTriggerSettings ? "▼" : "▶"}</span>
          </button>
          {showTriggerSettings && (
            <div className="space-y-1">
              <Slider
                label="Drop RMS"
                value={triggerSettings.dropRmsThreshold}
                min={0.1}
                max={0.6}
                step={0.01}
                onChange={(v) =>
                  onTriggerSettingsChange({ ...triggerSettings, dropRmsThreshold: v })
                }
              />
              <Slider
                label="Drop Sub-Bass"
                value={triggerSettings.dropSubBassThreshold}
                min={0.1}
                max={0.6}
                step={0.01}
                onChange={(v) =>
                  onTriggerSettingsChange({ ...triggerSettings, dropSubBassThreshold: v })
                }
              />
              <Slider
                label="Buildup Duration (s)"
                value={triggerSettings.buildupDuration}
                min={1}
                max={8}
                step={0.5}
                onChange={(v) =>
                  onTriggerSettingsChange({ ...triggerSettings, buildupDuration: v })
                }
              />
              <Slider
                label="Energy Trend"
                value={triggerSettings.energyTrendThreshold}
                min={0.02}
                max={0.3}
                step={0.01}
                onChange={(v) =>
                  onTriggerSettingsChange({ ...triggerSettings, energyTrendThreshold: v })
                }
              />
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="border-t border-gray-700 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">Animation Mode</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoMode}
                onChange={(e) => onAutoModeChange(e.target.checked)}
                className="h-3 w-3 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">Auto</span>
            </label>
          </div>
          <select
            className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            value={currentMode}
            onChange={(e) => onModeChange(e.target.value as AnimationModeId)}
            disabled={autoMode}
          >
            {availableModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
