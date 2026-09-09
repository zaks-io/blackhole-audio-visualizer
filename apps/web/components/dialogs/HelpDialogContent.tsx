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
          <h4 className="text-sm font-medium mb-1">System Audio</h4>
          <p className="text-sm text-muted-foreground">
            Captures audio playing on your computer. macOS asks for Screen Recording permission the
            first time you connect.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Mic className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-1">Microphone</h4>
          <p className="text-sm text-muted-foreground">
            Uses a microphone or another audio input recognized by your computer.
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
