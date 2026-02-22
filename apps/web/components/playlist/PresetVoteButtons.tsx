"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Id } from "@blackhole/backend/convex/_generated/dataModel";

interface PresetVoteButtonsProps {
  presetId: string | null;
}

export function PresetVoteButtons({ presetId }: PresetVoteButtonsProps) {
  const { isAuthenticated } = useConvexAuth();
  const voteMutation = useMutation(api.model.presetVotes.public.vote);

  const summary = useQuery(
    api.model.presetVotes.public.getVoteSummary,
    presetId ? { presetId: presetId as Id<"presets"> } : "skip"
  );

  if (!isAuthenticated || !presetId) return null;

  const handleVote = (vote: 1 | -1) => {
    voteMutation({ presetId: presetId as Id<"presets">, vote });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-0.5 glass-panel rounded-full px-2 py-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full",
              summary?.userVote === 1 && "text-green-400 bg-green-400/10"
            )}
            onClick={() => handleVote(1)}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Upvote</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full",
              summary?.userVote === -1 && "text-red-400 bg-red-400/10"
            )}
            onClick={() => handleVote(-1)}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Downvote</TooltipContent>
      </Tooltip>
    </div>
  );
}
