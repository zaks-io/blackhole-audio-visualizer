import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { presetLibrary } from "@/lib/presetLibrary";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});
afterEach(() => localStorage.clear());

it("clears a selection that no longer exists after a bundled update", async () => {
  localStorage.setItem(
    "producer-presets",
    JSON.stringify({ state: { presets: [], activePresetId: "removed" }, version: 0 })
  );
  const { usePresets } = await import("@/components/ProducerMode/usePresets");
  expect(usePresets.getState().activePresetId).toBeNull();
});

it("fails loading duplicate saved presets without replacing the stored data", async () => {
  const preset = presetLibrary.presets[0];
  const stored = JSON.stringify({
    state: { presets: [preset, preset], activePresetId: null },
    version: 0,
  });
  localStorage.setItem("producer-presets", stored);
  await expect(import("@/components/ProducerMode/usePresets")).rejects.toThrow(
    "Could not load saved presets"
  );
  expect(localStorage.getItem("producer-presets")).toBe(stored);
});

it.each(["playlist IDs", "playlist entries"])(
  "fails loading duplicate %s without replacing the stored data",
  async (duplicate) => {
    const playlist = { ...presetLibrary.playlists[0], items: [{ presetId: "one" }] };
    const playlists =
      duplicate === "playlist IDs"
        ? [playlist, playlist]
        : [{ ...playlist, items: [...playlist.items, ...playlist.items] }];
    const stored = JSON.stringify({
      state: { playlists, deletedPlaylistIds: [] },
      version: 0,
    });
    localStorage.setItem("producer-playlists", stored);
    await expect(import("../usePlaylists")).rejects.toThrow("Could not load saved playlists");
    expect(localStorage.getItem("producer-playlists")).toBe(stored);
  }
);
