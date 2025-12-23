import { Monitor, Mic, Wrench, ExternalLink } from "lucide-react";

export function HelpDialogContent() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <Monitor className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">
            Desktop App <span className="text-cyan-400">(Recommended)</span>
          </h4>
          <p className="text-sm text-muted-foreground">
            Captures system audio directly. Just play music and the visualizer reacts automatically.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Mic className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Web & Mobile</h4>
          <p className="text-sm text-muted-foreground">
            Uses your microphone to capture sound. Play music through your speakers or let it pick
            up ambient audio around you.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-orange-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Advanced: BlackHole (macOS)</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Route system audio directly to your microphone input for high-quality capture on web.
          </p>
          <a
            href="https://existential.audio/blackhole/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Download BlackHole
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
