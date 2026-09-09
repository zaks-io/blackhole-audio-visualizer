import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { Playlist } from "@/components/ProducerMode/types";
import { usePresets } from "@/components/ProducerMode/usePresets";
import { mergeLibraryEntries, presetLibrary } from "@/lib/presetLibrary";
import { libraryPlaylistSchema } from "@/lib/presetLibrarySchema";

interface PlaylistsState {
  playlists: Playlist[];
  deletedPlaylistIds: string[];
  createPlaylist: (name: string) => { playlistId: string };
  updatePlaylist: (
    id: string,
    updates: Partial<
      Pick<Playlist, "name" | "shuffle" | "defaultWaitDuration" | "defaultCameraDuration">
    >
  ) => void;
  deletePlaylist: (id: string) => void;
  updatePlaylistItem: (id: string, presetId: string, waitDuration: number | undefined) => void;
  addPreset: (id: string, presetId: string) => void;
  removePreset: (id: string, presetId: string) => void;
  reorderPresets: (id: string, presetIds: string[]) => void;
  addCameraPreset: (id: string, mode: string, duration?: number) => void;
  updateCameraPreset: (id: string, index: number, duration?: number) => void;
  removeCameraPreset: (id: string, index: number) => void;
}

const bundledById = new Map(presetLibrary.playlists.map((playlist) => [playlist.id, playlist]));
let hydrationError: unknown;

const persistedSchema = z.object({
  playlists: z
    .array(libraryPlaylistSchema)
    .refine(
      (entries) => new Set(entries.map((entry) => entry.id)).size === entries.length,
      "Duplicate saved playlists"
    ),
  deletedPlaylistIds: z.array(z.string()),
});

export const usePlaylists = create<PlaylistsState>()(
  persist(
    (set, get) => {
      const find = (id: string) => {
        const playlist = get().playlists.find((entry) => entry.id === id);
        if (!playlist) throw new Error("Playlist not found");
        return playlist;
      };
      const update = (id: string, updates: Partial<Playlist>) => {
        const playlist = libraryPlaylistSchema.parse({ ...find(id), ...updates });
        set((state) => ({
          playlists: state.playlists.map((entry) => (entry.id === id ? playlist : entry)),
        }));
      };
      const cameras = (id: string, index: number) => {
        const items = find(id).cameraPresets;
        if (!items || !Number.isInteger(index) || !items[index])
          throw new Error("Camera preset not found");
        return items;
      };
      return {
        playlists: presetLibrary.playlists,
        deletedPlaylistIds: [],
        createPlaylist: (name) => {
          const id = crypto.randomUUID();
          const playlist = libraryPlaylistSchema.parse({
            id,
            name,
            items: [],
            shuffle: false,
            defaultWaitDuration: 10,
          });
          set((state) => ({ playlists: [...state.playlists, playlist] }));
          return { playlistId: id };
        },
        updatePlaylist: update,
        deletePlaylist: (id) => {
          find(id);
          set((state) => ({
            playlists: state.playlists.filter((playlist) => playlist.id !== id),
            deletedPlaylistIds: [...new Set([...state.deletedPlaylistIds, id])],
          }));
        },
        updatePlaylistItem: (id, presetId, waitDuration) => {
          const playlist = find(id);
          if (!playlist.items.some((item) => item.presetId === presetId))
            throw new Error("Playlist entry not found");
          update(id, {
            items: playlist.items.map((item) =>
              item.presetId === presetId ? { ...item, waitDuration } : item
            ),
          });
        },
        addPreset: (id, presetId) => {
          const playlist = find(id);
          if (!usePresets.getState().presets.some((preset) => preset.id === presetId))
            throw new Error("Preset not found");
          if (playlist.items.some((item) => item.presetId === presetId))
            throw new Error("Preset already in playlist");
          update(id, { items: [...playlist.items, { presetId }] });
        },
        removePreset: (id, presetId) => {
          const playlist = find(id);
          if (!playlist.items.some((item) => item.presetId === presetId))
            throw new Error("Playlist entry not found");
          update(id, { items: playlist.items.filter((item) => item.presetId !== presetId) });
        },
        reorderPresets: (id, presetIds) => {
          const playlist = find(id);
          if (
            presetIds.length !== playlist.items.length ||
            new Set(presetIds).size !== presetIds.length
          ) {
            throw new Error("Reorder must contain each playlist entry exactly once");
          }
          const items = presetIds.map((presetId) => {
            const item = playlist.items.find((entry) => entry.presetId === presetId);
            if (!item) throw new Error("Playlist entry not found");
            return item;
          });
          update(id, { items });
        },
        addCameraPreset: (id, mode, duration) =>
          update(id, {
            cameraPresets: [...(find(id).cameraPresets ?? []), { mode, duration }],
          }),
        updateCameraPreset: (id, index, duration) =>
          update(id, {
            cameraPresets: cameras(id, index).map((item, i) =>
              i === index ? { ...item, duration } : item
            ),
          }),
        removeCameraPreset: (id, index) =>
          update(id, {
            cameraPresets: cameras(id, index).filter((_, i) => i !== index),
          }),
      };
    },
    {
      name: "producer-playlists",
      partialize: (state) => {
        if (hydrationError)
          throw new Error("Saved playlists could not be loaded", { cause: hydrationError });
        return {
          playlists: state.playlists.filter(
            (playlist) => playlist !== bundledById.get(playlist.id)
          ),
          deletedPlaylistIds: state.deletedPlaylistIds,
        };
      },
      merge: (stored, current) => {
        if (stored === undefined) return current;
        const parsed = persistedSchema.parse(stored);
        return {
          ...current,
          ...parsed,
          playlists: mergeLibraryEntries(
            presetLibrary.playlists,
            parsed.playlists,
            parsed.deletedPlaylistIds
          ),
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          hydrationError = error;
          throw new Error("Could not load saved playlists", { cause: error });
        }
      },
    }
  )
);

if (hydrationError) throw new Error("Could not load saved playlists", { cause: hydrationError });

export function usePlaylistWithPresets(playlistId: string | null) {
  const playlists = usePlaylists((state) => state.playlists);
  const presets = usePresets((state) => state.presets);
  const playlist = useMemo(() => {
    const entry = playlists.find((item) => item.id === playlistId);
    if (!entry) return null;
    const byId = new Map(presets.map((preset) => [preset.id, preset]));
    return { ...entry, presets: entry.items.map((item) => byId.get(item.presetId) ?? null) };
  }, [playlistId, playlists, presets]);
  return { playlist, isLoading: false };
}
