import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    nickname: v.optional(v.string()),
    picture: v.optional(v.string()),
  }).index("by_token_identifier", ["tokenIdentifier"]),

  presets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    colorPalette: v.string(),
    parameters: v.array(
      v.object({
        path: v.string(),
        value: v.number(),
        duration: v.number(),
        ease: v.string(),
      })
    ),
    cameraMode: v.optional(v.string()),
    isPublic: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_public", ["isPublic"]),

  playlists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    items: v.array(
      v.object({
        presetId: v.id("presets"),
        waitDuration: v.optional(v.number()),
      })
    ),
    cameraPresets: v.optional(
      v.array(
        v.object({
          mode: v.string(),
          duration: v.optional(v.number()),
        })
      )
    ),
    defaultCameraDuration: v.optional(v.number()),
    shuffle: v.boolean(),
    defaultWaitDuration: v.number(),
    isPublic: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_public", ["isPublic"]),

  recordings: defineTable({
    r2SourceKey: v.string(),
    r2HlsPath: v.optional(v.string()),
    r2ThumbnailPath: v.optional(v.string()),
    transcodingStatus: v.union(
      v.literal("uploaded"),
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    coconutJobId: v.optional(v.string()),
    transcodingError: v.optional(v.string()),
    webhookToken: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    mimeType: v.string(),
    fileSize: v.number(),
    duration: v.optional(v.number()),
    uploadedBy: v.id("users"),
    downloadCount: v.number(),
  }).index("by_webhook_token", ["webhookToken"]),

  releases: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    platform: v.union(v.literal("windows"), v.literal("macos")),
    version: v.string(),
    isLatest: v.boolean(),
    uploadedBy: v.id("users"),
    downloadCount: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_platform_latest", ["platform", "isLatest"])
    .index("by_platform_version", ["platform", "version"]),

  compositions: defineTable({
    positive_global_styles: v.array(v.string()),
    negative_global_styles: v.array(v.string()),
    sections: v.array(
      v.object({
        section_name: v.string(),
        positive_local_styles: v.array(v.string()),
        negative_local_styles: v.array(v.string()),
        duration_ms: v.number(),
        lines: v.array(v.string()),
      })
    ),
  }),

  generatedSongs: defineTable({
    userId: v.id("users"),
    name: v.string(),
    storageId: v.optional(v.id("_storage")),
    durationMs: v.optional(v.number()),
    compositionId: v.optional(v.id("compositions")),
    status: v.union(
      v.literal("ready"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    threadId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"])
    .index("by_status", ["status"]),

  transcriptions: defineTable({
    songId: v.id("generatedSongs"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    languageCode: v.optional(v.string()),
    languageProbability: v.optional(v.number()),
    text: v.optional(v.string()),
    words: v.optional(
      v.array(
        v.object({
          text: v.string(),
          start: v.union(v.number(), v.null()),
          end: v.union(v.number(), v.null()),
          type: v.union(v.literal("word"), v.literal("spacing"), v.literal("audio_event")),
          speakerId: v.optional(v.union(v.string(), v.null())),
        })
      )
    ),
    error: v.optional(v.string()),
  })
    .index("by_song", ["songId"])
    .index("by_status", ["status"]),

  scenes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    songId: v.id("generatedSongs"),
    playlistId: v.id("playlists"),
    isPublic: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_public", ["isPublic"])
    .index("by_playlist", ["playlistId"])
    .index("by_song", ["songId"]),

  sceneConversations: defineTable({
    sceneId: v.optional(v.id("scenes")), // Optional because thread may exist before scene is saved
    threadId: v.string(), // Convex Agent SDK thread ID
    title: v.optional(v.string()),
  })
    .index("by_scene", ["sceneId"])
    .index("by_thread", ["threadId"]),

  presetVotes: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
    vote: v.number(), // 1 or -1
  })
    .index("by_user_preset", ["userId", "presetId"])
    .index("by_preset", ["presetId"]),

  presetAnalysis: defineTable({
    totalVotes: v.number(),
    upvotes: v.number(),
    downvotes: v.number(),
    presetsAnalyzed: v.number(),
    promptFragment: v.string(),
    clusters: v.array(
      v.object({
        label: v.string(),
        size: v.number(),
        avgScore: v.number(),
        centroid: v.array(
          v.object({
            param: v.string(),
            value: v.number(),
          })
        ),
        topPalettes: v.array(v.string()),
        topCameraModes: v.array(v.string()),
      })
    ),
    antiPatterns: v.array(
      v.object({
        description: v.string(),
        params: v.array(
          v.object({
            param: v.string(),
            range: v.string(),
          })
        ),
        avgScore: v.number(),
      })
    ),
    parameterImportance: v.optional(
      v.array(
        v.object({
          param: v.string(),
          correlation: v.number(),
        })
      )
    ),
  }),
});
