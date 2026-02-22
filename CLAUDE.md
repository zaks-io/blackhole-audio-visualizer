# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev                       # Web + backend dev (via turbo)
bun run electron:dev          # Desktop app dev (Next + Electron)
bun run electron:package      # Build desktop app (output: release/)
bun run lint                  # ESLint across all workspaces
bun run typecheck             # TypeScript check across all workspaces
bun run format:check          # Prettier check
```

## Architecture

**Stack:** Next.js 16 (App Router) + React Three Fiber + Electron + Convex
**Monorepo:** Turborepo with bun workspaces

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
apps/
├── web/                        # @blackhole/web - Next.js app
│   ├── app/                    # App Router
│   │   ├── @canvas/            # Parallel route: 3D canvas
│   │   ├── @ui/                # Parallel route: UI overlay
│   │   ├── scene/[id]/         # Scene routes
│   │   └── watch/[id]/         # Playback routes
│   ├── components/             # Feature-organized React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities, audio, GPU code
│   ├── shaders/                # GLSL shaders
│   ├── types/                  # TypeScript declarations
│   └── public/                 # Static assets
│
└── desktop/                    # @blackhole/desktop - Electron wrapper
    ├── src/
    │   ├── main.ts             # Main process
    │   └── preload.ts          # IPC bridge (window.electronAPI)
    ├── build-resources/        # Icons, entitlements
    └── electron-builder.config.js

packages/
├── backend/                    # @blackhole/backend - Convex backend
│   └── convex/
│       ├── schema.ts           # All table definitions
│       ├── http.ts             # HTTP routes
│       ├── model/              # Domain-organized APIs
│       └── lib/                # Shared backend utilities
│
├── eslint-config/              # @blackhole/eslint-config
└── typescript-config/          # @blackhole/typescript-config
```

## Convex Model Convention

```
packages/backend/convex/model/{modelName}/
├── public.ts      # Client queries/mutations/actions
├── internal.ts    # Server-only functions (optional)
└── agents.ts      # AI agents (scenes only)
```

**Tables:** users, presets, playlists, recordings, releases, compositions, generatedSongs, transcriptions, scenes, sceneConversations

**Frontend imports:** Use `@blackhole/backend/convex/...` (not `@/convex/...`)

## Naming Conventions

- **Hooks:** `use[Feature].ts` in `apps/web/hooks/`
- **Components:** PascalCase directories with `index.ts` barrel exports
- **Shaders:** `{purpose}Fragment.glsl`, `{purpose}Vertex.glsl`
- **Convex:** `model/{entity}/public.ts`, `model/{entity}/internal.ts`

## Key Files

| Purpose                      | File                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| Main simulation orchestrator | `apps/web/components/BlackHoleSimulation/BlackHoleSimulation.tsx` |
| GPU particle rendering       | `apps/web/components/BlackHoleSimulation/ParticleSystem.tsx`      |
| Physics constants            | `apps/web/lib/gpu/verletPhysics.ts`                               |
| Audio analysis worker        | `apps/web/lib/workers/audioAnalysis.worker.ts`                    |
| Visualization state          | `apps/web/hooks/useVisualizationControls.ts`                      |
| Platform detection           | `apps/web/lib/platform.ts`                                        |
| Camera presets               | `apps/web/components/CameraSystem/cameraPresets.ts`               |
| Color palettes               | `apps/web/components/ColorModeSystem/colorPalettes.ts`            |

## Platform Detection

`apps/web/lib/platform.ts` exports `isElectron()`, `isWeb()`, `getSystemAudioStream()`. Electron exposes `window.electronAPI` for IPC (audio loopback, screen permission).

## Git Commits

Always include `packages/backend/convex/_generated/` files in commits. These are required for Convex to work correctly and must be committed with any schema or function changes.
