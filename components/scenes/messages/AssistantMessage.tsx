"use client";

import { useMemo, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSmoothText } from "@convex-dev/agent/react";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@convex-dev/agent";
import { parseMessageParts, type MessagePart } from "@/lib/enrichedUIMessages";
import { ReasoningBlock } from "./ReasoningBlock";
import { DefaultToolResult } from "./tools/DefaultToolResult";
import { CompositionPlanToolResult } from "./tools/CompositionPlanToolResult";
import { GenerateSongButton } from "./tools/GenerateSongButton";
import { Streamdown } from "streamdown";
import remarkGfm from "remark-gfm";
import { Bug } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import "./markdown-styles.css";

type ToolRendererProps = {
  className?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePart["status"];
  onGenerate?: (songId: string) => void;
};

const TOOL_RENDERERS: Record<string, React.ComponentType<ToolRendererProps>> = {
  updateCompositionPlan: CompositionPlanToolResult,
  showGenerateSongButton: GenerateSongButton,
};

interface AssistantMessageTextProps {
  className?: string;
  text?: string;
  status: "streaming" | "done" | "pending";
}

const AssistantMessageText = memo(function AssistantMessageText({
  className,
  text,
  status,
}: AssistantMessageTextProps) {
  const [visibleText] = useSmoothText(text || "", {
    startStreaming: status === "streaming",
  });

  const renderedContent = useMemo(() => {
    if (!visibleText || visibleText.trim() === "") {
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 bg-muted-foreground/20" />
        </div>
      );
    }

    return (
      <div className="overflow-x-auto max-w-full">
        <Streamdown className="markdown-content space-y-2" remarkPlugins={[remarkGfm]}>
          {visibleText}
        </Streamdown>
      </div>
    );
  }, [visibleText]);

  return <div className={cn(className)}>{renderedContent}</div>;
});

interface AssistantMessageProps {
  className?: string;
  message: UIMessage;
  onGenerate?: (songId: string) => void;
}

export const AssistantMessage = memo(function AssistantMessage({
  className,
  message,
  onGenerate,
}: AssistantMessageProps) {
  const messageParts = useMemo(() => parseMessageParts(message), [message]);

  return (
    <div className={cn(className, "min-w-0 space-y-2")}>
      {messageParts.map((part, index) => {
        if (part.type === "error") {
          return (
            <Alert key={part.key} variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {typeof part.output === "string" ? part.output : "An error occurred"}
              </AlertDescription>
            </Alert>
          );
        }

        if (part.type === "reasoning" && part.text?.trim()) {
          const isStreaming = index + 1 >= messageParts.length;
          return (
            <ReasoningBlock
              key={part.key}
              text={part.text}
              isStreaming={isStreaming && message.status === "streaming"}
            />
          );
        }

        if (part.type === "tool" && part.toolName) {
          const Renderer = TOOL_RENDERERS[part.toolName] || DefaultToolResult;
          return (
            <Renderer
              key={part.key}
              toolName={part.toolName}
              input={part.input}
              output={part.output}
              status={part.status}
              onGenerate={onGenerate}
            />
          );
        }

        if (part.type === "text" && part.text?.trim()) {
          return (
            <AssistantMessageText
              key={part.key}
              text={part.text}
              status={
                part.status === "streaming"
                  ? "streaming"
                  : part.status === "pending"
                    ? "pending"
                    : "done"
              }
            />
          );
        }

        return null;
      })}
    </div>
  );
});
