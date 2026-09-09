import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { Preset } from "./types";
import { DEFAULT_DURATION, DEFAULT_EASE, PRODUCER_PARAMETERS } from "./producerConfig";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useCameraModeStore } from "@/components/CameraSystem/useCameraMode";
import { useProducerMode } from "./useProducerMode";
import { mergeLibraryEntries, presetLibrary } from "@/lib/presetLibrary";
import { libraryPresetSchema } from "@/lib/presetLibrarySchema";

interface PresetsState {
  presets: Preset[];
  deletedPresetIds: string[];
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

function capturePreset(id: string, name: string): Preset {
  const visualization = useVisualizationControls.getState();
  const producer = useProducerMode.getState();
  return libraryPresetSchema.parse({
    id,
    name,
    colorPalette: visualization.colorPalette,
    cameraMode: useCameraModeStore.getState().mode,
    parameters: PRODUCER_PARAMETERS.flatMap((group) =>
      group.parameters.map((parameter) => ({
        path: parameter.path,
        value: visualization.getByPath(parameter.path),
        duration: producer.tweenStates[parameter.path]?.duration ?? DEFAULT_DURATION,
        ease: producer.tweenStates[parameter.path]?.ease ?? DEFAULT_EASE,
      }))
    ),
  });
}

const bundledById = new Map(presetLibrary.presets.map((preset) => [preset.id, preset]));
let hydrationError: unknown;

const persistedSchema = z.object({
  presets: z
    .array(libraryPresetSchema)
    .refine(
      (entries) => new Set(entries.map((entry) => entry.id)).size === entries.length,
      "Duplicate saved presets"
    ),
  deletedPresetIds: z.array(z.string()).optional(),
  activePresetId: z.string().nullable(),
});

export const usePresets = create<PresetsState>()(
  persist(
    (set, get) => ({
      presets: presetLibrary.presets,
      deletedPresetIds: [],
      activePresetId: null,
      setActivePreset: (id) => set({ activePresetId: id }),
      savePreset: (name) => {
        const id = crypto.randomUUID();
        const preset = capturePreset(id, name);
        set((state) => ({ presets: [...state.presets, preset], activePresetId: id }));
        return id;
      },
      updatePreset: (id) => {
        const previous = get().presets.find((preset) => preset.id === id);
        if (!previous) throw new Error("Preset not found");
        const preset = capturePreset(id, previous.name);
        set((state) => ({
          presets: state.presets.map((entry) => (entry.id === id ? preset : entry)),
        }));
      },
      deletePreset: (id) => {
        if (!get().presets.some((preset) => preset.id === id)) throw new Error("Preset not found");
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
          deletedPresetIds: [...new Set([...state.deletedPresetIds, id])],
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        }));
      },
      renamePreset: (id, name) => {
        const previous = get().presets.find((preset) => preset.id === id);
        if (!previous) throw new Error("Preset not found");
        const renamed = libraryPresetSchema.parse({ ...previous, name });
        set((state) => ({
          presets: state.presets.map((preset) => (preset.id === id ? renamed : preset)),
        }));
      },
      clearPresets: () =>
        set((state) => ({
          presets: [],
          activePresetId: null,
          deletedPresetIds: [
            ...new Set([...state.deletedPresetIds, ...state.presets.map((p) => p.id)]),
          ],
        })),
      exportPresets: () => JSON.stringify(get().presets, null, 2),
      importPresets: (json) => {
        let imported: Preset[];
        try {
          const input: unknown = JSON.parse(json);
          imported = z
            .array(libraryPresetSchema)
            .min(1)
            .parse(Array.isArray(input) ? input : [input]);
        } catch {
          return { success: false, count: 0 };
        }
        const ids = new Set([
          ...get().presets.map((preset) => preset.id),
          ...get().deletedPresetIds,
        ]);
        const presets = imported.map((preset) => {
          const id = ids.has(preset.id) ? crypto.randomUUID() : preset.id;
          ids.add(id);
          return { ...preset, id };
        });
        set((state) => ({ presets: [...state.presets, ...presets] }));
        return { success: true, count: presets.length };
      },
    }),
    {
      name: "producer-presets",
      // Older versions stored local presets in the same key and shape.
      partialize: (state) => {
        if (hydrationError)
          throw new Error("Saved presets could not be loaded", { cause: hydrationError });
        return {
          presets: state.presets.filter((preset) => preset !== bundledById.get(preset.id)),
          deletedPresetIds: state.deletedPresetIds,
          activePresetId: state.activePresetId,
        };
      },
      merge: (stored, current) => {
        if (stored === undefined) return current;
        const parsed = persistedSchema.parse(stored);
        const deletedPresetIds = parsed.deletedPresetIds ?? [];
        const presets = mergeLibraryEntries(
          presetLibrary.presets,
          parsed.presets,
          deletedPresetIds
        );
        return {
          ...current,
          presets,
          deletedPresetIds,
          activePresetId: presets.some((preset) => preset.id === parsed.activePresetId)
            ? parsed.activePresetId
            : null,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          hydrationError = error;
          throw new Error("Could not load saved presets", { cause: error });
        }
      },
    }
  )
);

if (hydrationError) throw new Error("Could not load saved presets", { cause: hydrationError });
