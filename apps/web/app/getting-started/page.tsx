import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Circle, Mic, Monitor, SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "Getting Started | Blackhole Audio Visualizer",
  description: "Connect live audio, choose a preset, and record the Blackhole visualizer.",
};

export default function GettingStartedPage() {
  return (
    <main className="h-screen overflow-y-auto scrollbar-thin bg-background">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.14 0.02 260 / 50%) 0%, transparent 60%)",
        }}
      />
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div
          className="absolute w-[800px] h-[800px] rounded-full border border-white/[0.03]"
          style={{ animation: "orbit 90s linear infinite" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12 sm:py-20">
        <nav>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Blackhole
          </Link>
        </nav>

        <header className="mt-20 sm:mt-28">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-foreground">
            Getting Started
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-muted-foreground tracking-wide">
            Connect audio and start watching
          </p>
        </header>

        <section className="mt-14 sm:mt-20">
          <p className="text-base text-muted-foreground leading-relaxed">
            Use a microphone in your browser, including on your phone, or download the desktop app
            to visualize system audio from your preferred music service. Press Start to connect
            audio and run random presets. Pause stops audio and pauses preset changes.
          </p>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        <section className="space-y-4">
          <div className="glass-panel rounded-xl p-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan/15 text-cyan flex items-center justify-center">
                <Monitor className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Desktop: system audio</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Download and open the desktop app, then choose Settings → Audio source → System
                  Audio. Play music from your preferred service or any other app on your computer.
                  On macOS, grant Screen Recording permission when prompted, then restart the
                  visualizer.
                </p>
                <a
                  href="https://github.com/zaks-io/blackhole-audio-visualizer/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm text-cyan hover:underline"
                >
                  Download desktop app from GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-audio/15 text-audio flex items-center justify-center">
                <Mic className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Browser: microphone</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Open the web app on your computer or phone, allow microphone access, and press
                  Start. Your microphone picks up music and other sounds around you. The web app can
                  use the microphone or audio inputs exposed by your browser, but cannot capture
                  system audio directly. Choose your input in your browser or device settings.
                  Microphone input is also available in the desktop app.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Optional browser setup on macOS</h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            If you prefer to stay in the browser, you can install BlackHole by Existential Audio, a
            separate audio driver unrelated to this visualizer. It routes system audio into an input
            your browser can use. The desktop app is the simpler option for system audio and does
            not need this driver.
          </p>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Follow the{" "}
            <a
              href="https://github.com/ExistentialAudio/BlackHole#record-system-audio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:underline"
            >
              BlackHole installation and routing guide
            </a>
            . Set up a Multi-Output Device with BlackHole and your speakers or headphones so you can
            still hear your music. Route your computer&apos;s output through that device, then
            choose BlackHole as the microphone input in your browser or device settings. Allow
            microphone access in the web app and press Start.
          </p>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Controls</h2>
          <div className="mt-8 space-y-4">
            <div className="glass-panel rounded-xl p-5 flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan/15 text-cyan flex items-center justify-center">
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Presets and playlists</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Choose a bundled preset, edit its parameters, or build a playlist. Your changes
                  stay on this device.
                </p>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5 flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-recording/15 text-recording flex items-center justify-center">
                <Circle className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Recording</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Start recording from Settings. When you stop, Blackhole saves the video directly
                  to your downloads.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        <footer className="flex flex-col items-center text-center pb-16 sm:pb-24">
          <Link
            href="/app"
            className="px-8 py-3 rounded-full bg-cyan text-cyan-foreground font-medium transition-all duration-300 hover:scale-105"
            style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
          >
            Launch Visualizer
          </Link>
        </footer>
      </div>
    </main>
  );
}
