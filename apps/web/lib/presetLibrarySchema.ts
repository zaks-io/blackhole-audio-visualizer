import { z } from "zod";
import { COLOR_PALETTES, PARAMS } from "./visualizationParameters";

const duration = z.number().nonnegative();
const cameraMode = z.enum(["free", "circle", "closeup", "orbit", "edge"]);
const ease = z.enum([
  "none",
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "power3.in",
  "power3.out",
  "power3.inOut",
  "power4.in",
  "power4.out",
  "power4.inOut",
  "back.in",
  "back.out",
  "back.inOut",
  "elastic.out",
  "bounce.out",
]);

export const libraryPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  colorPalette: z.enum(COLOR_PALETTES),
  parameters: z
    .array(
      z.object({
        path: z
          .string()
          .refine((path) => Object.hasOwn(PARAMS, path), "Unknown visualization parameter"),
        value: z.number(),
        duration,
        ease,
      })
    )
    .refine(
      (parameters) => new Set(parameters.map((p) => p.path)).size === parameters.length,
      "Duplicate visualization parameter"
    ),
  cameraMode: cameraMode.optional(),
});

export const libraryPlaylistSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  items: z
    .array(z.object({ presetId: z.string().min(1), waitDuration: duration.optional() }))
    .refine(
      (items) => new Set(items.map((item) => item.presetId)).size === items.length,
      "Duplicate playlist entry"
    ),
  cameraPresets: z.array(z.object({ mode: cameraMode, duration: duration.optional() })).optional(),
  defaultCameraDuration: duration.optional(),
  shuffle: z.boolean(),
  defaultWaitDuration: duration,
});

export const presetLibrarySchema = z
  .object({
    version: z.literal(1),
    presets: z.array(libraryPresetSchema),
    playlists: z.array(libraryPlaylistSchema),
  })
  .superRefine((library, ctx) => {
    for (const collection of ["presets", "playlists"] as const) {
      const ids = library[collection].map((entry) => entry.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate ${collection} IDs`,
          path: [collection],
        });
      }
    }
  });
