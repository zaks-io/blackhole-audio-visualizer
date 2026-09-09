import { describe, expect, it } from "vitest";
import { mergeLibraryEntries, presetLibrary } from "../presetLibrary";
import { libraryPresetSchema, presetLibrarySchema } from "../presetLibrarySchema";

const preset = presetLibrary.presets[0];

describe("bundled preset library", () => {
  it("contains valid presets using the current renderer", () => {
    expect(presetLibrary.presets.length).toBeGreaterThan(0);
    expect(presetLibrarySchema.safeParse(presetLibrary).success).toBe(true);
  });

  it("rejects unsupported parameters, palettes, and nonfinite values", () => {
    expect(libraryPresetSchema.safeParse({ ...preset, colorPalette: "missing" }).success).toBe(
      false
    );
    const parameter = preset.parameters[0];
    for (const change of [{ path: "Unknown.parameter" }, { value: NaN }, { duration: -1 }]) {
      expect(
        libraryPresetSchema.safeParse({ ...preset, parameters: [{ ...parameter, ...change }] })
          .success
      ).toBe(false);
    }
  });

  it("rejects ambiguous duplicate IDs", () => {
    expect(
      presetLibrarySchema.safeParse({ version: 1, presets: [preset, preset], playlists: [] })
        .success
    ).toBe(false);
  });
});

describe("bundled updates and local edits", () => {
  it("takes new bundled values while preserving edits, additions, and deletions", () => {
    const updated = { ...preset, name: "New bundled name" };
    const edited = { ...preset, id: "edited", name: "Local edit" };
    const added = { ...preset, id: "added" };
    const bundled = [updated, { ...edited, name: "Bundled edit" }, { ...preset, id: "deleted" }];
    expect(mergeLibraryEntries(bundled, [edited, added], ["deleted"])).toEqual([
      updated,
      edited,
      added,
    ]);
    expect(bundled).toHaveLength(3);
  });
});
