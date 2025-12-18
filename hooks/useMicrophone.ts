'use client';

import { useState, useRef, useCallback } from 'react';
import Meyda from 'meyda';

type MeydaAnalyzer = ReturnType<typeof Meyda.createMeydaAnalyzer>;

interface MeydaFeatures {
  rms?: number;
  spectralCentroid?: number;
  spectralFlatness?: number;
  spectralRolloff?: number;
  zcr?: number;
  amplitudeSpectrum?: Float32Array;
}

export interface SpectralFeatures {
  rms: number;
  spectralCentroid: number;
  spectralFlatness: number;
  spectralFlux: number;
  spectralRolloff: number;
  zcr: number;
  subBassRatio: number;
}

export interface AudioData {
  bandEnergies: Float32Array;
  bandOnsets: Float32Array;
  bandCount: number;
  spectral: SpectralFeatures;
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

const DEFAULT_SPECTRAL: SpectralFeatures = {
  rms: 0,
  spectralCentroid: 0,
  spectralFlatness: 0,
  spectralFlux: 0,
  spectralRolloff: 0,
  zcr: 0,
  subBassRatio: 0,
};

export function useMicrophone() {
  const [isConnected, setIsConnected] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meydaAnalyzerRef = useRef<MeydaAnalyzer | null>(null);
  const spectralFeaturesRef = useRef<SpectralFeatures>({ ...DEFAULT_SPECTRAL });
  const prevSpectrumRef = useRef<Float32Array | null>(null);

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

  const connect = useCallback(async (externalStream?: MediaStream) => {
    if (isConnected) return;

    const stream =
      externalStream ??
      (await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      }));

    streamRef.current = stream;
    const audioContext = new AudioContext();

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    // Initialize Meyda analyzer for spectral features
    const meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext,
      source,
      bufferSize: 512,
      featureExtractors: [
        'rms',
        'spectralCentroid',
        'spectralFlatness',
        'spectralRolloff',
        'zcr',
        'amplitudeSpectrum',
      ],
      callback: (features: MeydaFeatures | null) => {
        if (!features) return;

        const spectral = spectralFeaturesRef.current;
        const numBins = 512 / 2; // bufferSize / 2 = number of frequency bins
        const nyquist = audioContext.sampleRate / 2;

        // RMS (already 0-1 range, but can exceed 1 for loud signals)
        spectral.rms = Math.min(1, features.rms || 0);

        // Spectral centroid: Meyda returns bin index, normalize to 0-1
        spectral.spectralCentroid = Math.min(1, (features.spectralCentroid || 0) / numBins);

        // Spectral flatness: already 0-1
        spectral.spectralFlatness = features.spectralFlatness || 0;

        // Spectral rolloff: Meyda returns bin index, normalize to 0-1
        spectral.spectralRolloff = Math.min(1, (features.spectralRolloff || 0) / numBins);

        // Zero crossing rate: normalize (typical range 0-0.5)
        spectral.zcr = Math.min(1, (features.zcr || 0) * 2);

        // Calculate spectral flux from amplitude spectrum
        const spectrum = features.amplitudeSpectrum;
        if (spectrum && prevSpectrumRef.current) {
          let flux = 0;
          for (let i = 0; i < spectrum.length; i++) {
            const diff = spectrum[i] - prevSpectrumRef.current[i];
            flux += diff > 0 ? diff * diff : 0; // Only positive changes (onset)
          }
          spectral.spectralFlux = Math.min(1, Math.sqrt(flux) / 10);
        }
        if (spectrum) {
          prevSpectrumRef.current = new Float32Array(spectrum);
        }

        // Calculate sub-bass ratio (energy in 0-100Hz relative to total)
        if (spectrum) {
          const binSize = nyquist / spectrum.length;
          const subBassBins = Math.ceil(100 / binSize);
          let subBassEnergy = 0;
          let totalEnergy = 0;
          for (let i = 0; i < spectrum.length; i++) {
            const energy = spectrum[i] * spectrum[i];
            totalEnergy += energy;
            if (i < subBassBins) {
              subBassEnergy += energy;
            }
          }
          spectral.subBassRatio = totalEnergy > 0 ? subBassEnergy / totalEnergy : 0;
        }
      },
    });
    meydaAnalyzer.start();
    meydaAnalyzerRef.current = meydaAnalyzer;

    setIsConnected(true);
  }, [isConnected]);

  const getFrequencyData = useCallback((bandCount: number): AudioData => {
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const clampedBandCount = Math.min(Math.max(1, bandCount), MAX_BANDS);
    const energies = outputEnergiesRef.current;
    const onsets = outputOnsetsRef.current;
    const spectral = spectralFeaturesRef.current;

    if (!analyser || !dataArray) {
      energies.fill(0);
      onsets.fill(0);
      return {
        bandEnergies: energies,
        bandOnsets: onsets,
        bandCount: clampedBandCount,
        spectral: { ...DEFAULT_SPECTRAL },
      };
    }

    analyser.getByteFrequencyData(dataArray);
    const binCount = dataArray.length;

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
      spectral: { ...spectral },
    };
  }, []);

  const disconnect = useCallback(() => {
    if (meydaAnalyzerRef.current) {
      meydaAnalyzerRef.current.stop();
      meydaAnalyzerRef.current = null;
    }
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
    prevSpectrumRef.current = null;
    spectralFeaturesRef.current = { ...DEFAULT_SPECTRAL };
    setIsConnected(false);
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  return { connect, disconnect, getFrequencyData, isConnected, setOnsetDecay, getStream };
}
