import type { UIMessage } from "@convex-dev/agent";

export type MessagePartStatus = "pending" | "streaming" | "done" | "running" | "failed";

export type MessagePart = {
  type: "tool" | "text" | "reasoning" | "error";
  key: string;
  status: MessagePartStatus;
  toolCallId?: string;
  toolName?: string;
  output?: unknown;
  input?: unknown;
  text?: string;
};

// Content parts from message - using Record for flexibility since SDK formats vary
type ContentPart = Record<string, unknown> & { type: string };

export function parseMessageParts(message: UIMessage): MessagePart[] {
  const parts: MessagePart[] = [];
  const messageId = message.key || message.id || "msg";

  // Check if message has parts array (AI SDK format)
  const messageParts = message.parts as ContentPart[] | undefined;

  if (!messageParts || messageParts.length === 0) {
    // Simple text message
    if (message.text?.trim()) {
      parts.push({
        type: "text",
        key: `${messageId}-text`,
        text: message.text,
        status: message.status === "streaming" ? "streaming" : "done",
      });
    }
    return parts;
  }

  // Process content parts in order
  for (let idx = 0; idx < messageParts.length; idx++) {
    const item = messageParts[idx];

    if (item.type === "reasoning") {
      parts.push({
        type: "reasoning",
        key: `${messageId}-reasoning-${idx}`,
        text: item.text as string | undefined,
        status: message.status === "streaming" ? "streaming" : "done",
      });
    } else if (item.type === "tool-call") {
      parts.push({
        type: "tool",
        key: `${messageId}-tool-${idx}`,
        toolCallId: item.toolCallId as string | undefined,
        toolName: item.toolName as string | undefined,
        status: "running",
        input: item.args ?? item.input,
      });
    } else if (item.type === "tool-result") {
      // Find matching tool call and update it
      const toolCallIdx = parts.findIndex(
        (part) => part.type === "tool" && part.toolCallId === item.toolCallId
      );

      const outputObj = item.output as { type?: string; value?: unknown } | undefined;
      const resultObj = item.result as { success?: boolean; error?: string } | undefined;
      const output = outputObj?.value ?? item.result;

      // Check for various error formats
      const isError =
        outputObj?.type === "error-text" ||
        outputObj?.type === "error" ||
        resultObj?.success === false;

      if (isError) {
        // Error result - extract error message
        const errorOutput = resultObj?.error ?? outputObj?.value ?? item.result;
        if (toolCallIdx !== -1) {
          parts[toolCallIdx].status = "failed";
          parts[toolCallIdx].output = errorOutput;
        } else {
          parts.push({
            type: "error",
            key: `${messageId}-error-${idx}`,
            toolCallId: item.toolCallId as string | undefined,
            toolName: item.toolName as string | undefined,
            status: "failed",
            output: errorOutput,
          });
        }
      } else {
        // Success result
        if (toolCallIdx !== -1) {
          parts[toolCallIdx].status = "done";
          parts[toolCallIdx].output = output;
        } else {
          parts.push({
            type: "tool",
            key: `${messageId}-tool-${idx}`,
            toolCallId: item.toolCallId as string | undefined,
            toolName: item.toolName as string | undefined,
            status: "done",
            output,
          });
        }
      }
    } else if (item.type === "text") {
      parts.push({
        type: "text",
        key: `${messageId}-text-${idx}`,
        text: item.text as string | undefined,
        status: message.status === "streaming" ? "streaming" : "done",
      });
    } else if (
      item.type.startsWith("tool-") &&
      item.type !== "tool-call" &&
      item.type !== "tool-result"
    ) {
      // Handle Convex Agent SDK format: type is "tool-{toolName}"
      const toolName = item.type.slice(5); // Remove "tool-" prefix
      const state = item.state as string | undefined;
      const output = item.output as Record<string, unknown> | undefined;

      // Check for error states
      const isError =
        state === "error" ||
        state === "failed" ||
        output?.type === "error" ||
        output?.type === "error-text" ||
        (typeof output?.error === "string" && output.error.length > 0);

      const isComplete = state === "output-available" || state === "done";

      if (isError) {
        parts.push({
          type: "error",
          key: `${messageId}-error-${idx}`,
          toolCallId: item.toolCallId as string | undefined,
          toolName,
          status: "failed",
          input: item.input,
          output: output?.error ?? output?.value ?? item.output,
        });
      } else {
        parts.push({
          type: "tool",
          key: `${messageId}-tool-${idx}`,
          toolCallId: item.toolCallId as string | undefined,
          toolName,
          status: isComplete ? "done" : "running",
          input: item.input,
          output: item.output,
        });
      }
    }
    // Ignore step-start and other unknown types
  }

  return parts;
}
