# Blackhole Audio Visualizer

An offline desktop music visualizer built with Electron, React Three Fiber, and
GPU particle shaders. Microphone or system audio drives the black hole simulation,
colors, and camera movement. No account, backend, or cloud credentials are needed.

## Run locally

Install [Bun](https://bun.sh), then:

```sh
bun install
bun run electron:dev
```

For renderer development in a browser, use `bun run dev:web` and open
http://localhost:3000/app. System audio capture is available in Electron;
the browser supports microphone input.

## Presets and playlists

The bundled collection lives in [apps/web/config/presets.json](apps/web/config/presets.json).
It contains 77 supported presets and 17 playlists exported from production Convex.
The export archive and migration details are in [exports/README.md](exports/README.md).

Edit that JSON to change the collection shipped in the next release. Presets retain
stable IDs so playlist references survive updates. Parameter definitions, defaults,
and slider ranges live in [visualizationParameters.ts](apps/web/lib/visualizationParameters.ts).
The app validates the bundled configuration at startup.

The preset editor saves user changes locally. Only local edits, additions, and
explicit deletions are persisted, so new releases can update unedited bundled
presets. Existing `producer-presets` local storage is retained. Preset JSON import
and export remain available in the editor.

Some exported playlists reference deleted or unsupported presets. These entries
remain visible as unavailable in the editor and must be removed before playback.
No missing preset is silently replaced.

## Recording

Connect audio, then start recording from Settings. Stopping recording saves a local
video file. Recordings are not uploaded. On macOS, system audio may require Screen
Recording permission and microphone input requires Microphone permission.

## Build

```sh
bun run electron:package:mac
bun run electron:package:win
```

Installers are written to `release/`. The renderer is exported as static files and
bundled inside the Electron app. No hosted web deployment is involved. Dependency
installation and builds may download packages and fonts; the packaged app runs
offline.

The manual `Build Electron App` GitHub Actions workflow builds desktop artifacts.
Signing, notarization, and publishing a release are separate from local packaging.

## Checks

```sh
bun run lint
bun run typecheck
bun run format:check
bun run test
bunx playwright install chromium
bun run test:physics
```

The physics tests execute the simulation shaders in Chromium and check orbital
conservation, spawning, absorption, and trail history. See
[particle physics](docs/particle-physics.md) for the numerical model and its
artistic controls.

After packaging for your platform, run `bun run test:desktop`. It launches the
packaged app offline, checks preset and playlist persistence, and saves a recording
using synthetic audio. Physical microphone and system-audio permissions still need
a manual check on the target machine.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md) for conventions.

## License

[MIT](LICENSE) © Isaac Suttell
