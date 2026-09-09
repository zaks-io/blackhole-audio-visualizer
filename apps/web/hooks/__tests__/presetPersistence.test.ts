import { beforeEach, describe, expect, it } from "vitest";
import { usePresets } from "@/components/ProducerMode/usePresets";
import { usePlaylists } from "../usePlaylists";
import { useCameraModeStore } from "@/components/CameraSystem/useCameraMode";
import { presetLibrary } from "@/lib/presetLibrary";

beforeEach(() => {
  localStorage.clear();
  usePresets.setState({
    presets: presetLibrary.presets,
    deletedPresetIds: [],
    activePresetId: null,
  });
  usePlaylists.setState({ playlists: presetLibrary.playlists, deletedPlaylistIds: [] });
});

const preset = presetLibrary.presets[0];

describe("preset persistence", () => {
  it("captures the current camera when saving a preset", () => {
    useCameraModeStore.setState({ mode: "orbit", isTransitioning: false });
    const id = usePresets.getState().savePreset("My camera");
    expect(usePresets.getState().presets.find((p) => p.id === id)?.cameraMode).toBe("orbit");
  });

  it("persists only local changes, never an unedited bundled snapshot", () => {
    usePresets.getState().setActivePreset(preset.id);
    expect(JSON.parse(localStorage.getItem("producer-presets")!).state.presets).toEqual([]);
    usePresets.getState().renamePreset(preset.id, "My edit");
    expect(JSON.parse(localStorage.getItem("producer-presets")!).state.presets).toEqual([
      { ...preset, name: "My edit" },
    ]);
  });

  it("rehydrates legacy local presets alongside the bundled collection", async () => {
    const local = { ...preset, id: "legacy-local", name: "Old local preset" };
    localStorage.setItem(
      "producer-presets",
      JSON.stringify({ state: { presets: [local], activePresetId: local.id }, version: 0 })
    );
    await usePresets.persist.rehydrate();
    expect(usePresets.getState().presets).toEqual([...presetLibrary.presets, local]);
    expect(usePresets.getState().activePresetId).toBe(local.id);
  });

  it("preserves local edits and bundled deletions after reload", async () => {
    usePresets.getState().renamePreset(preset.id, "My edit");
    const deleted = presetLibrary.presets[1].id;
    usePresets.getState().deletePreset(deleted);
    await usePresets.persist.rehydrate();
    expect(usePresets.getState().presets.find((p) => p.id === preset.id)?.name).toBe("My edit");
    expect(usePresets.getState().presets.some((p) => p.id === deleted)).toBe(false);
  });

  it("rejects an entire invalid import without silently discarding records", () => {
    const before = usePresets.getState().presets;
    const result = usePresets
      .getState()
      .importPresets(JSON.stringify([preset, { ...preset, colorPalette: "missing" }]));
    expect(result).toEqual({ success: false, count: 0 });
    expect(usePresets.getState().presets).toBe(before);
  });

  it("remaps duplicate imported IDs without losing camera settings", () => {
    expect(usePresets.getState().importPresets(JSON.stringify([preset, preset]))).toEqual({
      success: true,
      count: 2,
    });
    const imported = usePresets.getState().presets.slice(-2);
    expect(new Set(imported.map((p) => p.id)).size).toBe(2);
    expect(imported.every((p) => p.id !== preset.id && p.cameraMode === preset.cameraMode)).toBe(
      true
    );
  });
});

describe("playlist persistence", () => {
  it("keeps preset timing when reordering and persists camera edits", async () => {
    const { playlistId } = usePlaylists.getState().createPlaylist("Local playlist");
    const [a, b] = presetLibrary.presets;
    const store = usePlaylists.getState();
    store.addPreset(playlistId, a.id);
    store.addPreset(playlistId, b.id);
    store.updatePlaylistItem(playlistId, a.id, 7);
    store.reorderPresets(playlistId, [b.id, a.id]);
    store.addCameraPreset(playlistId, "orbit", 12);
    await usePlaylists.persist.rehydrate();
    const playlist = usePlaylists.getState().playlists.find((p) => p.id === playlistId)!;
    expect(playlist.items).toEqual([{ presetId: b.id }, { presetId: a.id, waitDuration: 7 }]);
    expect(playlist.cameraPresets).toEqual([{ mode: "orbit", duration: 12 }]);
  });

  it("rejects invalid references and lossy reorders", () => {
    const { playlistId } = usePlaylists.getState().createPlaylist("Local playlist");
    const store = usePlaylists.getState();
    expect(() => store.addPreset(playlistId, "missing")).toThrow("Preset not found");
    store.addPreset(playlistId, preset.id);
    expect(() => store.reorderPresets(playlistId, [])).toThrow();
    expect(() => store.reorderPresets(playlistId, ["missing"])).toThrow();
    expect(store.playlists).not.toBe(usePlaylists.getState().playlists);
  });

  it("persists only changed playlists and retains bundled deletions", async () => {
    const id = presetLibrary.playlists[0].id;
    usePlaylists.getState().deletePlaylist(id);
    expect(JSON.parse(localStorage.getItem("producer-playlists")!).state.playlists).toEqual([]);
    await usePlaylists.persist.rehydrate();
    expect(usePlaylists.getState().playlists.some((p) => p.id === id)).toBe(false);
  });
});
