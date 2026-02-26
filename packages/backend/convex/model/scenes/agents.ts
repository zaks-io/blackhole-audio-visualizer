import { Agent, createTool } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, type GenerateObjectResult } from "ai";
import { components, internal } from "../../_generated/api";
import { z } from "zod";
import type { Id, Doc } from "../../_generated/dataModel";
import { presetSchema, parametersToArray } from "../../lib/visualizationParameters";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not set");
}

if (!process.env.TRACEFLOW_API_KEY) {
  throw new Error("TRACEFLOW_API_KEY is not set");
}

// Trace-flow utilities for LLM observability
// traceId: generated ONCE per user request, shared across all calls in workflow
// spanId: generated fresh for EACH LLM call
// operation: labels the type of call for filtering in trace-flow UI

export function generateTraceId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSpanId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createTraceHeaders(traceId: string, operation: string): Record<string, string> {
  const spanId = generateSpanId();
  return {
    "X-Trace-Flow-Api-Key": process.env.TRACEFLOW_API_KEY ?? "",
    traceparent: `00-${traceId}-${spanId}-01`,
    baggage: `operation=${operation}`,
  };
}

// Custom context type for trace propagation
export type TraceCtx = {
  traceId?: string;
};

// Initialize OpenRouter provider (routes through trace-flow gateway when API key is set)
// Note: headers are passed per-request, not globally, to support trace correlation
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: process.env.TRACEFLOW_API_KEY
    ? "https://gateway.trace-flow.dev/openrouter/v1"
    : undefined,
});

// Composition plan section schema for validation (using Zod)
const sectionSchema = z.object({
  section_name: z.string(),
  positive_local_styles: z.array(z.string()),
  negative_local_styles: z.array(z.string()),
  duration_ms: z.number(),
  lines: z.array(z.string()),
});

const compositionPlanSchema = z.object({
  positive_global_styles: z.array(z.string()),
  negative_global_styles: z.array(z.string()),
  sections: z.array(sectionSchema),
});

// Tool: Update composition plan in progress
const updateCompositionPlan = createTool({
  description:
    "Update the working composition plan with new sections, styles, or lyrics. Call this incrementally as you build the song structure with the user. The UI will display the current plan state.",
  args: compositionPlanSchema,
  handler: async (_ctx, args) => {
    // The tool result will be stored in the message and picked up by the UI
    return {
      action: "updateCompositionPlan",
      compositionPlan: args,
      totalDurationMs: args.sections.reduce((sum, s) => sum + s.duration_ms, 0),
    };
  },
});

// Tool: Show generate button in UI
const showGenerateSongButton = createTool({
  description:
    "Display a 'Generate Song' button in the chat UI. Call this ONLY when the composition plan is complete and the user has approved it. This signals to the UI that the song is ready to be generated. The user must click the button to start generation - you cannot generate songs directly.",
  args: z.object({
    compositionPlan: compositionPlanSchema,
    songTitle: z.string(),
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      throw new Error("Thread ID is required");
    }
    // Get user from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        action: "error",
        error: "Not authenticated",
      };
    }

    const user: { _id: Id<"users"> } | null = await ctx.runQuery(
      internal.model.users.server.getUserByToken,
      { tokenIdentifier: identity.tokenIdentifier as string }
    );

    if (!user) {
      return {
        action: "error",
        error: "User not found",
      };
    }

    // Save composition to compositions table first
    const compositionId: Id<"compositions"> = await ctx.runMutation(
      internal.model.generatedSongs.server.saveComposition,
      { compositionPlan: args.compositionPlan }
    );

    // Create song record with status "ready" and compositionId reference
    const songId: Id<"generatedSongs"> = await ctx.runMutation(
      internal.model.generatedSongs.server.createReadySong,
      {
        userId: user._id,
        name: args.songTitle,
        threadId: ctx.threadId,
        compositionId,
      }
    );

    const totalDurationMs = args.compositionPlan.sections.reduce(
      (sum, s) => sum + s.duration_ms,
      0
    );

    return {
      action: "showGenerateButton",
      songId: songId as string,
      songTitle: args.songTitle,
      totalDurationMs,
    };
  },
});

// Tool: Read composition plan from a song
const readCompositionPlan = createTool({
  description:
    "Read the composition plan from a song. Use the songId from the current scene context or provide one explicitly.",
  args: z.object({
    songId: z.string().describe("The ID of the song to read the composition from"),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    action: string;
    error?: string;
    songStatus?: string;
    compositionPlan?: {
      positive_global_styles: string[];
      negative_global_styles: string[];
      sections: Array<{
        section_name: string;
        positive_local_styles: string[];
        negative_local_styles: string[];
        duration_ms: number;
        lines: string[];
      }>;
    };
    totalDurationMs?: number;
  }> => {
    const song = await ctx.runQuery(internal.model.generatedSongs.server.getById, {
      songId: args.songId as Id<"generatedSongs">,
    });
    if (!song) return { action: "error", error: "Song not found" };
    if (!song.compositionId) return { action: "error", error: "Song has no composition" };

    const composition = await ctx.runQuery(
      internal.model.generatedSongs.server.getCompositionInternal,
      {
        compositionId: song.compositionId,
      }
    );
    if (!composition) return { action: "error", error: "Composition not found" };

    return {
      action: "readCompositionPlan",
      songStatus: song.status,
      compositionPlan: composition,
      totalDurationMs: composition.sections.reduce(
        (sum: number, s: { duration_ms: number }) => sum + s.duration_ms,
        0
      ),
    };
  },
});

// Tool: Update a saved composition plan (only for songs in "ready" status)
const updateSavedCompositionPlan = createTool({
  description:
    "Update a saved composition plan for a song in 'ready' status. Cannot modify compositions for songs already generated.",
  args: z.object({
    songId: z.string().describe("The ID of the song whose composition to update"),
    compositionPlan: compositionPlanSchema,
  }),
  handler: async (ctx, args) => {
    const song = await ctx.runQuery(internal.model.generatedSongs.server.getById, {
      songId: args.songId as Id<"generatedSongs">,
    });
    if (!song) return { action: "error", error: "Song not found" };
    if (song.status !== "ready") return { action: "error", error: "Song is not in ready status" };

    const compositionId: Id<"compositions"> = await ctx.runMutation(
      internal.model.generatedSongs.server.saveComposition,
      { compositionPlan: args.compositionPlan }
    );

    await ctx.runMutation(internal.model.generatedSongs.server.updateSongComposition, {
      songId: args.songId as Id<"generatedSongs">,
      compositionId,
    });

    return {
      action: "updateSavedCompositionPlan",
      compositionPlan: args.compositionPlan,
      totalDurationMs: args.compositionPlan.sections.reduce((sum, s) => sum + s.duration_ms, 0),
    };
  },
});

// System prompt for the scene agent
const SCENE_AGENT_INSTRUCTIONS = `You are a music producer and visualization designer for the Blackhole Audio Visualizer.

## WHAT YOU'RE CREATING

A "scene" consists of:
1. **Generated song**: AI-generated music based on a composition plan
2. **Visualization playlist**: Timed presets that control the particle simulation

The visualizer renders three orbitting black holes with particles emitting from configurable points. Particles orbit inward following physics. The system analyzes audio in realtime (beats, frequency bands) and uses that to drive particle emission, colors, and effects. Your presets define how the visualization responds to each section of the song.

## GENERAL WORKFLOW

1. **Understand**: Ask about mood, genre, theme, and feeling
2. **Structure**: Plan sections as needed (e.g. Intro, Verse, Pre-Chorus, Chorus, Bridge, Breakdown, Outro, etc.)
3. **Write**: Collaborate on lyrics or instrumental descriptions
4. **Style**: Define musical styles, instruments, production elements
5. **Refine**: Iterate until approved
6. **Generate**: Call showGenerateSongButton to generate the song - user must click to start. You will see a tool call with songId when the song is generated.
7. **Visualize**: After song completes, call generateVisualizationPlaylist
8. **Save**: Call createScene or updateScene with songId and playlistId
9. **Adjust Visualization**: Make any adjustments to the visualization presets or scene properties as needed.

## COMPOSITION RULES

- Section duration: 3,000-120,000ms (3s - 2min)
- Total song: 120,000-180,000ms (2-3 min)
- Lyric lines: max 200 characters
- Style descriptions in English
- NO copyrighted content, artist names, or song references

## STYLE KEYWORDS

**Genres**: electronic, ambient, synthwave, lo-fi, orchestral, rock, pop, hip-hop, jazz, classical
**Moods**: epic, calm, energetic, melancholic, uplifting, dark, ethereal, intense
**Instruments**: synth, piano, guitar, drums, bass, strings, brass, vocals, choir
**Production**: reverb, echo, distortion, clean, punchy, atmospheric, layered

## MUSIC GENERATION TIPS

- Include tempo and key for control: "130 BPM in A minor"
- Stems: use "solo" before instruments ("solo electric guitar", "solo piano in C minor")
- Isolated vocals: use "a cappella" ("a cappella female vocals, 90 BPM, soulful")
- Vocal delivery: "raw", "breathy", "aggressive", "glitching"
- Instrumentals: add "instrumental only"
- Multiple vocalists: "two singers harmonizing in C"
- Timing control: "lyrics begin at 15 seconds"
- More detail = more control

## SCENE NOTES

- Only owners can edit or delete scenes.

## PRESET ADJUSTMENT

After generating visualization, you can adjust individual presets:
- Use readPlaylistPresets to see all presets with their timing
- Use readPreset to see a specific preset's parameters in detail
- Use updatePreset to modify visual settings (colorPalette, parameters, cameraMode) or timing (waitDuration)

When the user asks to adjust the visualization:
1. First call readPlaylistPresets to see current state
2. Identify which preset(s) need changes
3. Call updatePreset with the new values

## IMPORTANT

- Consider how music syncs to the beat-reactive particle visualization
- Never reveal IDs to users, they are for your use only.
- Keep responses short and conversational. Only use markdown when necessary.`;

// System prompt for the visualization tool (used by generateObject)
// Parameter bounds are defined in the Zod schema - LLM sees them directly
const VISUALIZATION_INSTRUCTIONS = `You are a visualization designer for the Blackhole Audio Visualizer - a particle physics simulation synced to music. Particles are emitted from a circle around three black holes and orbit until they fall in. The emitters emit at different heights based on their frequency bin and so we get trails of particles with bursts to the beat that start as waves and then collapse into streams as they fall into the center.

Given a song's composition plan with sections, moods, and timing, create synchronized visualization presets for a song.

## COLOR PALETTES

Each pallete has 8 colors except for grayscale which is basically white.

**Default**: cool, warm, neon, sunset, ocean, grayscale

**Cosmic & Space**: nebula-dreams, aurora-borealis, cosmic-twilight, solar-flare, lunar-eclipse, galactic-core, starfield

**Retro & Synthwave**: synthwave-horizon, vaporwave, cyberpunk-city, miami-vice, retrowave-outrun, electric-arcade

**Nature & Elements**: deep-ocean, bioluminescence, volcanic-ember, autumn-forest, arctic-aurora, tropical-reef, forest-mist, desert-dusk

**Soft & Pastel**: cotton-candy, pastel-dreams, lavender-haze, rose-gold, bubblegum-pop

**Monochrome & Minimal**: midnight-blue, crimson-noir, emerald-depths, amber-glow

## CAMERA MODES
- "circle": Wide view, slow horizontal orbit
- "closeup": Near action, reverse orbit, intimate
- "orbit": Medium distance, vertical oscillation, 16s cycle
- "edge": Far side view, slow, cinematic

## EASING
none, power1.inOut, power2.inOut, power3.inOut, power4.inOut

## SECTION GUIDELINES

Be creative. Create 1 preset every 10-20 seconds, aligned with song structure and lyrics. Presets must cover the entire song duration and should be distinct from each other. Take into consideration tween times and transitions between presets for best impact.

### SECTION IDEAS & NOTES

- Large Black Hole, Small Emitter Radius, Large Point Size, High Reactivity = Mop of particles around a jumping ball
- Min emitters, tiny black holes, very small spread, high gravity, high decay, high amplitude, high beat repulsion => Particles fall into a tight orbit and the beat repulsion respawns them
- Emitters and black hole orbits at same radius => particles don't flow to the center but instead the nearest black hole or stretch across lagrange point
- Zero orbital decay, 1000000 gravity, ten softening => forces particles into tight orbits around each blackhole and then collapse into the center
- Use higher particles sizes when using more spread as they are harder to see spread out
- Do not repeat preset parameters, use a variety of values to keep the visualization interesting.
- Consider if a tween should start before or at a section
- Use smaller black hole orbits when using the closeup camera mode.

## MASS & POSITION DISTRIBUTION
With 3 black holes, masses are distributed as a gradient from massMax (1.0) to massMin:
- Black hole 1: mass ratio = 1.0 (largest)
- Black hole 2: mass ratio = 0.65 (when massMin=0.3)
- Black hole 3: mass ratio = massMin (smallest)

Positions are distributed around the barycenter (center of mass) based on mass:
- Heavier black holes orbit CLOSER to the barycenter
- Lighter black holes orbit FARTHER from the barycenter

As massMin lowers, the position/mass distribution becomes more asymmetric:
- massMin=1.0: Equal masses, symmetric orbits around center
- massMin=0.3: Highly asymmetric, massive BH barely moves while small one swings wide

Use lower massMin (0.3) for dramatic visual asymmetry and size/position variation.
Use higher massMin (0.5-0.7) for more balanced, symmetric orbital patterns.

## Notes
- Each emitter is assigned a bin from the frequency bands of the audio. So one emitter will be all frequency bands, three will be bass, mid, high and so on
- Ensure presets cover the entire song duration.
`;

// Storage format schema for manual preset updates (path/value/duration/ease array)
const storedParameterSchema = z.object({
  path: z.string(),
  value: z.number(),
  duration: z.number(),
  ease: z.string(),
});

// Schema for generateObject output
const playlistOutputSchema = z.object({
  presets: z.array(presetSchema),
});

type PlaylistOutput = z.infer<typeof playlistOutputSchema>;
type GeneratedPreset = PlaylistOutput["presets"][number];

type SectionWithTiming = Doc<"compositions">["sections"][number] & {
  startTimeMs: number;
  endTimeMs: number;
};

// Tool: Generate visualization playlist using generateObject
const generateVisualizationPlaylist = createTool({
  description:
    "Generate and save a visualization playlist synced to the song composition. Call this after the composition plan is finalized to create the visual experience. This will automatically create presets and a playlist in the database.",
  args: z.object({
    customInstructions: z
      .string()
      .optional()
      .describe("Custom instructions for the visualization playlist"),
    songId: z.string().describe("The ID of the song to generate a visualization playlist for"),
  }),
  handler: async (ctx, args) => {
    const song: Doc<"generatedSongs"> | null = await ctx.runQuery(
      internal.model.generatedSongs.server.getById,
      { songId: args.songId as Id<"generatedSongs"> }
    );
    if (!song) return { action: "error", error: "Song not found" };
    if (!song.compositionId) return { action: "error", error: "Song has no composition" };
    const composition: Doc<"compositions"> | null = await ctx.runQuery(
      internal.model.generatedSongs.server.getCompositionInternal,
      { compositionId: song.compositionId }
    );
    if (!composition) return { action: "error", error: "Composition not found" };

    // Calculate section timings
    let currentTime = 0;
    const sectionsWithTiming: SectionWithTiming[] = composition.sections.map((section) => {
      const sectionInfo: SectionWithTiming = {
        ...section,
        startTimeMs: currentTime,
        endTimeMs: currentTime + section.duration_ms,
      };
      currentTime += section.duration_ms;
      return sectionInfo;
    });

    let prompt: string = `# Visualization Playlist Instructions
Create a visualization playlist for the song "${song.name}".

## Song Structure
${JSON.stringify(sectionsWithTiming)}

## Global Styles
Positive: ${composition.positive_global_styles.join(", ")}
Negative (avoid): ${composition.negative_global_styles.join(", ")}

## Instructions
1. Create a preset every 10 to 20 seconds aligned with the song structure for the ENTIRE song duration.
2. Use the exact startTimeMs and endTimeMs from the sections
3. Consider how sections transition into each other, e.g.
  - Make choruses visually impactful with high energy settings
  - Add a variety of settings to the presets to make the visualization more interesting.

${args.customInstructions ? `## Custom Instructions\n${args.customInstructions}` : ""}`.trim();

    // Inject voting analysis insights if sufficient data exists
    const analysis = await ctx.runQuery(
      internal.model.presetVotes.analysis.getAnalysisInternal,
      {}
    );
    if (analysis && analysis.totalVotes >= 10) {
      prompt += `\n\n${analysis.promptFragment}`;
    }

    // Use generateObject with Gemini 3 Pro for structured output
    const result: GenerateObjectResult<PlaylistOutput> = await generateObject({
      model: openrouter.chat("google/gemini-3-flash-preview"),
      schema: playlistOutputSchema,
      system: VISUALIZATION_INSTRUCTIONS,
      prompt,
      headers: (ctx as TraceCtx).traceId
        ? createTraceHeaders((ctx as TraceCtx).traceId!, "visualization-generation")
        : {},
      providerOptions: {
        openrouter: {
          reasoning: {
            effort: "medium",
          },
        },
      },
    });

    const generatedPresets: GeneratedPreset[] = result.object.presets;

    // Get user ID from context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        action: "error",
        error: "Not authenticated",
      };
    }

    const user: { _id: Id<"users"> } | null = await ctx.runQuery(
      internal.model.users.server.getUserByToken,
      { tokenIdentifier: identity.tokenIdentifier as string }
    );

    if (!user) {
      return {
        action: "error",
        error: "User not found",
      };
    }

    // Save presets to database - convert flat parameters object to array format
    const presetIds: Id<"presets">[] = [];
    for (const preset of generatedPresets) {
      const presetId = await ctx.runMutation(internal.model.scenes.server.createPresetForScene, {
        userId: user._id,
        name: preset.name,
        colorPalette: preset.colorPalette,
        parameters: parametersToArray(preset.parameters, preset.duration, preset.ease),
        cameraMode: preset.cameraMode,
      });
      presetIds.push(presetId);
    }

    // Build camera presets from generated data
    const cameraPresets = generatedPresets.map((p) => ({
      mode: p.cameraMode,
      duration: (p.endTimeMs - p.startTimeMs) / 1000,
    }));

    // Create playlist with wait durations and camera presets
    const playlistId: Id<"playlists"> = await ctx.runMutation(
      internal.model.scenes.server.createPlaylistForScene,
      {
        userId: user._id,
        name: `${song.name} Visualization`,
        presetIds,
        waitDurations: generatedPresets.map((p) => (p.endTimeMs - p.startTimeMs) / 1000),
        cameraPresets,
      }
    );

    return {
      playlistId: playlistId as string,
      presetCount: presetIds.length,
      presets: generatedPresets.map((p, i) => ({
        presetId: presetIds[i] as string,
        name: p.name,
        sectionName: p.sectionName,
        colorPalette: p.colorPalette,
      })),
      reasoning: result.reasoning,
    };
  },
});

// Tool: Create a scene combining song and playlist
const createScene = createTool({
  description:
    "Create a scene that combines a generated song with a visualization playlist. Call this after both the song has been generated and the visualization playlist has been created. This will save the scene and allow users to view and play it.",
  args: z.object({
    name: z.string().describe("The name of the scene (usually the song title)"),
    description: z.string().optional().describe("Optional description of the scene"),
    songId: z.string().describe("The ID of the generated song"),
    playlistId: z.string().describe("The ID of the visualization playlist"),
    isPublic: z.boolean().describe("Whether the scene is publicly visible"),
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      throw new Error("Thread ID is required");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        action: "error",
        error: "Not authenticated",
      };
    }

    const user: { _id: Id<"users"> } | null = await ctx.runQuery(
      internal.model.users.server.getUserByToken,
      { tokenIdentifier: identity.tokenIdentifier as string }
    );

    if (!user) {
      return {
        action: "error",
        error: "User not found",
      };
    }

    const sceneId: Id<"scenes"> = await ctx.runMutation(
      internal.model.scenes.server.saveSceneForAgent,
      {
        userId: user._id,
        name: args.name,
        description: args.description,
        songId: args.songId as Id<"generatedSongs">,
        playlistId: args.playlistId as Id<"playlists">,
        threadId: ctx.threadId,
        isPublic: args.isPublic,
      }
    );

    return {
      action: "sceneCreated",
      sceneId: sceneId as string,
      name: args.name,
    };
  },
});

// Tool: Read a single preset by ID
const readPreset = createTool({
  description:
    "Read a preset's details by ID. Use this to see the current values of a specific preset before making changes.",
  args: z.object({
    presetId: z.string().describe("The ID of the preset to read"),
  }),
  handler: async (
    ctx,
    args
  ): Promise<
    | { action: "error"; error: string }
    | {
        action: "readPreset";
        preset: {
          id: Id<"presets">;
          name: string;
          colorPalette: string;
          parameters: Array<{ path: string; value: number; duration: number; ease: string }>;
          cameraMode: string | undefined;
        };
      }
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { action: "error", error: "Not authenticated" };
    }
    const user = await ctx.runQuery(internal.model.users.server.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier as string,
    });
    if (!user) {
      return { action: "error", error: "User not found" };
    }
    const preset = await ctx.runQuery(internal.model.scenes.server.getPresetById, {
      presetId: args.presetId as Id<"presets">,
      userId: user._id,
    });
    if (!preset) {
      return { action: "error", error: "Preset not found or access denied" };
    }
    return {
      action: "readPreset",
      preset: {
        id: preset._id,
        name: preset.name,
        colorPalette: preset.colorPalette,
        parameters: preset.parameters,
        cameraMode: preset.cameraMode,
      },
    };
  },
});

// Tool: Read all presets in a playlist with timing
const readPlaylistPresets = createTool({
  description:
    "Read all presets in a playlist with their timing information. Use this to see the full visualization sequence and identify which presets to modify.",
  args: z.object({
    playlistId: z.string().describe("The ID of the playlist to read presets from"),
  }),
  handler: async (
    ctx,
    args
  ): Promise<
    | { action: "error"; error: string }
    | {
        action: "readPlaylistPresets";
        playlistName: string;
        presets: Array<{
          index: number;
          id: Id<"presets">;
          name: string;
          colorPalette: string;
          cameraMode: string | undefined;
          waitDuration: number;
          parameters: Array<{ path: string; value: number; duration: number; ease: string }>;
        }>;
      }
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { action: "error", error: "Not authenticated" };
    }
    const user = await ctx.runQuery(internal.model.users.server.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier as string,
    });
    if (!user) {
      return { action: "error", error: "User not found" };
    }
    const result = await ctx.runQuery(internal.model.scenes.server.getPlaylistWithPresets, {
      playlistId: args.playlistId as Id<"playlists">,
      userId: user._id,
    });
    if (!result) {
      return { action: "error", error: "Playlist not found or access denied" };
    }
    return {
      action: "readPlaylistPresets",
      playlistName: result.playlist.name,
      presets: result.presets
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((preset) => ({
          index: preset.index,
          id: preset._id,
          name: preset.name,
          colorPalette: preset.colorPalette,
          cameraMode: preset.cameraMode,
          waitDuration: preset.waitDuration ?? 0,
          parameters: preset.parameters,
        })),
    };
  },
});

// Tool: Update a preset's visual parameters and/or timing
const updatePresetTool = createTool({
  description:
    "Update a preset's visual parameters (colorPalette, parameters, cameraMode) and optionally its timing in a playlist. Use this to make adjustments to the visualization after generation.",
  args: z.object({
    presetId: z.string().describe("The ID of the preset to update"),
    name: z.string().optional().describe("New name for the preset"),
    colorPalette: z.string().optional().describe("New color palette"),
    parameters: z
      .array(storedParameterSchema)
      .optional()
      .describe("New visualization parameters (replaces all existing parameters)"),
    cameraMode: z.string().optional().describe("New camera mode (circle, closeup, orbit, edge)"),
    playlistId: z.string().optional().describe("Playlist ID - required if updating waitDuration"),
    waitDuration: z
      .number()
      .optional()
      .describe("New duration in seconds for how long this preset plays in the playlist"),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { action: "error", error: "Not authenticated" };
    }
    const user = await ctx.runQuery(internal.model.users.server.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier as string,
    });
    if (!user) {
      return { action: "error", error: "User not found" };
    }

    // Update preset visual properties if any provided
    const hasPresetUpdates =
      args.name !== undefined ||
      args.colorPalette !== undefined ||
      args.parameters !== undefined ||
      args.cameraMode !== undefined;

    if (hasPresetUpdates) {
      await ctx.runMutation(internal.model.scenes.server.updatePreset, {
        presetId: args.presetId as Id<"presets">,
        userId: user._id,
        name: args.name,
        colorPalette: args.colorPalette,
        parameters: args.parameters,
        cameraMode: args.cameraMode,
      });
    }

    // Update timing in playlist if provided
    if (args.waitDuration !== undefined) {
      if (!args.playlistId) {
        return { action: "error", error: "playlistId is required when updating waitDuration" };
      }
      await ctx.runMutation(internal.model.scenes.server.updatePlaylistItemTiming, {
        playlistId: args.playlistId as Id<"playlists">,
        presetId: args.presetId as Id<"presets">,
        userId: user._id,
        waitDuration: args.waitDuration,
      });
    }

    return {
      action: "updatePreset",
      presetId: args.presetId,
      success: true,
    };
  },
});

// Tool: Update an existing scene
const updateScene = createTool({
  description:
    "Update an existing scene's properties. Use this to modify the scene's name, description, visibility, or to swap the associated song or playlist.",
  args: z.object({
    sceneId: z.string().describe("The ID of the scene to update"),
    name: z.string().optional().describe("New name for the scene"),
    description: z.string().optional().describe("New description for the scene"),
    songId: z.string().optional().describe("New song ID to associate with the scene"),
    playlistId: z.string().optional().describe("New playlist ID to associate with the scene"),
    isPublic: z.boolean().optional().describe("New visibility setting"),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        action: "error",
        error: "Not authenticated",
      };
    }

    await ctx.runMutation(internal.model.scenes.server.updateSceneForAgent, {
      sceneId: args.sceneId as Id<"scenes">,
      name: args.name,
      description: args.description,
      songId: args.songId as Id<"generatedSongs"> | undefined,
      playlistId: args.playlistId as Id<"playlists"> | undefined,
      isPublic: args.isPublic,
    });

    return {
      action: "sceneUpdated",
      sceneId: args.sceneId,
      success: true,
    };
  },
});

// Scene Agent (Kimi K2 Thinking)
export const sceneAgent = new Agent<TraceCtx>(components.agent, {
  name: "Scene Agent",
  languageModel: openrouter.chat("moonshotai/kimi-k2.5"),
  instructions: SCENE_AGENT_INSTRUCTIONS,
  tools: {
    updateCompositionPlan,
    showGenerateSongButton,
    readCompositionPlan,
    updateSavedCompositionPlan,
    generateVisualizationPlaylist,
    createScene,
    updateScene,
    readPreset,
    readPlaylistPresets,
    updatePreset: updatePresetTool,
  },
});
