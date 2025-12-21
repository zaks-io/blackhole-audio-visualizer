"use client";

import { useRouter } from "next/navigation";
import { Film } from "lucide-react";
import { useConvexAuth } from "convex/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useConvexScenes, type SceneWithDetails } from "@/hooks/useConvexScenes";
import { useViewerMode } from "@/hooks/useViewerMode";

interface SceneSelectorProps {
  compact?: boolean;
  currentScene?: SceneWithDetails | null;
}

export function SceneSelector({ compact = false, currentScene }: SceneSelectorProps) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { scenes, publicScenes, isLoading } = useConvexScenes();
  const sceneId = useViewerMode((s) => s.sceneId);

  const handleValueChange = (value: string) => {
    if (value && value !== sceneId) {
      router.push(`/app/scene/${value}`);
    }
  };

  // Filter out user's scenes from public list to avoid duplicates
  const userSceneIds = new Set(scenes.map((s) => s._id));
  const filteredPublicScenes = publicScenes.filter((s) => !userSceneIds.has(s._id));

  const hasScenes = scenes.length > 0 || filteredPublicScenes.length > 0;
  const displayName = currentScene?.name || "Select Scene";

  return (
    <div className={cn("flex items-center gap-1", compact && "hidden sm:flex")}>
      <Select value={sceneId || ""} onValueChange={handleValueChange} disabled={isLoading}>
        <SelectTrigger
          className={cn(
            "h-10 min-w-[140px] gap-2 rounded-full border-0 bg-transparent px-3",
            "hover:bg-accent/50",
            "focus:ring-0 focus-visible:ring-0",
            isLoading && "opacity-50 cursor-wait"
          )}
        >
          <Film className="h-4 w-4 shrink-0" />
          <SelectValue placeholder="Select Scene">
            <span className="truncate max-w-[100px]">{displayName}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="!overflow-y-visible !max-h-none">
          {!hasScenes && (
            <SelectItem value="none" disabled>
              No scenes available
            </SelectItem>
          )}

          {isAuthenticated && scenes.length > 0 && (
            <>
              <SelectGroup>
                <SelectLabel>My Scenes</SelectLabel>
                {scenes.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              {filteredPublicScenes.length > 0 && <SelectSeparator />}
            </>
          )}

          {filteredPublicScenes.length > 0 && (
            <SelectGroup>
              <SelectLabel>Public Scenes</SelectLabel>
              {filteredPublicScenes.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
