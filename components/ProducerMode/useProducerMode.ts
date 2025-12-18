import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProducerModeState, EaseFunction } from "./types";
import { DEFAULT_DURATION, DEFAULT_EASE } from "./producerConfig";

export const useProducerMode = create<ProducerModeState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      tweenStates: {},

      setOpen: (open) => set({ isOpen: open }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      initParameter: (path, currentValue) => {
        const existing = get().tweenStates[path];
        if (!existing) {
          set((state) => ({
            tweenStates: {
              ...state.tweenStates,
              [path]: {
                targetValue: currentValue,
                duration: DEFAULT_DURATION,
                ease: DEFAULT_EASE,
                isTweening: false,
                progress: 0,
              },
            },
          }));
        }
      },

      setTargetValue: (path, value) => {
        set((state) => ({
          tweenStates: {
            ...state.tweenStates,
            [path]: {
              ...state.tweenStates[path],
              targetValue: value,
            },
          },
        }));
      },

      setDuration: (path, duration) => {
        set((state) => ({
          tweenStates: {
            ...state.tweenStates,
            [path]: {
              ...state.tweenStates[path],
              duration,
            },
          },
        }));
      },

      setEase: (path, ease: EaseFunction) => {
        set((state) => ({
          tweenStates: {
            ...state.tweenStates,
            [path]: {
              ...state.tweenStates[path],
              ease,
            },
          },
        }));
      },

      setIsTweening: (path, isTweening) => {
        set((state) => ({
          tweenStates: {
            ...state.tweenStates,
            [path]: {
              ...state.tweenStates[path],
              isTweening,
            },
          },
        }));
      },

      setProgress: (path, progress) => {
        set((state) => ({
          tweenStates: {
            ...state.tweenStates,
            [path]: {
              ...state.tweenStates[path],
              progress,
            },
          },
        }));
      },

      resetTween: (path, currentValue) => {
        set((state) => ({
          tweenStates: {
            ...state.tweenStates,
            [path]: {
              ...state.tweenStates[path],
              targetValue: currentValue,
              isTweening: false,
              progress: 0,
            },
          },
        }));
      },
    }),
    {
      name: "producer-mode",
      partialize: (state) => ({
        isOpen: state.isOpen,
      }),
    }
  )
);
