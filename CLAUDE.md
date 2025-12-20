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

**Stack:** Next.js 16 (App Router) + React Three Fiber + Electron

### Key Data Flow

1. **Audio Input** → `useAudioSource` (web: mic only, Electron: mic + system audio via `electron-audio-loopback`)
2. **Audio Analysis** → `useAudioAnalyzer` sends FFT data to Web Worker (`lib/workers/audioAnalysis.worker.ts`) for off-main-thread processing (spectral flux, HFC, band energies, onset detection)
3. **GPU Compute** → `useGPUCompute` runs kick-drift-kick Verlet integration via `GPUComputationRenderer` (position + velocity shaders)
4. **Rendering** → `ParticleSystem` reads GPU textures, renders points with additive blending

### Directory Map

- `components/BlackHoleSimulation/` - Main viz: `ParticleSystem.tsx` (GPU particles), `BlackHole.tsx` (center sphere)
- `components/CameraSystem/` - Camera presets + GSAP transitions
- `components/ColorModeSystem/` - 7 palettes (56 total colors), beat-reactive palette switching
- `hooks/` - Audio (`useAudioAnalyzer`, `useAudioSource`), GPU compute, recording
- `lib/workers/` - Web Worker for audio analysis (runs off main thread)
- `shaders/simulation/` - Position/velocity compute shaders (GLSL)
- `shaders/particles/` - Point rendering shaders
- `lib/gpu/verletPhysics.ts` - Initial particle textures, physics constants
- `electron/` - Main process + preload (system audio capture, permissions)

### Platform Detection

`lib/platform.ts` exports `isElectron()`, `isWeb()`, `getSystemAudioStream()`. Electron exposes `window.electronAPI` for IPC (audio loopback, screen permission).

### Particle Physics

Particles spawn at configurable emitter positions around the black hole. GPU shaders handle:

- Gravitational attraction (configurable GM)
- ISCO (innermost stable circular orbit) effects
- Beat-reactive repulsion force
- Respawn when crossing event horizon

All physics params exposed via Leva controls in `BlackHoleSimulation.tsx`.
