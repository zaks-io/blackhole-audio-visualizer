"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Brain, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Streamdown } from "streamdown";
import remarkGfm from "remark-gfm";

interface ReasoningBlockProps {
  className?: string;
  title?: string;
  text: string;
  isStreaming?: boolean;
}

export function ReasoningBlock({
  className,
  title = "Thinking",
  text,
  isStreaming,
}: ReasoningBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: isStreaming ? "smooth" : "instant",
      });
    }
  }, [text, isStreaming]);

  return (
    <div
      className={cn(
        className,
        "px-2 min-h-10 min-w-0 bg-background/30 rounded-lg border overflow-hidden"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          className={cn(
            "flex items-center gap-2 py-1.5 w-full text-left",
            "hover:bg-white/5 rounded-md transition-colors"
          )}
        >
          <div className="w-6 h-6 rounded-full bg-zinc-600 flex items-center justify-center flex-shrink-0">
            <Brain className={cn("w-4 h-4 text-zinc-300", isStreaming && "animate-pulse")} />
          </div>
          <div className="relative w-full text-sm text-zinc-500 h-5 overflow-hidden">
            <span className="flex-1">{title}</span>
            <div
              ref={scrollRef}
              className={cn(
                "overflow-y-auto max-h-5 scrollbar-hide pointer-events-none",
                "absolute top-0 left-0 blur-[2px] opacity-50"
              )}
            >
              {text}
            </div>
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </motion.div>
        </CollapsibleTrigger>
        <CollapsibleContent className="text-sm text-zinc-400 p-2 pl-8">
          <div className="overflow-y-auto max-w-full max-h-32">
            <Streamdown remarkPlugins={[remarkGfm]}>{text}</Streamdown>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
