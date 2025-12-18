'use client';

import { useState, useRef, useCallback } from 'react';

export interface AudioData {
  bass: number;
  mid: number;
  high: number;
  bassOnset: number;
  midOnset: number;
  highOnset: number;
}

export function useMicrophone() {
  const [isConnected, setIsConnected] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const prevAudioRef = useRef({ bass: 0, mid: 0, high: 0 });
  const onsetRef = useRef({ bass: 0, mid: 0, high: 0 });
  const onsetDecayRef = useRef(0.92);

  const setOnsetDecay = useCallback((value: number) => {
    onsetDecayRef.current = value;
  }, []);

  const connect = useCallback(async () => {
    if (isConnected) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  const getFrequencyData = useCallback((): AudioData => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    if (!analyser || !dataArray) {
      return { bass: 0, mid: 0, high: 0, bassOnset: 0, midOnset: 0, highOnset: 0 };
    }

    analyser.getByteFrequencyData(dataArray);
    const data = dataArray;

    // Calculate average for each frequency band
    // Bass: bins 0-10 (~0-860Hz at 44.1kHz sample rate)
    // Mid: bins 10-50 (~860-4300Hz)
    // High: bins 50-128 (~4300-11000Hz)
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let i = 0; i < 10; i++) {
      bassSum += data[i];
    }
    for (let i = 10; i < 50; i++) {
      midSum += data[i];
    }
    for (let i = 50; i < 128; i++) {
      highSum += data[i];
    }

    const bass = bassSum / 10 / 255;
    const mid = midSum / 40 / 255;
    const high = highSum / 78 / 255;

    // Onset detection: detect sudden increases (transients)
    const bassOnsetRaw = Math.max(0, bass - prevAudioRef.current.bass);
    const midOnsetRaw = Math.max(0, mid - prevAudioRef.current.mid);
    const highOnsetRaw = Math.max(0, high - prevAudioRef.current.high);

    // Envelope follower: fast attack, slow decay
    const decay = onsetDecayRef.current;
    onsetRef.current.bass = Math.max(bassOnsetRaw, onsetRef.current.bass * decay);
    onsetRef.current.mid = Math.max(midOnsetRaw, onsetRef.current.mid * decay);
    onsetRef.current.high = Math.max(highOnsetRaw, onsetRef.current.high * decay);

    // Store current values for next frame comparison
    prevAudioRef.current = { bass, mid, high };

    return {
      bass,
      mid,
      high,
      bassOnset: onsetRef.current.bass,
      midOnset: onsetRef.current.mid,
      highOnset: onsetRef.current.high,
    };
  }, []);

  const disconnect = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    setIsConnected(false);
  }, []);

  return { connect, disconnect, getFrequencyData, isConnected, setOnsetDecay };
}
