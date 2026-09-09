# Project guide

## Commands

```sh
bun dev                       # Local renderer dev server
bun run electron:dev          # Renderer dev server and Electron
bun run electron:package:mac   # Static renderer and macOS installer
bun run electron:package:win   # Static renderer and Windows installer
bun run lint
bun run typecheck
bun run format:check
bun run test
```

## Architecture

The app runs locally. Electron loads a static Next.js export over the `app://`
protocol. React Three Fiber renders the GPU particle simulation. There is no
backend, account system, cloud authoring, or runtime network service.

Audio input flows through `useAudioSource`, the analysis worker, and
`BlackHoleSimulation` into GPU compute and render shaders. Electron exposes audio
capture, permission helpers, and window controls through its preload bridge.

## Key files

| Purpose                            | File                                                              |
| ---------------------------------- | ----------------------------------------------------------------- |
| Bundled presets and playlists      | `apps/web/config/presets.json`                                    |
| Configuration validation           | `apps/web/lib/presetLibrarySchema.ts`                             |
| Parameter definitions and defaults | `apps/web/lib/visualizationParameters.ts`                         |
| Local preset edits                 | `apps/web/components/ProducerMode/usePresets.ts`                  |
| Local playlists                    | `apps/web/hooks/usePlaylists.ts`                                  |
| Visualization state                | `apps/web/hooks/useVisualizationControls.ts`                      |
| Simulation                         | `apps/web/components/BlackHoleSimulation/BlackHoleSimulation.tsx` |
| GPU physics                        | `apps/web/lib/gpu/verletPhysics.ts`                               |
| Local video recording              | `apps/web/hooks/useRecording.ts`                                  |
| Electron process and bridge        | `apps/desktop/src/main.ts`, `preload.ts`                          |

`packages/` contains shared ESLint and TypeScript configuration. `exports/` records
the production configuration migration and is not part of the app bundle.

## Conventions

Use `@/` imports inside the renderer. Hooks use `use[Feature].ts`, components use
PascalCase, and shaders use `{purpose}Vertex.glsl` or `{purpose}Fragment.glsl`.
Preserve the existing UI treatments. Keep local edits separate from the bundled
collection so app upgrades do not erase user changes or freeze old bundled values.
