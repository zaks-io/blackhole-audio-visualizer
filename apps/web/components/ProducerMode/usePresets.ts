import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Preset, PresetParameter } from "./types";
import { PRODUCER_PARAMETERS, DEFAULT_DURATION, DEFAULT_EASE } from "./producerConfig";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useProducerMode } from "./useProducerMode";

interface PresetsState {
  presets: Preset[];
  activePresetId: string | null;

  setActivePreset: (id: string | null) => void;
  savePreset: (name: string) => string;
  updatePreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  clearPresets: () => void;
  exportPresets: () => string;
  importPresets: (json: string) => { success: boolean; count: number };
}

function generateId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const usePresets = create<PresetsState>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      setActivePreset: (id) => set({ activePresetId: id }),

      savePreset: (name) => {
        const vizState = useVisualizationControls.getState();
        const producerState = useProducerMode.getState();

        const parameters: PresetParameter[] = [];
        for (const group of PRODUCER_PARAMETERS) {
          for (const param of group.parameters) {
            const value = vizState.getByPath(param.path) as number;
            const tweenState = producerState.tweenStates[param.path];
            parameters.push({
              path: param.path,
              value,
              duration: tweenState?.duration ?? DEFAULT_DURATION,
              ease: tweenState?.ease ?? DEFAULT_EASE,
            });
          }
        }

        const id = generateId();
        const preset: Preset = {
          id,
          name,
          colorPalette: vizState.colorPalette,
          parameters,
        };

        set((state) => ({
          presets: [...state.presets, preset],
          activePresetId: id,
        }));

        return id;
      },

      updatePreset: (id) => {
        const vizState = useVisualizationControls.getState();
        const producerState = useProducerMode.getState();

        const parameters: PresetParameter[] = [];
        for (const group of PRODUCER_PARAMETERS) {
          for (const param of group.parameters) {
            const value = vizState.getByPath(param.path) as number;
            const tweenState = producerState.tweenStates[param.path];
            parameters.push({
              path: param.path,
              value,
              duration: tweenState?.duration ?? DEFAULT_DURATION,
              ease: tweenState?.ease ?? DEFAULT_EASE,
            });
          }
        }

        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, colorPalette: vizState.colorPalette, parameters } : p
          ),
        }));
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        }));
      },

      renamePreset: (id, name) => {
        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, name } : p)),
        }));
      },

      clearPresets: () => {
        set({ presets: [], activePresetId: null });
      },

      exportPresets: () => {
        const { presets } = get();
        return JSON.stringify(presets, null, 2);
      },

      importPresets: (json) => {
        try {
          const imported = JSON.parse(json) as Preset[];
          if (!Array.isArray(imported)) {
            return { success: false, count: 0 };
          }

          const validPresets = imported.filter(
            (p) =>
              typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.parameters)
          );

          if (validPresets.length === 0) {
            return { success: false, count: 0 };
          }

          set((state) => {
            const existingIds = new Set(state.presets.map((p) => p.id));
            const newPresets = validPresets.map((p) => {
              if (existingIds.has(p.id)) {
                return { ...p, id: generateId() };
              }
              return p;
            });
            return { presets: [...state.presets, ...newPresets] };
          });

          return { success: true, count: validPresets.length };
        } catch {
          return { success: false, count: 0 };
        }
      },
    }),
    {
      name: "producer-presets",
    }
  )
);
