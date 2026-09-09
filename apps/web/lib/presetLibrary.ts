import snapshot from "@/config/presets.json";
import { presetLibrarySchema } from "./presetLibrarySchema";
import type { Preset, Playlist } from "@/components/ProducerMode/types";

// Keep the bundled collection separate from persisted edits so updates can ship new presets.
export const presetLibrary: { version: 1; presets: Preset[]; playlists: Playlist[] } =
  presetLibrarySchema.parse(snapshot);

export function mergeLibraryEntries<T extends { id: string }>(
  bundled: T[],
  edits: T[],
  deletedIds: string[]
): T[] {
  const entries = new Map(bundled.map((entry) => [entry.id, entry]));
  for (const entry of edits) entries.set(entry.id, entry);
  for (const id of deletedIds) entries.delete(id);
  return [...entries.values()];
}
