import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFeelingLucky } from "../useFeelingLucky";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import type { Preset } from "@/components/ProducerMode/types";

const { playPreset, stopAll, setMode, timers, to } = vi.hoisted(() => {
  const timers: Array<{
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
  }> = [];
  return {
    playPreset: vi.fn(),
    stopAll: vi.fn(),
    setMode: vi.fn(),
    timers,
    to: vi.fn(() => {
      const timer = { pause: vi.fn(), resume: vi.fn(), kill: vi.fn() };
      timers.push(timer);
      return timer;
    }),
  };
});
vi.mock("gsap", () => ({ default: { to } }));
vi.mock("@/components/ProducerMode/usePlayPreset", () => ({
  usePlayPreset: () => ({ playPreset, stopAll }),
}));
vi.mock("@/components/CameraSystem", () => ({ useCameraMode: () => ({ setMode }) }));

const presets = [{ id: "one" }, { id: "two" }] as Preset[];
let playback: ReturnType<typeof useFeelingLucky>;
function Harness({
  connected,
  availablePresets,
}: {
  connected: boolean;
  availablePresets: Preset[];
}) {
  const value = useFeelingLucky(availablePresets, connected);
  useEffect(() => {
    playback = value;
  }, [value]);
  return null;
}

describe("audio-controlled random presets", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.clearAllMocks();
    timers.length = 0;
    usePresetSelector.setState({
      mode: "feeling-lucky",
      selectedPresetId: null,
      isLuckyPlaying: false,
      shouldPlay: false,
      shouldStop: false,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render(connected: boolean, availablePresets = presets) {
    await act(async () =>
      root.render(<Harness connected={connected} availablePresets={availablePresets} />)
    );
  }

  it("waits for audio, then pauses and resumes the same cycle", async () => {
    await render(false);
    expect(playPreset).not.toHaveBeenCalled();
    await render(true);
    expect(playPreset).toHaveBeenCalledTimes(1);
    const timer = timers[0];
    await render(false);
    expect(timer.pause).toHaveBeenCalledOnce();
    expect(playback.state.isPaused).toBe(true);
    await act(async () => {
      playback.skip();
      usePresetSelector.getState().triggerPlay();
    });
    expect(timer.resume).not.toHaveBeenCalled();
    expect(playback.state.isPaused).toBe(true);
    expect(playPreset).toHaveBeenCalledTimes(1);
    await render(true);
    expect(timer.resume).toHaveBeenCalledOnce();
    expect(playPreset).toHaveBeenCalledTimes(1);
    await act(async () => playback.skip());
    expect(playPreset).toHaveBeenCalledTimes(2);
  });

  it("starts when presets finish loading after audio connects", async () => {
    await render(true, []);
    expect(playPreset).not.toHaveBeenCalled();
    await render(true);
    expect(playPreset).toHaveBeenCalledOnce();
  });

  it("keeps manual selection stopped and starts random when selected again", async () => {
    await render(true);
    await act(async () => usePresetSelector.getState().setMode("preset"));
    expect(timers[0].kill).toHaveBeenCalled();
    await render(false);
    await render(true);
    expect(playPreset).toHaveBeenCalledOnce();
    await act(async () => {
      usePresetSelector.getState().setMode("feeling-lucky");
      usePresetSelector.getState().triggerPlay();
    });
    expect(playPreset).toHaveBeenCalledTimes(2);
  });

  it("does not restart an editor stop on an unrelated render", async () => {
    await render(true);
    await act(async () => usePresetSelector.getState().triggerStop());
    await render(true);
    expect(playback.state.isPlaying).toBe(false);
    expect(playPreset).toHaveBeenCalledOnce();
    await render(false);
    await render(true);
    expect(playPreset).toHaveBeenCalledTimes(2);
  });

  it("cannot start from a preset selection while audio is disconnected", async () => {
    await render(false);
    await act(async () => usePresetSelector.getState().triggerPlay());
    expect(playPreset).not.toHaveBeenCalled();
    await render(true);
    expect(playPreset).toHaveBeenCalledOnce();
  });
});
