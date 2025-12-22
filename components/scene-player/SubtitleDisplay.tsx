"use client";

import { useRef, useEffect, memo, useMemo } from "react";
import type { TimeSubscriber } from "@/hooks/useUnifiedPlayer";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface TimedWord {
  text: string;
  start: number;
  end: number;
  index: number;
}

interface SubtitleDisplayProps {
  transcription: Doc<"transcriptions"> | null | undefined;
  subscribeToTime: (callback: TimeSubscriber) => () => void;
  getCurrentTime: () => number;
  isVisible?: boolean;
}

function findWordIndexAtTime(timedWords: TimedWord[], timeSeconds: number): number {
  if (timedWords.length === 0) return -1;

  let left = 0;
  let right = timedWords.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = timedWords[mid];

    if (timeSeconds >= word.start && timeSeconds < word.end) {
      return mid;
    } else if (timeSeconds < word.start) {
      right = mid - 1;
    } else {
      result = mid;
      left = mid + 1;
    }
  }

  return result;
}

function SubtitleDisplayComponent({
  transcription,
  subscribeToTime,
  getCurrentTime,
  isVisible = true,
}: SubtitleDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const lastWordIndexRef = useRef<number>(-1);
  const lastIsActiveRef = useRef<boolean>(false);

  const words = transcription?.words;
  const timedWords = useMemo(() => {
    if (!words) return [];
    return words
      .map((word, index) => ({ ...word, index }))
      .filter(
        (w): w is TimedWord & { type: "word" } =>
          w.start !== null && w.end !== null && w.type === "word"
      )
      .map((w) => ({
        text: w.text,
        start: w.start,
        end: w.end,
        index: w.index,
      }));
  }, [words]);

  useEffect(() => {
    if (timedWords.length === 0) return;
    if (!containerRef.current || !wordsContainerRef.current) return;

    // Set padding so first/last words can be centered
    const containerWidth = containerRef.current.offsetWidth;
    const padding = containerWidth / 2;
    wordsContainerRef.current.style.paddingLeft = `${padding}px`;
    wordsContainerRef.current.style.paddingRight = `${padding}px`;

    const positionToWord = (wordIndex: number) => {
      if (!wordsContainerRef.current || !containerRef.current) return;
      const wordEl = wordRefs.current.get(wordIndex);
      if (wordEl) {
        const wordLeft = wordEl.offsetLeft;
        const wordWidth = wordEl.offsetWidth;
        const targetX = wordLeft - containerWidth / 2 + wordWidth / 2;
        wordsContainerRef.current.style.transform = `translateX(-${targetX}px)`;
      }
    };

    const updateSubtitles = (currentTime: number) => {
      const currentWordIndex = findWordIndexAtTime(timedWords, currentTime);

      // Check if word should still be highlighted (within 1s of word end)
      const word = currentWordIndex >= 0 ? timedWords[currentWordIndex] : null;
      const isActiveWord = word !== null && currentTime < word.end + 1;

      if (currentWordIndex === lastWordIndexRef.current && isActiveWord === lastIsActiveRef.current)
        return;
      lastWordIndexRef.current = currentWordIndex;
      lastIsActiveRef.current = isActiveWord;

      wordRefs.current.forEach((span, index) => {
        span.classList.remove(
          "subtitle-word-active",
          "subtitle-word-upcoming",
          "subtitle-word-past"
        );

        if (index === currentWordIndex && isActiveWord) {
          span.classList.add("subtitle-word-active");
        } else if (index <= currentWordIndex) {
          span.classList.add("subtitle-word-past");
        } else {
          span.classList.add("subtitle-word-upcoming");
        }
      });

      // Position to current word, or first word if before any word starts
      const targetIndex = currentWordIndex >= 0 ? currentWordIndex : 0;
      positionToWord(targetIndex);
    };

    // Use requestAnimationFrame to ensure layout is complete before positioning
    requestAnimationFrame(() => {
      updateSubtitles(getCurrentTime());
    });

    const unsubscribe = subscribeToTime((currentTime) => {
      updateSubtitles(currentTime);
    });

    return unsubscribe;
  }, [timedWords, subscribeToTime, getCurrentTime]);

  if (!transcription || transcription.status !== "completed" || timedWords.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-40",
        "w-[80vw] max-w-2xl h-8 overflow-hidden",
        "pointer-events-none subtitle-container",
        "transition-opacity duration-300",
        !isVisible && "opacity-0"
      )}
    >
      <div
        ref={wordsContainerRef}
        className="whitespace-nowrap transition-transform duration-300 ease-out"
      >
        {timedWords.map((word, index) => (
          <span
            key={`${word.index}-${word.start}`}
            ref={(el) => {
              if (el) wordRefs.current.set(index, el);
              else wordRefs.current.delete(index);
            }}
            className="subtitle-word inline-block mx-1 text-lg font-medium subtitle-word-upcoming"
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  );
}

export const SubtitleDisplay = memo(SubtitleDisplayComponent);
