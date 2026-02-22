"use client";

import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { AudioReactiveEffects } from "@/components/AudioReactiveEffects";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";

interface PostProcessingProps {
  getAnalysis: () => AnalyzedAudio;
  isAudioConnected: boolean;
}

export function PostProcessing({ getAnalysis, isAudioConnected }: PostProcessingProps) {
  return (
    <EffectComposer>
      <SMAA />
      <AudioReactiveEffects getAnalysis={getAnalysis} isAudioConnected={isAudioConnected} />
    </EffectComposer>
  );
}
