import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const vote = mutation({
  args: {
    presetId: v.id("presets"),
    vote: v.union(v.literal(1), v.literal(-1)),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("presetVotes")
      .withIndex("by_user_preset", (q) => q.eq("userId", user._id).eq("presetId", args.presetId))
      .first();

    if (existing) {
      if (existing.vote === args.vote) {
        // Toggle off
        await ctx.db.delete(existing._id);
        return null;
      }
      // Switch vote
      await ctx.db.patch(existing._id, { vote: args.vote });
      return args.vote;
    }

    await ctx.db.insert("presetVotes", {
      userId: user._id,
      presetId: args.presetId,
      vote: args.vote,
    });
    return args.vote;
  },
});

export const getMyVote = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    if (!user) return null;

    const vote = await ctx.db
      .query("presetVotes")
      .withIndex("by_user_preset", (q) => q.eq("userId", user._id).eq("presetId", args.presetId))
      .first();

    return vote?.vote ?? null;
  },
});

export const getVoteSummary = query({
  args: { presetId: v.id("presets") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("presetVotes")
      .withIndex("by_preset", (q) => q.eq("presetId", args.presetId))
      .collect();

    let upvotes = 0;
    let downvotes = 0;
    for (const v of votes) {
      if (v.vote === 1) upvotes++;
      else downvotes++;
    }

    let userVote: 1 | -1 | null = null;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .first();
      if (user) {
        const myVote = votes.find((v) => v.userId === user._id);
        userVote = (myVote?.vote as 1 | -1) ?? null;
      }
    }

    return { upvotes, downvotes, userVote };
  },
});
