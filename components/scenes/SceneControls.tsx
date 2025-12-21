"use client";

import { useRouter } from "next/navigation";
import { Film, Plus } from "lucide-react";
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
import { useConvexScenes } from "@/hooks/useConvexScenes";
import { useSceneControls } from "./useSceneControls";

interface SceneControlsProps {
  compact?: boolean;
}

export function SceneControls({ compact = false }: SceneControlsProps) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { scenes, publicScenes, isLoading } = useConvexScenes();
  const { openSceneEditor, setIsCreatingScene, setChatThreadId } = useSceneControls();

  const handleValueChange = (value: string) => {
    if (value === "none") {
      // Stay on current page
      return;
    } else if (value === "create") {
      setIsCreatingScene(true);
      setChatThreadId(null);
      openSceneEditor();
    } else {
      // Navigate to dedicated scene page
      router.push(`/app/scene/${value}`);
    }
  };

  const hasScenes = scenes.length > 0 || publicScenes.length > 0;

  return (
    <div className="flex items-center gap-1">
      <div className={cn(compact && "hidden sm:block")}>
        <Select value="none" onValueChange={handleValueChange} disabled={isLoading}>
          <SelectTrigger
            className={cn(
              "h-10 w-36 gap-2 rounded-full border-0 bg-transparent px-3",
              "hover:bg-accent/50",
              "focus:ring-0 focus-visible:ring-0",
              isLoading && "opacity-50 cursor-wait"
            )}
          >
            <Film className="h-4 w-4" />
            <SelectValue placeholder="Scene">Scene</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" className="!overflow-y-visible !max-h-none">
            <SelectItem value="none">None</SelectItem>

            <SelectSeparator />

            <SelectItem value="create">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Scene
              </span>
            </SelectItem>

            {hasScenes && <SelectSeparator />}

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
                {publicScenes.length > 0 && <SelectSeparator />}
              </>
            )}

            {publicScenes.length > 0 && (
              <SelectGroup>
                <SelectLabel>Public Scenes</SelectLabel>
                {publicScenes.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
