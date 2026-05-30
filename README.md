# Blackhole Audio Visualizer

Real-time music visualization built around a GPU-accelerated black hole particle
simulation. Thousands of particles orbit and fall toward a central singularity,
with physics and color reacting to live audio frequency data and beat detection.

Runs as a web app or a native desktop app (Electron).

> **Note on setup.** This is my personal project, opened up under MIT. It's wired
> to a specific cloud stack (Convex, Auth0, Cloudflare R2, and a few AI providers)
> and expects those to be configured — there is no offline/demo mode, and the app
> will not boot without the required environment variables. If you just want the
> rendering engine, the interesting, dependency-free parts are
> `apps/web/lib/audio` (the audio analysis) and
> `apps/web/components/BlackHoleSimulation` (the GPU renderer). Lift those out and
> skip the rest. PRs welcome but support is best-effort.

## Features

- **GPU particle system** — particles simulated entirely on the GPU via WebGL
  compute shaders (position/velocity feedback textures), rendered with React
  Three Fiber.
- **Audio reactive** — custom in-browser spectral analysis (FFT-based band
  energies, spectral flux beat detection with adaptive thresholds) running in a
  Web Worker. No third-party audio library.
- **Multiple audio sources** — microphone (web + desktop) or system audio
  capture (desktop only).
- **Presets, playlists, scenes** — save and share visualization configs, backed
  by Convex.
- **AI scenes** — agent-driven scene generation (LLM via OpenRouter, plus voice
  and song generation). Optional feature cluster.
- **Color palettes & camera modes** — beat-reactive palette transitions, multiple
  camera presets with GSAP transitions.
- **Recording** — export visualizations to video, stored in R2.

## Tech Stack

| Layer     | Tech                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19                                      |
| Rendering | [React Three Fiber](https://r3f.docs.pmnd.rs) + [Three.js](https://threejs.org), custom GLSL |
| Audio     | Web Audio API + custom analysis worker (`apps/web/lib/audio`)                                |
| State     | [Zustand](https://zustand.docs.pmnd.rs)                                                      |
| UI        | Radix UI, Tailwind CSS v4, Framer Motion, GSAP                                               |
| Backend   | [Convex](https://convex.dev) (DB + functions)                                                |
| Auth      | [Auth0](https://auth0.com) (web), custom PKCE flow (desktop)                                 |
| Storage   | Cloudflare R2 (S3-compatible)                                                                |
| AI        | [AI SDK](https://sdk.vercel.ai) via OpenRouter, ElevenLabs, Coconut                          |
| Desktop   | [Electron](https://electronjs.org) + electron-audio-loopback                                 |
| Monorepo  | Turborepo + Bun workspaces                                                                   |

## Repository Layout

```
apps/
├── web/                  @blackhole/web — the Next.js app (web + Electron renderer)
│   ├── app/              App Router. Parallel routes: @canvas (3D) + @ui (overlay)
│   ├── components/       Feature-organized React components
│   │   └── BlackHoleSimulation/   The simulation orchestrator + renderer
│   ├── hooks/            use[Feature] hooks (audio, GPU, Convex data, recording)
│   ├── lib/
│   │   ├── audio/        Spectral analysis, envelope followers, beat detection
│   │   ├── gpu/          GPU compute setup, Verlet physics constants
│   │   └── workers/      audioAnalysis.worker.ts
│   └── shaders/          GLSL (particles, simulation, starfield)
│
└── desktop/              @blackhole/desktop — Electron wrapper
    └── src/              main.ts (main process), preload.ts (IPC bridge)

packages/
├── backend/              @blackhole/backend — Convex backend
│   └── convex/
│       ├── schema.ts     Table definitions
│       ├── model/        Domain-organized functions (public/server/agents)
│       └── lib/          Shared backend utilities (auth, r2, validators)
├── eslint-config/        Shared ESLint config
└── typescript-config/    Shared TS config
```

For a deeper map (data flow, key files, Convex conventions), see
[CLAUDE.md](./CLAUDE.md).

### How the pieces connect

```
Audio input (mic / system)
    ↓
audioAnalysis.worker.ts        ← FFT, band energies, spectral-flux beats
    ↓
useAudioAnalyzer               ← envelope followers, smoothing
    ↓
BlackHoleSimulation            ← orchestrator
    ↓
useGPUCompute                  ← position/velocity shaders (GPU feedback loop)
    ↓
ParticleSystem                 ← render shaders → screen
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) 1.3.5+
- A [Convex](https://convex.dev) account and project
- An [Auth0](https://auth0.com) application (for web auth)
- A Cloudflare R2 bucket (for recordings/releases)
- API keys for the AI features (optional — see `.env.example`)

### 1. Install

```bash
bun install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in the values. See `.env.example` for what each variable does and which are
required to boot vs. optional. Server-side secrets (R2, AI keys) are set on the
Convex deployment, not in `.env.local`.

### 3. Backend

```bash
cd packages/backend
bunx convex dev          # provisions your dev deployment, prints NEXT_PUBLIC_CONVEX_URL
```

Set the server-side secrets on the deployment via the Convex dashboard or
`bunx convex env set NAME value`.

### 4. Run

```bash
bun dev                  # web + backend (Turborepo)
```

Open [http://localhost:3000](http://localhost:3000).

## Development

```bash
bun dev                  # web + backend dev
bun run dev:web          # web only
bun run electron:dev     # desktop (launches Next dev server + Electron)

bun run lint             # ESLint across all workspaces
bun run typecheck        # TypeScript check across all workspaces
bun run format:check     # Prettier check
bun run test             # all tests (Vitest, via Turborepo)
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow.

## Building

**Web** (deployed on Vercel; `vercel.json` runs the Convex deploy + Next build):

```bash
bun run build
```

**Desktop:**

```bash
bun run electron:package:mac     # macOS
bun run electron:package:win     # Windows
```

Output lands in `release/`. CI can also build desktop artifacts via the
`Build Electron App` GitHub Actions workflow (manual dispatch).

## Audio Input

- **Web** — microphone only. Grant mic permission when prompted.
- **Desktop** — microphone or system audio capture. System audio on macOS
  requires Screen Recording permission (the app prompts you to enable it in
  System Settings).

## License

[MIT](./LICENSE) © Isaac Suttell
