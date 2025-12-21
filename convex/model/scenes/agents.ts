import { Agent, createTool } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { components, internal } from "../../_generated/api";
import { z } from "zod";
import type { Id } from "../../_generated/dataModel";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not set");
}

// Initialize OpenRouter provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
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
      internal.model.scenes.public.getUserByToken,
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
      internal.model.scenes.public.saveComposition,
      { compositionPlan: args.compositionPlan }
    );

    // Create song record with status "ready" and compositionId reference
    const songId: Id<"generatedSongs"> = await ctx.runMutation(
      internal.model.scenes.public.createReadySong,
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

// System prompt for the scene agent
const SCENE_AGENT_INSTRUCTIONS = `You are a creative music producer and scene designer helping users compose songs for the Blackhole Audio Visualizer - a stunning particle-based visualization that reacts to music.

Your role is to guide users through creating a complete song composition plan that will be used to generate music via ElevenLabs' AI music generation, and then generate synchronized visualizations.

## WORKFLOW

1. **Understand the vision**: Ask about the mood, genre, theme, and overall feeling they want
2. **Structure the song**: Help them plan sections (Intro, Verse, Chorus, Bridge, Outro)
3. **Write lyrics**: Collaborate on lyrics for each section (or instrumental descriptions)
4. **Define styles**: Suggest musical styles, instruments, and production elements
5. **Review and refine**: Iterate until they're happy
6. **Generate Song**: Call showGenerateSongButton when complete - this displays a button for the user to click. You CANNOT generate songs directly; the user must click the button.
7. **Wait for Generation**: After calling showGenerateSongButton, wait for the user to click the button. A tool result will appear in the conversation when the song is generated.
8. **Generate Visualization**: After receiving a successful song generation result, call generateVisualizationPlaylist to create synchronized visual presets
9. **Create Scene**: After the visualization playlist is created, call createScene with the songId and playlistId to finalize the scene. This saves everything together and allows users to view and play the scene.

## COMPOSITION PLAN RULES

- Each section duration: 3,000-120,000ms (3 seconds to 2 minutes)
- Total song: aim for 60,000-300,000ms (1-5 minutes)
- Each lyric line: max 200 characters
- Use English for style descriptions
- NEVER use copyrighted lyrics, artist names, or song references

## SECTION TYPES

- **Intro**: 5-15 seconds, often instrumental, sets the mood
- **Verse**: 30-60 seconds, tells the story
- **Pre-Chorus**: 10-20 seconds, builds tension
- **Chorus**: 30-45 seconds, the hook, most memorable
- **Bridge**: 15-30 seconds, contrast/variation
- **Outro**: 10-20 seconds, wind down

## STYLE KEYWORDS TO USE

**Genres**: electronic, ambient, synthwave, lo-fi, orchestral, rock, pop, hip-hop, jazz, classical
**Moods**: epic, calm, energetic, melancholic, uplifting, dark, ethereal, intense
**Instruments**: synth, piano, guitar, drums, bass, strings, brass, vocals, choir
**Production**: reverb, echo, distortion, clean, punchy, atmospheric, layered

## IMPORTANT

- Call updateCompositionPlan frequently to show progress in the UI
- Always ask for approval before calling showGenerateSongButton
- Be encouraging and creative - help users express their vision
- Consider how the song will sync with a particle visualization reacting to the beat
- Your response style should be short and to the point. Space is limited.`;

// System prompt for the visualization tool (used by generateObject)
const VISUALIZATION_INSTRUCTIONS = `You are a visualization designer for the Blackhole Audio Visualizer - a stunning particle physics simulation that creates mesmerizing visuals synced to music.

Given a song's composition plan with sections, moods, and timing, create synchronized visualization presets.

## AVAILABLE PARAMETERS (use exact paths)

### Black Hole
- "Black Hole.eventHorizonRadius": 0.5-20 (size of central black hole)
- "Black Hole.beatPulse": 0-5 (pulsation on beat)

### Particles
- "Particles.pointSize": 0.1-20 (particle size)
- "Particles.brightness": 0.5-3 (brightness)
- "Particles.alpha": 0.2-1 (opacity)
- "Particles.maxDistance": 20-100 (fade distance)

### Physics
- "Physics.gravity": 1000-1000000 (gravitational pull strength)
- "Physics.orbitDecay": 0-20 (spiral inward rate)
- "Physics.softening": 0.01-10 (force smoothing)

### Emitters
- "Emitters.emitterCount": 1-36 (number of particle sources)
- "Emitters.emitterSpread": 0-1 (angular spread)
- "Emitters.emitRadius": 5-200 (spawn distance from center)
- "Emitters.spawnRate": 0.1-1 (particles per frame)

### Audio Reactivity
- "Audio.amplitude": 0-20 (audio response strength)
- "Audio.audioGain": 0-3 (input sensitivity)
- "Audio.beatRepulsion": 0-100 (beat push force)

### Post-FX
- "Post-FX.bloomBaseIntensity": 0-2 (glow intensity)
- "Post-FX.bloomAudioReactivity": 0-2 (glow audio response)

## COLOR PALETTES
- "cool" - Cyan/blue tones
- "warm" - Orange/red tones
- "neon" - High saturation bright colors
- "sunset" - Warm gradient
- "ocean" - Deep blue tones
- "grayscale" - B&W gradient

## CAMERA MODES
- "circle" - Slow orbit, wide view
- "closeup" - Near the action, reverse orbit
- "orbit" - Medium distance, vertical oscillation
- "edge" - Far away, side view

## EASING OPTIONS
- "none" - Linear
- "power1.inOut", "power2.inOut", "power3.inOut", "power4.inOut" - Smooth
- "back.inOut" - Overshoot
- "elastic.out" - Bouncy
- "bounce.out" - Hard bounce

## DESIGN GUIDELINES

**Intros/Outros**:
- Low energy: small black hole, few particles, wide camera
- Calm palettes (ocean, grayscale, cool)
- Low beat repulsion, high orbit decay

**Verses**:
- Medium energy: moderate particles, medium gravity
- Match palette to mood
- Orbit or circle camera

**Choruses**:
- HIGH energy: large black hole, many particles
- Bright palettes (neon, warm, sunset)
- High beat repulsion, closeup camera
- Dramatic parameter changes

**Bridges**:
- Experimental: try unusual combinations
- Contrast with chorus
- Interesting transitions

**Transitions**:
- Use 2-5 second durations for smooth changes
- power2.inOut or power3.inOut for most transitions
- Match transition speed to musical energy

Create visually interesting and synchronized visualizations!`;

// Preset parameter schema for visualization
const presetParameterSchema = z.object({
  path: z.string(),
  value: z.number(),
  duration: z.number(),
  ease: z.string(),
});

// Schema for generateObject output
const playlistOutputSchema = z.object({
  presets: z.array(
    z.object({
      name: z.string(),
      startTimeMs: z.number(),
      endTimeMs: z.number(),
      sectionName: z.string(),
      colorPalette: z.string(),
      parameters: z.array(presetParameterSchema),
      cameraMode: z.string(),
    })
  ),
});

// Tool: Generate visualization playlist using generateObject
const generateVisualizationPlaylist = createTool({
  description:
    "Generate and save a visualization playlist synced to the song composition. Call this after the composition plan is finalized to create the visual experience. This will automatically create presets and a playlist in the database.",
  args: z.object({
    compositionPlan: compositionPlanSchema,
    songTitle: z.string(),
  }),
  handler: async (ctx, args) => {
    // Calculate section timings
    let currentTime = 0;
    const sectionsWithTiming = args.compositionPlan.sections.map((section) => {
      const sectionInfo = {
        ...section,
        startTimeMs: currentTime,
        endTimeMs: currentTime + section.duration_ms,
      };
      currentTime += section.duration_ms;
      return sectionInfo;
    });

    const prompt = `Create a visualization playlist for the song "${args.songTitle}".

## Song Structure
${JSON.stringify(sectionsWithTiming, null, 2)}

## Global Styles
Positive: ${args.compositionPlan.positive_global_styles.join(", ")}
Negative (avoid): ${args.compositionPlan.negative_global_styles.join(", ")}

## Instructions
1. Create a preset for each section that matches its mood and energy
2. Use the exact startTimeMs and endTimeMs from the sections
3. Consider how sections transition into each other, e.g.
  - Make choruses visually impactful with high energy settings
  - Keep intros/outros calmer and more atmospheric`;

    // Use generateObject with Gemini 3 Pro for structured output
    const result = await generateObject({
      model: openrouter.chat("google/gemini-3-pro-preview"),
      schema: playlistOutputSchema,
      system: VISUALIZATION_INSTRUCTIONS,
      prompt,
    });

    const generatedPresets = result.object.presets;

    // Get user ID from context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        action: "error",
        error: "Not authenticated",
      };
    }

    const user: { _id: Id<"users"> } | null = await ctx.runQuery(
      internal.model.scenes.public.getUserByToken,
      { tokenIdentifier: identity.tokenIdentifier as string }
    );

    if (!user) {
      return {
        action: "error",
        error: "User not found",
      };
    }

    // Save presets to database
    const presetIds: Id<"presets">[] = [];
    for (const preset of generatedPresets) {
      const presetId = await ctx.runMutation(internal.model.scenes.public.createPresetForScene, {
        userId: user._id,
        name: preset.name,
        colorPalette: preset.colorPalette,
        parameters: preset.parameters,
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
      internal.model.scenes.public.createPlaylistForScene,
      {
        userId: user._id,
        name: `${args.songTitle} Visualization`,
        presetIds,
        waitDurations: generatedPresets.map((p) => (p.endTimeMs - p.startTimeMs) / 1000),
        cameraPresets,
      }
    );

    return {
      playlistId: playlistId as string,
      presetCount: presetIds.length,
      presets: generatedPresets.map((p) => ({
        name: p.name,
        sectionName: p.sectionName,
        colorPalette: p.colorPalette,
      })),
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
      internal.model.scenes.public.getUserByToken,
      { tokenIdentifier: identity.tokenIdentifier as string }
    );

    if (!user) {
      return {
        action: "error",
        error: "User not found",
      };
    }

    const sceneId: Id<"scenes"> = await ctx.runMutation(
      internal.model.scenes.public.saveSceneForAgent,
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

    await ctx.runMutation(internal.model.scenes.public.updateSceneForAgent, {
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
export const sceneAgent = new Agent(components.agent, {
  name: "Scene Agent",
  languageModel: openrouter.chat("moonshotai/kimi-k2-thinking"),
  instructions: SCENE_AGENT_INSTRUCTIONS,
  tools: {
    updateCompositionPlan,
    showGenerateSongButton,
    generateVisualizationPlaylist,
    createScene,
    updateScene,
  },
});
