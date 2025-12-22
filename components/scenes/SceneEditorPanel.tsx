"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Music, Sparkles, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSceneControls } from "./useSceneControls";
import { useConvexScenes, useAllConversations } from "@/hooks/useConvexScenes";
import { useUIMessages } from "@convex-dev/agent/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AssistantMessage } from "./messages/AssistantMessage";
import { ThreadAudioPlayer } from "./ThreadAudioPlayer";

export function SceneEditorPanel({ sceneId }: { sceneId?: string }) {
  const {
    isSceneEditorOpen,
    closeSceneEditor,
    chatThreadId,
    setChatThreadId,
    isCreatingScene,
    setIsCreatingScene,
  } = useSceneControls();

  const { createSceneThread, sendSceneMessage, startSongGeneration } = useConvexScenes();

  const { conversations } = useAllConversations();

  const { results: messages } = useUIMessages(
    api.model.scenes.public.listThreadMessages,
    chatThreadId ? { threadId: chatThreadId } : "skip",
    { initialNumItems: 50, stream: true }
  );

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const isStreaming = !!(chatThreadId && messages?.some((m) => m.status === "streaming"));

  useEffect(() => {
    const currentCount = messages?.length ?? 0;
    if (currentCount > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
    prevMessageCountRef.current = currentCount;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const prompt = inputValue.trim();
    setInputValue("");

    let threadId: string = chatThreadId ?? "";

    if (!chatThreadId) {
      const result = await createSceneThread(sceneId);
      threadId = result.threadId;
      setChatThreadId(threadId);
    }

    await sendSceneMessage(threadId, prompt, sceneId);
  };

  const handleGenerate = useCallback(
    async (songId: string) => {
      await startSongGeneration(songId as Id<"generatedSongs">);
    },
    [startSongGeneration]
  );

  const handleNewConversation = () => {
    setChatThreadId(null);
    setIsCreatingScene(true);
  };

  const handleSelectConversation = (threadId: string) => {
    setChatThreadId(threadId);
    setIsCreatingScene(false);
  };

  const displayMessages = chatThreadId ? (messages ?? []) : [];

  return (
    <div
      className={cn(
        "h-screen flex flex-col border-l border-white/10 glass-panel-solid z-40",
        "transition-all duration-300 ease-out overflow-hidden",
        isSceneEditorOpen ? "w-96" : "w-0"
      )}
    >
      <div className="w-96 h-full flex flex-col min-w-96">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {isCreatingScene ? "Create Scene" : "Edit Scene"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-white/10"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleNewConversation}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  New Conversation
                </DropdownMenuItem>
                {conversations.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {conversations.map((conv) => (
                      <DropdownMenuItem
                        key={conv._id}
                        onClick={() => handleSelectConversation(conv.threadId)}
                        className={cn(chatThreadId === conv.threadId && "bg-primary/10")}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {conv.title || "Untitled"}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeSceneEditor}
              className="h-7 w-7 rounded-md hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {displayMessages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                Hi! I&apos;m here to help you create a song for the visualizer.
              </p>
              <p className="text-sm mt-2">Tell me about the mood, genre, or theme you want.</p>
            </div>
          )}

          {displayMessages.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg.key}
                className="max-w-[85%] ml-auto rounded-xl px-4 py-2 bg-primary text-primary-foreground"
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
            ) : (
              <AssistantMessage key={msg.key} message={msg} onGenerate={handleGenerate} />
            )
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Persistent Audio Player */}
        <ThreadAudioPlayer threadId={chatThreadId} />

        {/* Input */}
        <div className="p-4 border-t border-white/5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe your song..."
              disabled={isStreaming}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!inputValue.trim() || isStreaming}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
