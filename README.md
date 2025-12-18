# Music Viz Particles

Real-time music visualization featuring a GPU-accelerated black hole particle simulation. Particles orbit and fall into a central black hole, with physics and colors responding dynamically to audio frequency data and beat detection.

## Features

- **GPU Particle System**: Thousands of particles simulated via WebGL compute shaders
- **Audio Reactive**: Real-time frequency analysis and beat detection using Meyda.js
- **Multiple Audio Sources**: Microphone input (web & desktop) or system audio capture (desktop only)
- **Color Palettes**: Multiple color schemes with beat-reactive palette transitions
- **Customizable Physics**: Gravity, orbit decay, ISCO effects, and more via Leva controls
- **Camera Modes**: Multiple camera presets with smooth GSAP transitions
- **Video Recording**: Export visualizations as video files
- **Cross Platform**: Runs as a web app or native desktop app

## Getting Started

### Web Development

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Desktop App Development

```bash
bun run electron:dev
```

This starts Next.js dev server and launches Electron.

### Building

**Web:**
```bash
bun run build
```

**Desktop:**
```bash
# macOS
bun run electron:package:mac

# Windows
bun run electron:package:win
```

Built apps are output to the `release/` directory.

## Audio Input

**Web App:** Uses microphone input only. Grant microphone permission when prompted.

**Desktop App:** Supports both microphone and system audio capture. System audio capture requires Screen Recording permission on macOS (the app will prompt you to enable it in System Preferences).

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - Three.js React renderer
- [Three.js](https://threejs.org) - WebGL graphics
- [Meyda](https://meyda.js.org) - Audio feature extraction
- [Leva](https://github.com/pmndrs/leva) - GUI controls
- [GSAP](https://greensock.com/gsap) - Animation library
- [Electron](https://www.electronjs.org) - Desktop app framework
- [electron-audio-loopback](https://github.com/nickcoutsos/electron-audio-loopback) - System audio capture

## License

MIT
