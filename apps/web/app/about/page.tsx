import type { Metadata } from "next";
import { ArrowLeft, Sparkles, ThumbsUp, RefreshCw, Download } from "lucide-react";
import { TrackedLink, TrackedAnchor } from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "About — Blackhole Audio Visualizer",
  description:
    "A vibe-coded audio visualizer with AI-generated presets, community voting, and evolving visual experiences.",
};

const features = [
  {
    icon: Sparkles,
    label: "AI-Generated Presets",
    color: "bg-cyan/15 text-cyan",
    description:
      "AI agents design every preset — tuning particle physics, color palettes, and gravitational forces to create visuals that feel alive.",
  },
  {
    icon: ThumbsUp,
    label: "Community Voting",
    color: "bg-audio/15 text-audio",
    description:
      "Every session surfaces presets for you to vote on. The ones that resonate rise to the top. The ones that don't fade into the void.",
  },
  {
    icon: RefreshCw,
    label: "Evolving Over Time",
    color: "bg-[oklch(0.7_0.18_140)]/15 text-[oklch(0.7_0.18_140)]",
    description:
      "Vote data feeds back into generation. New presets riff on what the community loves, so the whole system drifts toward something nobody designed alone.",
  },
];

export default function AboutPage() {
  return (
    <main className="h-screen overflow-y-auto scrollbar-thin bg-background">
      {/* Background atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.14 0.02 260 / 50%) 0%, transparent 60%)",
        }}
      />

      {/* Decorative orbital ring */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div
          className="absolute w-[800px] h-[800px] rounded-full border border-white/[0.03]"
          style={{ animation: "orbit 90s linear infinite" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12 sm:py-20">
        {/* Nav */}
        <nav>
          <TrackedLink
            href="/"
            event="about_back_home"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Blackhole
          </TrackedLink>
        </nav>

        {/* Header */}
        <header className="mt-20 sm:mt-28">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-foreground">About</h1>
          <p className="mt-3 text-lg sm:text-xl text-muted-foreground tracking-wide">
            A vibe-coded audio visualizer
          </p>
        </header>

        {/* Intro */}
        <section className="mt-14 sm:mt-20">
          <p className="text-base text-muted-foreground leading-relaxed">
            Blackhole is a real-time audio visualizer that turns sound into gravitational particle
            physics. Hundreds of thousands of particles orbit, collapse, and explode in response to
            whatever you&rsquo;re listening to&mdash;rendered entirely on your GPU.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <TrackedLink
              href="/getting-started"
              event="about_getting_started"
              className="text-cyan hover:underline"
            >
              Check out the setup guide
            </TrackedLink>
            .
          </p>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        {/* How it works */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
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

        {/* Built with vibes */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Built with vibes</h2>
          <div className="mt-8 space-y-6">
            <p className="text-base text-muted-foreground leading-relaxed">
              This project is an experiment in vibe coding&mdash;building something by feel rather
              than spec. There&rsquo;s no grand architecture doc. The AI writes presets, the
              community shapes taste, and the system learns what works.
            </p>
            <blockquote className="border-l-2 border-cyan/30 pl-4 py-1 font-mono text-sm text-muted-foreground/80 leading-relaxed">
              Every preset you see was designed by an AI agent, refined by community taste.
            </blockquote>
            <p className="text-base text-muted-foreground leading-relaxed">
              The result is a visualizer that nobody fully designed&mdash;it emerged from the loop
              between generation and selection. It&rsquo;s always changing.
            </p>
          </div>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        {/* CTA */}
        <footer className="flex flex-col items-center text-center pb-16 sm:pb-24">
          <TrackedLink
            href="/app"
            event="about_launch"
            className="px-8 py-3 rounded-full bg-cyan text-cyan-foreground font-medium transition-all duration-300 hover:scale-105"
            style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
          >
            Launch Visualizer
          </TrackedLink>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <TrackedAnchor
              href="/release/macos/latest"
              event="about_download_macos"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download for Mac
            </TrackedAnchor>
            <TrackedAnchor
              href="/release/windows/latest"
              event="about_download_windows"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download for Windows
            </TrackedAnchor>
          </div>

          <p className="mt-6 text-sm text-muted-foreground/50">
            Created by{" "}
            <TrackedAnchor
              href="https://isaacsuttell.com"
              event="about_author"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors"
            >
              Isaac Suttell
            </TrackedAnchor>
          </p>
        </footer>
      </div>
    </main>
  );
}
