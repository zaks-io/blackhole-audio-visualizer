import { PARAMS } from "./visualizationParameters";

type AnalysisInput = {
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
  parameterImportance?: Array<{ param: string; correlation: number }>;
};

/**
 * Build vote guidance dynamically with random sampling for diversity.
 * Randomly selects up to 3 clusters and 3 anti-patterns each call,
 * using directional language instead of exact values.
 */
export function buildVoteGuidance(analysis: AnalysisInput): string {
  const seed = Math.random().toString(36).slice(2, 8);
  const lines: string[] = [];

  lines.push(`## Audience Taste Notes (Soft Guidance — seed: ${seed})`);
  lines.push(
    "The following are loose patterns from audience voting. Treat as background inspiration, NOT templates."
  );
  lines.push(
    "Never copy exact parameter values. The majority of presets should explore NEW combinations."
  );

  // Show important params if available
  if (analysis.parameterImportance && analysis.parameterImportance.length > 0) {
    const importantNames = analysis.parameterImportance.slice(0, 6).map((p) => {
      const shortName = p.param.split(".")[1] ?? p.param;
      const dir = p.correlation > 0 ? "higher values preferred" : "lower values preferred";
      return `${shortName} (${dir})`;
    });
    lines.push("");
    lines.push(`**Parameters audiences care about:** ${importantNames.join(", ")}`);
  }

  // Randomly sample up to 3 good clusters
  const good = analysis.clusters
    .filter((c) => c.avgScore > 0 && c.size >= 3)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  if (good.length > 0) {
    lines.push("");
    lines.push("### A few liked patterns (for loose inspiration only)");
    for (const cluster of good) {
      lines.push(`**"${cluster.label}" (${cluster.size} presets, avg score ${cluster.avgScore})**`);
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

  // Randomly sample up to 3 anti-patterns
  const bad = [...analysis.antiPatterns].sort(() => Math.random() - 0.5).slice(0, 3);

  if (bad.length > 0) {
    lines.push("");
    lines.push("### Combinations to avoid");
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

  return lines.join("\n");
}
