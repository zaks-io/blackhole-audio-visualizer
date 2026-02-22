import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProducerModeState, EaseFunction } from "./types";
import { DEFAULT_DURATION, DEFAULT_EASE } from "./producerConfig";

export const useProducerMode = create<ProducerModeState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      tweenStates: {},
      globalDuration: DEFAULT_DURATION,
      globalEase: DEFAULT_EASE,

      setOpen: (open) => set({ isOpen: open }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setGlobalDuration: (duration) => set({ globalDuration: duration }),
      setGlobalEase: (ease) => set({ globalEase: ease }),

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

      resetAllTweens: () => {
        set({ tweenStates: {} });
      },

      // Batch methods to avoid multiple Zustand updates
      batchStartTweens: (params) => {
        set((state) => {
          const newTweenStates = { ...state.tweenStates };
          for (const param of params) {
            newTweenStates[param.path] = {
              targetValue: param.targetValue,
              duration: param.duration,
              ease: param.ease,
              isTweening: true,
              progress: 0,
            };
          }
          return { tweenStates: newTweenStates };
        });
      },

      batchEndTweens: (paths, finalValues) => {
        set((state) => {
          const newTweenStates = { ...state.tweenStates };
          for (const path of paths) {
            if (newTweenStates[path]) {
              newTweenStates[path] = {
                ...newTweenStates[path],
                targetValue: finalValues[path] ?? newTweenStates[path].targetValue,
                isTweening: false,
                progress: 0,
              };
            }
          }
          return { tweenStates: newTweenStates };
        });
      },
    }),
    {
      name: "producer-mode",
      partialize: (state) => ({
        isOpen: state.isOpen,
        globalDuration: state.globalDuration,
        globalEase: state.globalEase,
      }),
    }
  )
);
