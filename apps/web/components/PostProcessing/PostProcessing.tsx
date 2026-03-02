"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { AudioReactiveEffects } from "@/components/AudioReactiveEffects";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";
import { GpuTimerQuery } from "@/lib/perf/gpuTimerQuery";
import { useFPSStore } from "@/hooks/useFPSMonitor";

interface PostProcessingProps {
  getAnalysis: () => AnalyzedAudio;
  isAudioConnected: boolean;
}

export function PostProcessing({ getAnalysis, isAudioConnected }: PostProcessingProps) {
  const { gl } = useThree();
  const timerRef = useRef<GpuTimerQuery | null>(null);
  const setPostGpuMs = useFPSStore((s) => s.setPostGpuMs);

  useEffect(() => {
    const timer = new GpuTimerQuery();
    timer.init(gl.getContext());
    timerRef.current = timer;
    return () => timer.dispose(gl.getContext());
  }, [gl]);

  // Start before EffectComposer render (priority 1)
  useFrame(() => {
    const timer = timerRef.current;
    if (!timer) return;
    timer.beginCpu();
    timer.begin(gl.getContext());
  }, 0);

  // End after EffectComposer render
  useFrame(() => {
    const timer = timerRef.current;
    if (!timer) return;
    timer.end(gl.getContext());
    timer.endCpu();
    setPostGpuMs(timer.poll(gl.getContext()));
  }, 2);

  return (
    <EffectComposer renderPriority={1} multisampling={0}>
      <SMAA />
      <AudioReactiveEffects getAnalysis={getAnalysis} isAudioConnected={isAudioConnected} />
    </EffectComposer>
  );
}
