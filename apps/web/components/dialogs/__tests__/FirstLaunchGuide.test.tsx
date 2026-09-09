import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FirstLaunchGuide } from "../FirstLaunchGuide";

const STORAGE_KEY = "blackhole_getting_started";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("FirstLaunchGuide", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderGuide() {
    act(() => root.render(<FirstLaunchGuide />));

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  }

  function expectGuideStaysHiddenAfterRemount() {
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");

    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<FirstLaunchGuide />));

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  }

  it("shows once for a fresh browser and remembers dismissal", () => {
    renderGuide();

    const closeButton = document.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');
    expect(closeButton).not.toBeNull();

    act(() => closeButton?.click());

    expectGuideStaysHiddenAfterRemount();
  });

  it("remembers a visitor who follows the full setup guide", () => {
    renderGuide();

    const setupGuideLink = document.querySelector<HTMLAnchorElement>('a[href="/getting-started"]');
    expect(setupGuideLink).not.toBeNull();

    act(() => setupGuideLink?.click());

    expectGuideStaysHiddenAfterRemount();
  });
});
