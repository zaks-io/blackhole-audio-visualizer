"use client";

import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { HelpDialogContent } from "./HelpDialogContent";

interface HelpDialogProps {
  children?: ReactNode;
}

export function HelpDialog({ children }: HelpDialogProps) {
  const content = (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Getting Started</DialogTitle>
      </DialogHeader>
      <Separator />
      <HelpDialogContent />
    </DialogContent>
  );

  if (children) {
    return (
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Help
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {content}
    </Dialog>
  );
}
