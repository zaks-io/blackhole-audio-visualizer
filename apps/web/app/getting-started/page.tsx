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
            Connect audio and press play
          </p>
        </header>

        <section className="mt-14 sm:mt-20">
          <p className="text-base text-muted-foreground leading-relaxed">
            Blackhole analyzes live audio on your device. Pick an input from the audio button in the
            top control bar.
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
                <h2 className="text-lg font-semibold text-foreground">System Audio</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Use this in the desktop app to react to music playing on your computer. On macOS,
                  grant Screen Recording permission when prompted, then restart Blackhole.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-audio/15 text-audio flex items-center justify-center">
                <Mic className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Microphone</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Use any microphone or audio input recognized by your computer. Grant microphone
                  access when your system asks.
                </p>
              </div>
            </div>
          </div>
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
