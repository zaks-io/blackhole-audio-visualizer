import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative w-screen h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Orbital rings - decorative background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full border border-white/5"
          style={{ animation: "orbit 60s linear infinite" }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full border border-cyan/10"
          style={{ animation: "orbit-reverse 45s linear infinite" }}
        />
        <div
          className="absolute w-[200px] h-[200px] rounded-full border border-cyan/20"
          style={{ animation: "orbit 30s linear infinite" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <h1 className="text-6xl sm:text-8xl font-bold tracking-tighter text-foreground">
          Blackhole
        </h1>
        <p className="text-xl sm:text-2xl text-muted-foreground mt-2 tracking-wide">
          Audio Visualizer
        </p>
        <p className="text-sm text-muted-foreground/60 mt-4 max-w-xs">Listen to the void</p>
        <Link
          href="/app"
          className="mt-10 px-8 py-3 rounded-full bg-cyan text-cyan-foreground font-medium transition-all duration-300 hover:scale-105"
          style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
        >
          Launch Visualizer
        </Link>

        <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground/50">
          <Link href="/getting-started" className="hover:text-muted-foreground transition-colors">
            Getting Started
          </Link>
          <span>&middot;</span>
          <Link href="/about" className="hover:text-muted-foreground transition-colors">
            About
          </Link>
        </div>
      </div>
    </main>
  );
}
