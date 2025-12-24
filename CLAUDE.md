# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev                    # Web dev server (localhost:3000)
bun run electron:dev       # Desktop app dev (Next + Electron)
bun run electron:package   # Build desktop app (output: release/)
bun lint                   # Run ESLint
```

## Architecture

**Stack:** Next.js 16 (App Router) + React Three Fiber + Electron + Convex

### Data Flow

```
Audio Input (mic/system)
    ↓
Web Worker (audioAnalysis.worker.ts)
    ↓
useAudioAnalyzer (envelope followers)
    ↓
BlackHoleSimulation (orchestrator)
    ↓
useGPUCompute → Position/Velocity Shaders
    ↓
ParticleSystem → Render Shaders → Screen
```

## Directory Map

```
app/                      # Next.js App Router
├── @canvas/              # Parallel route: 3D canvas
├── @ui/                  # Parallel route: UI overlay
├── scene/[id]/           # Scene routes
└── watch/[id]/           # Playback routes

components/               # Feature-organized React components
├── BlackHoleSimulation/  # Core viz: ParticleSystem, BlackHole
├── CameraSystem/         # Camera presets + GSAP transitions
├── ColorModeSystem/      # 7 palettes, beat-reactive switching
├── ProducerMode/         # Preset editing + playlist management
├── scenes/               # Scene player + editor
├── layout/               # UI layout (toolbar, sidebar, overlays)
├── controls/             # Form controls (sliders, selects)
├── dialogs/              # Modal dialogs
├── ui/                   # Shadcn UI primitives
└── audio/                # Audio playback controls

hooks/                    # Custom React hooks
├── useAudio*.ts          # Audio input/analysis
├── useGPUCompute.ts      # GPU simulation
├── useConvex*.ts         # Backend data
├── useRecording.ts       # Screen/audio capture
└── useVisualizationControls.ts  # Main state store

lib/
├── audio/                # SpectralAnalysis, EnvelopeFollower
├── gpu/                  # verletPhysics.ts
├── workers/              # audioAnalysis.worker.ts
└── platform.ts           # isElectron(), isWeb()

shaders/
├── simulation/           # positionFragment, velocityFragment
├── particles/            # particleVertex, particleFragment
└── starfield/            # Background stars

convex/                   # Backend
├── schema.ts             # All table definitions
├── http.ts               # HTTP routes
└── model/                # Domain-organized APIs

electron/                 # Desktop app
├── main.ts               # Main process
└── preload.ts            # IPC bridge (window.electronAPI)
```

## Convex Model Convention

```
convex/model/{modelName}/
├── public.ts      # Client queries/mutations/actions
├── internal.ts    # Server-only functions (optional)
└── agents.ts      # AI agents (scenes only)
```

**Tables:** users, presets, playlists, recordings, releases, compositions, generatedSongs, transcriptions, scenes, sceneConversations

## Naming Conventions

- **Hooks:** `use[Feature].ts` in `hooks/`
- **Components:** PascalCase directories with `index.ts` barrel exports
- **Shaders:** `{purpose}Fragment.glsl`, `{purpose}Vertex.glsl`
- **Convex:** `model/{entity}/public.ts`, `model/{entity}/internal.ts`

## Key Files

| Purpose                      | File                                                     |
| ---------------------------- | -------------------------------------------------------- |
| Main simulation orchestrator | `components/BlackHoleSimulation/BlackHoleSimulation.tsx` |
| GPU particle rendering       | `components/BlackHoleSimulation/ParticleSystem.tsx`      |
| Physics constants            | `lib/gpu/verletPhysics.ts`                               |
| Audio analysis worker        | `lib/workers/audioAnalysis.worker.ts`                    |
| Visualization state          | `hooks/useVisualizationControls.ts`                      |
| Platform detection           | `lib/platform.ts`                                        |
| Camera presets               | `components/CameraSystem/cameraPresets.ts`               |
| Color palettes               | `components/ColorModeSystem/colorPalettes.ts`            |

## Platform Detection

`lib/platform.ts` exports `isElectron()`, `isWeb()`, `getSystemAudioStream()`. Electron exposes `window.electronAPI` for IPC (audio loopback, screen permission).

## Git Commits

Always include `convex/_generated/` files in commits. These are required for Convex to work correctly and must be committed with any schema or function changes.
