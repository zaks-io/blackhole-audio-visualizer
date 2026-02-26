import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { PARAMS } from "../../lib/visualizationParameters";
import { kmeans } from "ml-kmeans";
import { requireAdmin } from "../../lib/auth";

// User-facing params only (system: false)
const USER_PARAMS = Object.entries(PARAMS).filter(([, p]) => !p.system);

// ─── Internal Queries ────────────────────────────────────────────────────────

export const getAllVotes = internalQuery({
  handler: async (ctx) => {
    const votes = await ctx.db.query("presetVotes").collect();
    return votes.map((v) => ({ presetId: v.presetId, vote: v.vote }));
  },
});

export const getPresetBatch = internalQuery({
  args: { ids: v.array(v.id("presets")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const preset = await ctx.db.get(id);
      if (preset) {
        results.push({
          _id: preset._id,
          parameters: preset.parameters,
          colorPalette: preset.colorPalette,
          cameraMode: preset.cameraMode,
        });
      }
    }
    return results;
  },
});

export const upsertAnalysis = internalMutation({
  args: {
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
        centroid: v.array(v.object({ param: v.string(), value: v.number() })),
        topPalettes: v.array(v.string()),
        topCameraModes: v.array(v.string()),
      })
    ),
    antiPatterns: v.array(
      v.object({
        description: v.string(),
        params: v.array(v.object({ param: v.string(), range: v.string() })),
        avgScore: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete any existing analysis rows
    const existing = await ctx.db.query("presetAnalysis").collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.insert("presetAnalysis", args);
  },
});

// ─── Analysis Action ─────────────────────────────────────────────────────────

export const runAnalysis = internalAction({
  handler: async (ctx) => {
    // 1. Fetch all votes
    const votes: Array<{ presetId: Id<"presets">; vote: number }> = await ctx.runQuery(
      internal.model.presetVotes.analysis.getAllVotes
    );

    if (votes.length === 0) return;

    // Aggregate into net scores per preset
    const scoreMap = new Map<string, number>();
    let totalUpvotes = 0;
    let totalDownvotes = 0;

    for (const v of votes) {
      const current = scoreMap.get(v.presetId) ?? 0;
      scoreMap.set(v.presetId, current + v.vote);
      if (v.vote === 1) totalUpvotes++;
      else totalDownvotes++;
    }

    // Cap at 1000 most-voted presets
    let presetIds: Id<"presets">[] = [...scoreMap.keys()] as Id<"presets">[];
    if (presetIds.length > 1000) {
      presetIds.sort((a, b) => Math.abs(scoreMap.get(b)!) - Math.abs(scoreMap.get(a)!));
      presetIds = presetIds.slice(0, 1000);
    }

    // 2. Batch-fetch presets (100 at a time)
    type PresetData = {
      _id: Id<"presets">;
      parameters: Array<{ path: string; value: number }>;
      colorPalette: string;
      cameraMode?: string;
    };

    const presets: PresetData[] = [];
    for (let i = 0; i < presetIds.length; i += 100) {
      const batch = presetIds.slice(i, i + 100);
      const results: PresetData[] = await ctx.runQuery(
        internal.model.presetVotes.analysis.getPresetBatch,
        { ids: batch }
      );
      presets.push(...results);
    }

    if (presets.length < 3) return; // Need minimum data for clustering

    // 3. Build feature vectors (normalized 0-1)
    const paramNames = USER_PARAMS.map(([name]) => name);
    const paramDefs = USER_PARAMS.map(([, def]) => def);

    // Collect unique palettes and camera modes for one-hot encoding
    const paletteSet = new Set<string>();
    const cameraSet = new Set<string>();
    for (const preset of presets) {
      paletteSet.add(preset.colorPalette);
      cameraSet.add(preset.cameraMode ?? "circle");
    }
    const paletteList = [...paletteSet].sort();
    const cameraList = [...cameraSet].sort();
    // Weight categorical dimensions so they contribute without dominating
    // Each one-hot group sums to this weight (equivalent to ~2 numerical params)
    const categoricalWeight = 2 / Math.max(paletteList.length, 1);
    const cameraWeight = 2 / Math.max(cameraList.length, 1);

    const featureVectors: number[][] = [];
    const presetMeta: Array<{
      id: string;
      score: number;
      palette: string;
      camera: string;
    }> = [];

    for (const preset of presets) {
      const score = scoreMap.get(preset._id);
      if (score === undefined) continue;

      const paramMap = new Map(preset.parameters.map((p) => [p.path, p.value]));
      const vector: number[] = [];

      for (let i = 0; i < paramNames.length; i++) {
        const def = paramDefs[i];
        const raw = paramMap.get(paramNames[i]) ?? def.default;
        const range = def.max - def.min;
        vector.push(range > 0 ? (raw - def.min) / range : 0);
      }

      // One-hot encode colorPalette
      for (const p of paletteList) {
        vector.push(preset.colorPalette === p ? categoricalWeight : 0);
      }

      // One-hot encode cameraMode
      const cam = preset.cameraMode ?? "circle";
      for (const c of cameraList) {
        vector.push(cam === c ? cameraWeight : 0);
      }

      featureVectors.push(vector);
      presetMeta.push({
        id: preset._id,
        score,
        palette: preset.colorPalette,
        camera: preset.cameraMode ?? "circle",
      });
    }

    // 4. Run k-means
    const k = Math.min(5, Math.floor(featureVectors.length / 3));
    if (k < 1) return;

    const result = kmeans(featureVectors, k, {
      maxIterations: 100,
      initialization: "kmeans++",
    });

    // 5. Build cluster stats
    const clusters: Array<{
      label: string;
      size: number;
      avgScore: number;
      centroid: Array<{ param: string; value: number }>;
      topPalettes: string[];
      topCameraModes: string[];
    }> = [];

    // Compute global mean for anti-pattern detection (numerical params only)
    const globalMean = new Array(paramNames.length).fill(0);
    for (const vec of featureVectors) {
      for (let i = 0; i < paramNames.length; i++) {
        globalMean[i] += vec[i];
      }
    }
    for (let i = 0; i < paramNames.length; i++) {
      globalMean[i] /= featureVectors.length;
    }

    for (let c = 0; c < k; c++) {
      const memberIndices: number[] = [];
      for (let i = 0; i < result.clusters.length; i++) {
        if (result.clusters[i] === c) memberIndices.push(i);
      }

      if (memberIndices.length === 0) continue;

      // Avg score
      let scoreSum = 0;
      for (const idx of memberIndices) {
        scoreSum += presetMeta[idx].score;
      }
      const avgScore = scoreSum / memberIndices.length;

      // Denormalize centroid
      const rawCentroid = result.centroids[c];
      const centroid: Array<{ param: string; value: number }> = [];
      const deviations: Array<{ param: string; value: number; deviation: number }> = [];

      for (let i = 0; i < paramNames.length; i++) {
        const def = paramDefs[i];
        const normalizedValue = rawCentroid[i];
        const realValue = normalizedValue * (def.max - def.min) + def.min;
        // Round to step precision
        const rounded = Math.round(realValue / def.step) * def.step;
        const defaultNorm = (def.default - def.min) / (def.max - def.min || 1);
        const deviation = Math.abs(normalizedValue - defaultNorm);

        centroid.push({ param: paramNames[i], value: rounded });
        deviations.push({ param: paramNames[i], value: rounded, deviation });
      }

      // Top 3 deviating params for label
      deviations.sort((a, b) => b.deviation - a.deviation);
      const topParams = deviations.slice(0, 3);
      const label = topParams
        .map((d) => {
          const shortName = d.param.split(".")[1] ?? d.param;
          return `${shortName}=${d.value}`;
        })
        .join(", ");

      // Count palettes and camera modes
      const paletteCounts = new Map<string, number>();
      const cameraCounts = new Map<string, number>();
      for (const idx of memberIndices) {
        const p = presetMeta[idx].palette;
        paletteCounts.set(p, (paletteCounts.get(p) ?? 0) + 1);
        const cam = presetMeta[idx].camera;
        cameraCounts.set(cam, (cameraCounts.get(cam) ?? 0) + 1);
      }

      const topPalettes = [...paletteCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      const topCameraModes = [...cameraCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      clusters.push({
        label,
        size: memberIndices.length,
        avgScore: Math.round(avgScore * 100) / 100,
        centroid,
        topPalettes,
        topCameraModes,
      });
    }

    // 6. Anti-patterns: clusters with avgScore < 0
    const antiPatterns: Array<{
      description: string;
      params: Array<{ param: string; range: string }>;
      avgScore: number;
    }> = [];

    for (const cluster of clusters) {
      if (cluster.avgScore >= 0) continue;

      // Find params deviating most from global mean
      const rawCentroidForCluster = cluster.centroid;
      const deviatingParams: Array<{ param: string; range: string }> = [];

      for (let i = 0; i < paramNames.length; i++) {
        const def = paramDefs[i];
        const centroidEntry = rawCentroidForCluster.find((c) => c.param === paramNames[i]);
        if (!centroidEntry) continue;

        const centroidNorm = (centroidEntry.value - def.min) / (def.max - def.min || 1);
        const diff = Math.abs(centroidNorm - globalMean[i]);
        if (diff > 0.2) {
          deviatingParams.push({
            param: paramNames[i],
            range: `~${centroidEntry.value}`,
          });
        }
      }

      if (deviatingParams.length > 0) {
        antiPatterns.push({
          description: `Disliked: ${cluster.label}`,
          params: deviatingParams.slice(0, 5),
          avgScore: cluster.avgScore,
        });
      }
    }

    // 7. Generate prompt fragment
    const promptFragment = generatePromptFragment({
      totalVotes: votes.length,
      presetsAnalyzed: presets.length,
      clusters,
      antiPatterns,
    });

    // 8. Upsert analysis
    await ctx.runMutation(internal.model.presetVotes.analysis.upsertAnalysis, {
      totalVotes: votes.length,
      upvotes: totalUpvotes,
      downvotes: totalDownvotes,
      presetsAnalyzed: presets.length,
      promptFragment,
      clusters,
      antiPatterns,
    });
  },
});

function generatePromptFragment(data: {
  totalVotes: number;
  presetsAnalyzed: number;
  clusters: Array<{
    label: string;
    size: number;
    avgScore: number;
    centroid: Array<{ param: string; value: number }>;
    topPalettes: string[];
    topCameraModes: string[];
  }>;
  antiPatterns: Array<{
    description: string;
    params: Array<{ param: string; range: string }>;
    avgScore: number;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(
    `## Preset Quality Insights (based on ${data.totalVotes} votes across ${data.presetsAnalyzed} presets)`
  );

  const good = data.clusters.filter((c) => c.avgScore > 0).sort((a, b) => b.avgScore - a.avgScore);

  if (good.length > 0) {
    lines.push("");
    lines.push("### Preferred Combinations (from high-rated presets)");
    for (const cluster of good) {
      lines.push(
        `**"${cluster.label}" pattern (${cluster.size} presets, avg score ${cluster.avgScore})**`
      );

      // Show centroid params that deviate >20% from default
      for (const c of cluster.centroid) {
        const def = PARAMS[c.param];
        if (!def) continue;
        const range = def.max - def.min;
        if (range === 0) continue;
        const defaultNorm = (def.default - def.min) / range;
        const valueNorm = (c.value - def.min) / range;
        if (Math.abs(valueNorm - defaultNorm) > 0.2) {
          lines.push(`- ${c.param}: ${c.value}`);
        }
      }

      if (cluster.topPalettes.length > 0) {
        lines.push(`- Palettes: ${cluster.topPalettes.join(", ")}`);
      }
      if (cluster.topCameraModes.length > 0) {
        lines.push(`- Camera: ${cluster.topCameraModes.join(", ")}`);
      }
    }
  }

  const bad = data.antiPatterns;
  if (bad.length > 0) {
    lines.push("");
    lines.push("### Combinations to Avoid (from low-rated presets)");
    for (const pattern of bad) {
      lines.push(`**${pattern.description} (avg score ${pattern.avgScore})**`);
      for (const p of pattern.params) {
        lines.push(`- ${p.param}: ${p.range}`);
      }
    }
  }

  lines.push("");
  lines.push("Use these insights to bias toward preferred patterns while still being creative.");

  return lines.join("\n");
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const triggerAnalysis = action({
  handler: async (ctx) => {
    await requireAdmin(ctx);

    await ctx.scheduler.runAfter(0, internal.model.presetVotes.analysis.runAnalysis);
    return { triggered: true };
  },
});

export const getAnalysis = query({
  handler: async (ctx) => {
    return await ctx.db.query("presetAnalysis").first();
  },
});

export const getAnalysisInternal = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("presetAnalysis").first();
  },
});
