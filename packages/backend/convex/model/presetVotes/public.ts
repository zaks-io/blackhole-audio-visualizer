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

    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");

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

const UPVOTE_WEIGHT = 3;
const MAX_PRESET_IDS = 500;

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedShuffle<T>(items: T[], weights: number[], rand: () => number): T[] {
  const result: T[] = [];
  const remaining = items.map((item, i) => ({ item, weight: weights[i] }));

  while (remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, r) => sum + r.weight, 0);
    let pick = rand() * totalWeight;
    let idx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      pick -= remaining[i].weight;
      if (pick <= 0) {
        idx = i;
        break;
      }
    }
    result.push(remaining[idx].item);
    remaining.splice(idx, 1);
  }

  return result;
}

export const getShuffledPresetsForLucky = query({
  args: {
    presetIds: v.array(v.id("presets")),
    seed: v.number(),
  },
  handler: async (ctx, args) => {
    const presetIds = args.presetIds.slice(0, MAX_PRESET_IDS);
    if (presetIds.length === 0) return [];

    const voteMap = new Map<string, number>();

    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .first();

      if (user) {
        const votes = await ctx.db
          .query("presetVotes")
          .withIndex("by_user_preset", (q) => q.eq("userId", user._id))
          .collect();

        for (const vote of votes) {
          if (vote.vote === 1 || vote.vote === -1) {
            voteMap.set(String(vote.presetId), vote.vote);
          }
        }
      }
    }

    let candidates = presetIds.filter((id) => voteMap.get(String(id)) !== -1);
    if (candidates.length === 0) {
      candidates = [...presetIds];
    }

    const weights = candidates.map((id) => (voteMap.get(String(id)) === 1 ? UPVOTE_WEIGHT : 1));

    const rand = mulberry32(args.seed);
    return weightedShuffle(candidates, weights, rand);
  },
});
