import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Circle, SlidersHorizontal, Waves } from "lucide-react";

export const metadata: Metadata = {
  title: "About | Blackhole Audio Visualizer",
  description: "A real-time, GPU-accelerated audio visualizer for live audio.",
};

const features = [
  {
    icon: Waves,
    label: "Live audio",
    color: "bg-cyan/15 text-cyan",
    description:
      "Connect system audio or a microphone and the particle simulation responds as the music plays.",
  },
  {
    icon: SlidersHorizontal,
    label: "Local presets",
    color: "bg-audio/15 text-audio",
    description:
      "Tune the physics, camera, and color controls. Save presets and playlists on this device.",
  },
  {
    icon: Circle,
    label: "Local recording",
    color: "bg-[oklch(0.7_0.18_140)]/15 text-[oklch(0.7_0.18_140)]",
    description: "Record the canvas with its audio and download the finished video directly.",
  },
];

export default function AboutPage() {
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
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-foreground">About</h1>
          <p className="mt-3 text-lg sm:text-xl text-muted-foreground tracking-wide">
            A real-time audio visualizer
          </p>
        </header>

        <section className="mt-14 sm:mt-20">
          <p className="text-base text-muted-foreground leading-relaxed">
            Blackhole turns live audio into gravitational particle physics. The simulation runs on
            your GPU and responds to the rhythm, energy, and frequency of whatever you play.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/getting-started" className="text-cyan hover:underline">
              Read the setup guide
            </Link>
            .
          </p>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">What it does</h2>
          <div className="mt-8 space-y-4">
            {features.map(({ icon: Icon, label, color, description }) => (
              <div key={label} className="glass-panel rounded-xl p-5 flex gap-4 items-start">
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-lg ${color} flex items-center justify-center`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
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
