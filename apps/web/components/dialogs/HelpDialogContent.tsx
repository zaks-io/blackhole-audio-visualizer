import { Circle, ChevronRight, Mic, Monitor } from "lucide-react";

interface HelpDialogContentProps {
  onFullSetupGuideClick?: () => void;
}

export function HelpDialogContent({ onFullSetupGuideClick }: HelpDialogContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <Monitor className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Desktop: system audio</h4>
          <p className="text-sm text-muted-foreground">
            Download the desktop app to visualize music from your preferred music service or any
            other audio playing on your computer. Choose System Audio in Settings. On macOS, allow
            Screen Recording when prompted.
          </p>
          <a
            href="https://github.com/zaks-io/blackhole-audio-visualizer/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Download desktop app from GitHub
          </a>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Mic className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Browser: microphone</h4>
          <p className="text-sm text-muted-foreground">
            On a computer or phone, allow microphone access and press Start to visualize sound
            around you. The web app uses the microphone or audio input your browser provides; it
            cannot capture system audio directly.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <Circle className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Recording</h4>
          <p className="text-sm text-muted-foreground">
            Start and stop recording from Settings. The finished video downloads to this device.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Prefer the browser on macOS? The separate BlackHole audio driver can route system audio into
        a browser input. It takes extra setup; the desktop app captures system audio without that
        driver. See the full setup guide below.
      </p>

      <div className="pt-4 border-t border-white/5">
        <a
          href="/getting-started"
          onClick={onFullSetupGuideClick}
          className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Full setup guide
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
