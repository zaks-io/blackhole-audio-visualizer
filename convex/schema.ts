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
    isPublic: v.boolean(),
    createdAt: v.number(),
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
    shuffle: v.boolean(),
    defaultWaitDuration: v.number(),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_public", ["isPublic"]),
});
