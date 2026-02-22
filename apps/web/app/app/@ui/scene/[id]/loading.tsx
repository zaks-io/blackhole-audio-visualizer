import { Loader2 } from "lucide-react";

export default function SceneLoading() {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-white/70" />
        <span className="text-sm text-white/70">Loading scene...</span>
      </div>
    </div>
  );
}
