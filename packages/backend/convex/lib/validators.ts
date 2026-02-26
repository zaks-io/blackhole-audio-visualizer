import { v } from "convex/values";

export const presetParameterValidator = v.object({
  path: v.string(),
  value: v.number(),
  duration: v.number(),
  ease: v.string(),
});

export const compositionPlanValidator = v.object({
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
});
