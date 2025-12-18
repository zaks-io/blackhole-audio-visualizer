'use client';

import { useState, useRef, useCallback } from 'react';

export interface AudioData {
  bandEnergies: Float32Array;
  bandOnsets: Float32Array;
  bandCount: number;
}

const MAX_BANDS = 36;

// Get logarithmic frequency band boundaries for perceptually balanced bands
function getBandBoundaries(binCount: number, bandCount: number): number[] {
  const boundaries: number[] = [0];
  const logMin = Math.log(1);
  const logMax = Math.log(binCount);

  for (let i = 1; i <= bandCount; i++) {
    const logVal = logMin + (logMax - logMin) * (i / bandCount);
    boundaries.push(Math.round(Math.exp(logVal)));
  }
  return boundaries;
}

export function useMicrophone() {
  const [isConnected, setIsConnected] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Dynamic band arrays
  const prevBandEnergiesRef = useRef<Float32Array>(new Float32Array(MAX_BANDS));
  const bandOnsetsRef = useRef<Float32Array>(new Float32Array(MAX_BANDS));
  const onsetDecayRef = useRef(0.92);

  // Reusable output arrays to avoid GC pressure
  const outputEnergiesRef = useRef<Float32Array>(new Float32Array(MAX_BANDS));
  const outputOnsetsRef = useRef<Float32Array>(new Float32Array(MAX_BANDS));

  const setOnsetDecay = useCallback((value: number) => {
    onsetDecayRef.current = value;
  }, []);

  const connect = useCallback(async () => {
    if (isConnected) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 48000,
        channelCount: 2,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    streamRef.current = stream;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    setIsConnected(true);
  }, [isConnected]);

  const getFrequencyData = useCallback((bandCount: number): AudioData => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const clampedBandCount = Math.min(Math.max(1, bandCount), MAX_BANDS);
    const energies = outputEnergiesRef.current;
    const onsets = outputOnsetsRef.current;

    if (!analyser || !dataArray) {
      energies.fill(0);
      onsets.fill(0);
      return { bandEnergies: energies, bandOnsets: onsets, bandCount: clampedBandCount };
    }

    analyser.getByteFrequencyData(dataArray);
    const binCount = dataArray.length; // 128 bins

    // Get logarithmic band boundaries
    const boundaries = getBandBoundaries(binCount, clampedBandCount);

    const decay = onsetDecayRef.current;
    const prevEnergies = prevBandEnergiesRef.current;
    const currentOnsets = bandOnsetsRef.current;

    // Calculate energy for each band
    for (let band = 0; band < clampedBandCount; band++) {
      const startBin = boundaries[band];
      const endBin = boundaries[band + 1];
      const binRange = Math.max(1, endBin - startBin);

      let sum = 0;
      for (let i = startBin; i < endBin; i++) {
        sum += dataArray[i];
      }

      const energy = sum / binRange / 255;
      energies[band] = energy;

      // Onset detection: detect sudden increases (transients)
      const onsetRaw = Math.max(0, energy - prevEnergies[band]);

      // Envelope follower: fast attack, slow decay
      currentOnsets[band] = Math.max(onsetRaw, currentOnsets[band] * decay);
      onsets[band] = currentOnsets[band];

      // Store current energy for next frame
      prevEnergies[band] = energy;
    }

    // Zero out unused bands
    for (let band = clampedBandCount; band < MAX_BANDS; band++) {
      energies[band] = 0;
      onsets[band] = 0;
    }

    return {
      bandEnergies: energies,
      bandOnsets: onsets,
      bandCount: clampedBandCount,
    };
  }, []);

  const disconnect = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    setIsConnected(false);
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  return { connect, disconnect, getFrequencyData, isConnected, setOnsetDecay, getStream };
}
