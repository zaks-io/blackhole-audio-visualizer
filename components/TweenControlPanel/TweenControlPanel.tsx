'use client';

import { useMemo } from 'react';
import { PROPERTY_REGISTRY, EASE_FUNCTIONS } from './propertyRegistry';
import { useTweenControl } from './useTweenControl';
import type { EaseFunction } from './propertyRegistry';

export function TweenControlPanel() {
  const { state, currentValue, setSelectedProperty, setTargetValue, setDuration, setEase, startTween, cancelTween } =
    useTweenControl();

  const { selectedProperty, targetValue, duration, ease, isTweening, progress } = state;

  const groupedProperties = useMemo(() => {
    return PROPERTY_REGISTRY.reduce(
      (acc, prop) => {
        if (!acc[prop.group]) acc[prop.group] = [];
        acc[prop.group].push(prop);
        return acc;
      },
      {} as Record<string, typeof PROPERTY_REGISTRY>
    );
  }, []);

  return (
    <div className="fixed bottom-6 left-24 z-50 w-72 rounded-lg border border-gray-700 bg-gray-900/90 p-4 shadow-xl backdrop-blur-sm">
      <h3 className="mb-3 text-sm font-semibold text-white">Property Tween</h3>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-gray-400">Property</label>
        <select
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
          value={selectedProperty?.path ?? ''}
          onChange={(e) => {
            const prop = PROPERTY_REGISTRY.find((p) => p.path === e.target.value);
            setSelectedProperty(prop ?? null);
          }}
        >
          <option value="">Select property...</option>
          {Object.entries(groupedProperties).map(([group, props]) => (
            <optgroup key={group} label={group}>
              {props.map((prop) => (
                <option key={prop.path} value={prop.path}>
                  {prop.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selectedProperty && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">Current</span>
            <span className="font-mono text-sm text-white">{currentValue?.toFixed(2) ?? '-'}</span>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-400">
              Target ({selectedProperty.min} - {selectedProperty.max})
            </label>
            <input
              type="number"
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
              value={targetValue}
              min={selectedProperty.min}
              max={selectedProperty.max}
              step={selectedProperty.step}
              onChange={(e) => setTargetValue(parseFloat(e.target.value))}
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-400">Ease</label>
            <select
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              value={ease}
              onChange={(e) => setEase(e.target.value as EaseFunction)}
            >
              {EASE_FUNCTIONS.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-gray-400">Duration (s)</label>
            <input
              type="number"
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 font-mono text-sm text-white focus:border-blue-500 focus:outline-none"
              value={duration}
              min={0.1}
              max={30}
              step={0.1}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
            />
          </div>

          {isTweening && (
            <div className="mb-3">
              <div className="mb-1 text-xs text-gray-400">{Math.round(progress * 100)}%</div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {isTweening ? (
            <button
              onClick={cancelTween}
              className="w-full rounded bg-red-600 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={startTween}
              className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Start Tween
            </button>
          )}
        </>
      )}
    </div>
  );
}
