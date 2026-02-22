"use client";

import { memo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { SceneWithDetails } from "@/hooks/useConvexScenes";
import type { SectionTiming } from "@/hooks/useUnifiedPlayer";

interface SceneInfoPanelProps {
  scene: SceneWithDetails;
  sectionTimings: SectionTiming[];
  currentSectionIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function SceneInfoPanelComponent({
  scene,
  sectionTimings,
  currentSectionIndex,
  isOpen,
  onClose,
}: SceneInfoPanelProps) {
  const compositionPlan = scene.compositionPlan;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{scene.name}</SheetTitle>
          {scene.description && <SheetDescription>{scene.description}</SheetDescription>}
        </SheetHeader>

        <div className="h-[calc(100vh-120px)] mt-6 overflow-y-auto">
          <div className="space-y-6 pr-4">
            {/* Duration info */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Duration</h3>
              <p className="text-lg">{formatDuration(scene.audioDurationMs)}</p>
            </div>

            {/* Sections */}
            {compositionPlan && compositionPlan.sections.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Sections</h3>
                <div className="space-y-2">
                  {compositionPlan.sections.map((section, index) => {
                    const timing = sectionTimings[index];
                    const isActive = index === currentSectionIndex;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border transition-colors ${
                          isActive ? "border-primary bg-primary/10" : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{section.section_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(section.duration_ms)}
                          </span>
                        </div>
                        {timing && (
                          <div className="text-xs text-muted-foreground">
                            {formatDuration(timing.startTimeMs)} -{" "}
                            {formatDuration(timing.endTimeMs)}
                          </div>
                        )}
                        {section.lines.length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground italic">
                            {section.lines.slice(0, 2).join(" / ")}
                            {section.lines.length > 2 && "..."}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Style info */}
            {compositionPlan && compositionPlan.positive_global_styles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Style</h3>
                <div className="flex flex-wrap gap-1">
                  {compositionPlan.positive_global_styles.map((style, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const SceneInfoPanel = memo(SceneInfoPanelComponent);
