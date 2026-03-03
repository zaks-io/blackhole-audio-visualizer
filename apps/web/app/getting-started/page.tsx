import type { Metadata } from "next";
import { ArrowLeft, Monitor, Mic, Wrench, Download, ExternalLink } from "lucide-react";
import { TrackedLink, TrackedAnchor } from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "Getting Started — Blackhole Audio Visualizer",
  description:
    "Set up audio input for Blackhole Audio Visualizer. Desktop app, web browser, or BlackHole plugin — pick your path.",
};

export default function GettingStartedPage() {
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
            event="getting_started_back_home"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Blackhole
          </TrackedLink>
        </nav>

        {/* Header */}
        <header className="mt-20 sm:mt-28">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-foreground">
            Getting Started
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-muted-foreground tracking-wide">
            Choose how you want to listen
          </p>
        </header>

        {/* Intro */}
        <section className="mt-14 sm:mt-20">
          <p className="text-base text-muted-foreground leading-relaxed">
            Blackhole needs audio input to drive the visualizer. There are three ways to set it
            up&mdash;pick whichever works for you.
          </p>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        {/* Desktop App */}
        <section>
          <div className="glass-panel rounded-xl p-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-cyan/15 text-cyan flex items-center justify-center">
                <Monitor className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  Desktop App <span className="text-cyan text-sm font-normal">(Recommended)</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Captures system audio directly. Play any music and the visualizer reacts
                  automatically&mdash;no microphone needed.
                </p>
              </div>
            </div>

            <ol className="mt-6 ml-13 space-y-3 text-sm text-muted-foreground list-decimal list-outside">
              <li className="leading-relaxed pl-1">
                Download the app for{" "}
                <TrackedAnchor
                  href="/release/macos/latest"
                  event="getting_started_download_macos"
                  className="text-cyan hover:underline"
                >
                  macOS
                </TrackedAnchor>{" "}
                or{" "}
                <TrackedAnchor
                  href="/release/windows/latest"
                  event="getting_started_download_windows"
                  className="text-cyan hover:underline"
                >
                  Windows
                </TrackedAnchor>
              </li>
              <li className="leading-relaxed pl-1">Open the app and play any music</li>
              <li className="leading-relaxed pl-1">
                <span className="text-foreground/80">macOS only:</span> Grant Screen Recording
                permission when prompted
              </li>
            </ol>

            <div className="mt-5 ml-13 rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3">
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                On macOS, system audio capture requires Screen Recording permission. Go to{" "}
                <span className="text-foreground/70">
                  System Settings &rarr; Privacy &amp; Security &rarr; Screen Recording
                </span>
                , enable Blackhole, then restart the app.
              </p>
            </div>
          </div>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        {/* Web Browser */}
        <section>
          <div className="glass-panel rounded-xl p-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-audio/15 text-audio flex items-center justify-center">
                <Mic className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Web Browser</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Works in any modern browser. Uses your microphone to pick up sound from your
                  speakers.
                </p>
              </div>
            </div>

            <ol className="mt-6 ml-13 space-y-3 text-sm text-muted-foreground list-decimal list-outside">
              <li className="leading-relaxed pl-1">
                Click{" "}
                <TrackedLink
                  href="/app"
                  event="getting_started_launch_web"
                  className="text-cyan hover:underline"
                >
                  Launch Visualizer
                </TrackedLink>
                &mdash;no download needed
              </li>
              <li className="leading-relaxed pl-1">
                Allow microphone access when your browser asks
              </li>
              <li className="leading-relaxed pl-1">Play music through your speakers</li>
            </ol>

            <div className="mt-5 ml-13 rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3">
              <h3 className="text-xs font-medium text-foreground/70 mb-2">
                Troubleshooting permissions
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground/80 leading-relaxed">
                <li>
                  <span className="text-foreground/70">Desktop:</span> Click the lock icon in your
                  address bar to manage permissions
                </li>
                <li>
                  <span className="text-foreground/70">iOS:</span> Settings &rarr; Safari &rarr;
                  Microphone
                </li>
                <li>After changing permissions, refresh the page</li>
              </ul>
            </div>
          </div>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        {/* BlackHole Plugin */}
        <section>
          <div className="glass-panel rounded-xl p-6">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center">
                <Wrench className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">
                  BlackHole Plugin{" "}
                  <span className="text-orange-400 text-sm font-normal">(macOS only)</span>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Route system audio digitally to your browser&rsquo;s microphone input. Same
                  lossless quality as the desktop app, no ambient noise.
                </p>
              </div>
            </div>

            <ol className="mt-6 ml-13 space-y-3 text-sm text-muted-foreground list-decimal list-outside">
              <li className="leading-relaxed pl-1">
                Download BlackHole from{" "}
                <TrackedAnchor
                  href="https://existential.audio/blackhole/"
                  event="getting_started_blackhole"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan hover:underline"
                >
                  existential.audio
                  <ExternalLink className="h-3 w-3" />
                </TrackedAnchor>
              </li>
              <li className="leading-relaxed pl-1">
                Open <span className="text-foreground/70">Audio MIDI Setup</span> (Spotlight &rarr;
                &ldquo;Audio MIDI Setup&rdquo;)
              </li>
              <li className="leading-relaxed pl-1">
                Click <span className="text-foreground/70">+</span> at the bottom left &rarr;{" "}
                <span className="text-foreground/70">Create Multi-Output Device</span>
              </li>
              <li className="leading-relaxed pl-1">
                Check both your speakers/headphones and{" "}
                <span className="text-foreground/70">BlackHole 2ch</span>
              </li>
              <li className="leading-relaxed pl-1">
                Set the Multi-Output Device as system output (
                <span className="text-foreground/70">
                  System Settings &rarr; Sound &rarr; Output
                </span>
                )
              </li>
              <li className="leading-relaxed pl-1">
                Launch the visualizer and select{" "}
                <span className="text-foreground/70">BlackHole 2ch</span> as your microphone
              </li>
            </ol>
          </div>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        {/* Quick comparison */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Quick comparison</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-4 w-4 text-cyan" />
                <h3 className="text-sm font-medium text-foreground">Desktop App</h3>
              </div>
              <dl className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <dt className="text-foreground/50">Audio</dt>
                  <dd>Lossless system audio</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">Setup</dt>
                  <dd>~2 minutes</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">Platforms</dt>
                  <dd>macOS, Windows</dd>
                </div>
              </dl>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Mic className="h-4 w-4 text-audio" />
                <h3 className="text-sm font-medium text-foreground">Web Browser</h3>
              </div>
              <dl className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <dt className="text-foreground/50">Audio</dt>
                  <dd>Via microphone</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">Setup</dt>
                  <dd>Instant</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">Platforms</dt>
                  <dd>Any browser</dd>
                </div>
              </dl>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-orange-400" />
                <h3 className="text-sm font-medium text-foreground">BlackHole</h3>
              </div>
              <dl className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <dt className="text-foreground/50">Audio</dt>
                  <dd>Lossless system audio</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">Setup</dt>
                  <dd>~5 minutes</dd>
                </div>
                <div>
                  <dt className="text-foreground/50">Platforms</dt>
                  <dd>macOS (web)</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <hr className="my-14 sm:my-20 border-white/5" />

        {/* CTA */}
        <footer className="flex flex-col items-center text-center pb-16 sm:pb-24">
          <TrackedLink
            href="/app"
            event="getting_started_launch"
            className="px-8 py-3 rounded-full bg-cyan text-cyan-foreground font-medium transition-all duration-300 hover:scale-105"
            style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
          >
            Launch Visualizer
          </TrackedLink>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <TrackedAnchor
              href="/release/macos/latest"
              event="getting_started_download_macos"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download for Mac
            </TrackedAnchor>
            <TrackedAnchor
              href="/release/windows/latest"
              event="getting_started_download_windows"
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
              event="getting_started_author"
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
