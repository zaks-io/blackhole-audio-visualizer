"use client";

import { EffectComposer } from "@react-three/postprocessing";
import { AudioReactiveEffects } from "@/components/AudioReactiveEffects";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";

interface PostProcessingProps {
  getAnalysis: () => AnalyzedAudio;
  isAudioConnected: boolean;
}

export function PostProcessing({ getAnalysis, isAudioConnected }: PostProcessingProps) {
  return (
    <EffectComposer>
      <AudioReactiveEffects getAnalysis={getAnalysis} isAudioConnected={isAudioConnected} />
    </EffectComposer>
  );
}
