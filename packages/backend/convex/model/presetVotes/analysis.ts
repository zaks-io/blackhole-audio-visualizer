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

export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }
  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

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
    parameterImportance: v.optional(
      v.array(v.object({ param: v.string(), correlation: v.number() }))
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

    if (presets.length < 20) return; // Need enough data for meaningful clustering

    // 3. Build normalized parameter values and scores
    const paramNames = USER_PARAMS.map(([name]) => name);
    const paramDefs = USER_PARAMS.map(([, def]) => def);

    const presetMeta: Array<{
      id: string;
      score: number;
      palette: string;
      camera: string;
    }> = [];
    // Normalized parameter values per preset (rows = presets, cols = params)
    const normalizedParams: number[][] = [];

    for (const preset of presets) {
      const score = scoreMap.get(preset._id);
      if (score === undefined) continue;

      const paramMap = new Map(preset.parameters.map((p) => [p.path, p.value]));
      const row: number[] = [];

      for (let i = 0; i < paramNames.length; i++) {
        const def = paramDefs[i];
        const raw = paramMap.get(paramNames[i]) ?? def.default;
        const range = def.max - def.min;
        row.push(range > 0 ? (raw - def.min) / range : 0);
      }

      normalizedParams.push(row);
      presetMeta.push({
        id: preset._id,
        score,
        palette: preset.colorPalette,
        camera: preset.cameraMode ?? "circle",
      });
    }

    const scores = presetMeta.map((m) => m.score);

    // 4. Compute per-parameter importance (Pearson correlation with vote score)
    const parameterImportance: Array<{ param: string; correlation: number }> = [];
    for (let i = 0; i < paramNames.length; i++) {
      const values = normalizedParams.map((row) => row[i]);
      const r = pearsonCorrelation(values, scores);
      if (Math.abs(r) > 0.1) {
        parameterImportance.push({
          param: paramNames[i],
          correlation: Math.round(r * 1000) / 1000,
        });
      }
    }
    parameterImportance.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    // 5. Build feature vectors for clustering using only significant params + categoricals
    const significantIndices = parameterImportance.map((p) => paramNames.indexOf(p.param));
    // Fall back to all params if nothing is significant yet
    const clusterParamIndices =
      significantIndices.length >= 3 ? significantIndices : paramNames.map((_, i) => i);

    // Collect unique palettes and camera modes for one-hot encoding
    const paletteSet = new Set<string>();
    const cameraSet = new Set<string>();
    for (const m of presetMeta) {
      paletteSet.add(m.palette);
      cameraSet.add(m.camera);
    }
    const paletteList = [...paletteSet].sort();
    const cameraList = [...cameraSet].sort();
    const categoricalWeight = 2 / Math.max(paletteList.length, 1);
    const cameraWeight = 2 / Math.max(cameraList.length, 1);

    const featureVectors: number[][] = [];
    for (let p = 0; p < normalizedParams.length; p++) {
      const vector: number[] = [];
      for (const idx of clusterParamIndices) {
        vector.push(normalizedParams[p][idx]);
      }
      // One-hot palette
      for (const pal of paletteList) {
        vector.push(presetMeta[p].palette === pal ? categoricalWeight : 0);
      }
      // One-hot camera
      for (const cam of cameraList) {
        vector.push(presetMeta[p].camera === cam ? cameraWeight : 0);
      }
      featureVectors.push(vector);
    }

    // 6. Run k-means
    const k = Math.min(5, Math.floor(featureVectors.length / 3));
    if (k < 1) return;

    const result = kmeans(featureVectors, k, {
      maxIterations: 100,
      initialization: "kmeans++",
    });

    // 7. Build cluster stats (using significant params for centroids)
    const clusters: Array<{
      label: string;
      size: number;
      avgScore: number;
      centroid: Array<{ param: string; value: number }>;
      topPalettes: string[];
      topCameraModes: string[];
    }> = [];

    // Global mean of significant params for anti-pattern detection
    const globalMean = new Array(clusterParamIndices.length).fill(0);
    for (const vec of featureVectors) {
      for (let i = 0; i < clusterParamIndices.length; i++) {
        globalMean[i] += vec[i];
      }
    }
    for (let i = 0; i < clusterParamIndices.length; i++) {
      globalMean[i] /= featureVectors.length;
    }

    for (let c = 0; c < k; c++) {
      const memberIndices: number[] = [];
      for (let i = 0; i < result.clusters.length; i++) {
        if (result.clusters[i] === c) memberIndices.push(i);
      }

      if (memberIndices.length === 0) continue;

      let scoreSum = 0;
      for (const idx of memberIndices) {
        scoreSum += presetMeta[idx].score;
      }
      const avgScore = scoreSum / memberIndices.length;

      // Denormalize centroid — only significant params
      const rawCentroid = result.centroids[c];
      const centroid: Array<{ param: string; value: number }> = [];
      const deviations: Array<{ param: string; value: number; deviation: number }> = [];

      for (let i = 0; i < clusterParamIndices.length; i++) {
        const origIdx = clusterParamIndices[i];
        const def = paramDefs[origIdx];
        const normalizedValue = rawCentroid[i];
        const realValue = normalizedValue * (def.max - def.min) + def.min;
        const rounded = Math.round(realValue / def.step) * def.step;
        const defaultNorm = (def.default - def.min) / (def.max - def.min || 1);
        const deviation = Math.abs(normalizedValue - defaultNorm);

        centroid.push({ param: paramNames[origIdx], value: rounded });
        deviations.push({ param: paramNames[origIdx], value: rounded, deviation });
      }

      deviations.sort((a, b) => b.deviation - a.deviation);
      const topParams = deviations.slice(0, 3);
      const label = topParams
        .map((d) => {
          const shortName = d.param.split(".")[1] ?? d.param;
          return `${shortName}=${d.value}`;
        })
        .join(", ");

      const paletteCounts = new Map<string, number>();
      const cameraCounts = new Map<string, number>();
      for (const idx of memberIndices) {
        const pal = presetMeta[idx].palette;
        paletteCounts.set(pal, (paletteCounts.get(pal) ?? 0) + 1);
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

    // 8. Filter out tiny clusters — not real patterns
    const filteredClusters = clusters.filter((c) => c.size >= 3);

    // 9. Anti-patterns: clusters with avgScore < 0
    const antiPatterns: Array<{
      description: string;
      params: Array<{ param: string; range: string }>;
      avgScore: number;
    }> = [];

    for (const cluster of filteredClusters) {
      if (cluster.avgScore >= 0) continue;

      const deviatingParams: Array<{ param: string; range: string }> = [];
      for (let i = 0; i < clusterParamIndices.length; i++) {
        const origIdx = clusterParamIndices[i];
        const def = paramDefs[origIdx];
        const centroidEntry = cluster.centroid.find((ce) => ce.param === paramNames[origIdx]);
        if (!centroidEntry) continue;

        const centroidNorm = (centroidEntry.value - def.min) / (def.max - def.min || 1);
        const diff = Math.abs(centroidNorm - globalMean[i]);
        if (diff > 0.2) {
          deviatingParams.push({
            param: paramNames[origIdx],
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

    // 10. Generate prompt fragment
    const promptFragment = generatePromptFragment({
      totalVotes: votes.length,
      presetsAnalyzed: presets.length,
      clusters: filteredClusters,
      antiPatterns,
      parameterImportance,
    });

    // 11. Upsert analysis
    await ctx.runMutation(internal.model.presetVotes.analysis.upsertAnalysis, {
      totalVotes: votes.length,
      upvotes: totalUpvotes,
      downvotes: totalDownvotes,
      presetsAnalyzed: presets.length,
      promptFragment,
      clusters: filteredClusters,
      antiPatterns,
      parameterImportance,
    });
  },
});

export function generatePromptFragment(data: {
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
  parameterImportance: Array<{ param: string; correlation: number }>;
}): string {
  const lines: string[] = [];
  lines.push(
    `## Preset Quality Insights (based on ${data.totalVotes} votes across ${data.presetsAnalyzed} presets)`
  );

  // Show which parameters matter
  if (data.parameterImportance.length > 0) {
    lines.push("");
    lines.push(
      "### Parameters that matter most: " +
        data.parameterImportance
          .slice(0, 8)
          .map((p) => {
            const shortName = p.param.split(".")[1] ?? p.param;
            return shortName;
          })
          .join(", ")
    );
  }

  const good = data.clusters.filter((c) => c.avgScore > 0).sort((a, b) => b.avgScore - a.avgScore);

  if (good.length > 0) {
    lines.push("");
    lines.push("### Preferred Combinations (from high-rated presets)");
    for (const cluster of good) {
      lines.push(
        `**"${cluster.label}" pattern (${cluster.size} presets, avg score ${cluster.avgScore})**`
      );

      for (const c of cluster.centroid) {
        const def = PARAMS[c.param];
        if (!def) continue;
        const range = def.max - def.min;
        if (range === 0) continue;
        const defaultNorm = (def.default - def.min) / range;
        const valueNorm = (c.value - def.min) / range;
        if (Math.abs(valueNorm - defaultNorm) > 0.2) {
          const direction = valueNorm > defaultNorm ? "higher than default" : "lower than default";
          const intensity = Math.abs(valueNorm - defaultNorm) > 0.5 ? "much " : "somewhat ";
          const shortName = c.param.split(".")[1] ?? c.param;
          lines.push(`- ${shortName}: tends ${intensity}${direction}`);
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
        const def = PARAMS[p.param];
        const shortName = p.param.split(".")[1] ?? p.param;
        if (def) {
          const approxValue = parseFloat(p.range.replace("~", ""));
          const range = def.max - def.min;
          const valueNorm = range > 0 ? (approxValue - def.min) / range : 0.5;
          const region = valueNorm < 0.33 ? "low" : valueNorm > 0.66 ? "high" : "mid-range";
          lines.push(`- ${shortName} in the ${region} range`);
        } else {
          lines.push(`- ${shortName}: ${p.range}`);
        }
      }
    }
  }

  lines.push("");
  lines.push(
    "These are weak signals from a small sample. Prioritize creating a diverse, surprising playlist over matching these patterns."
  );

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
