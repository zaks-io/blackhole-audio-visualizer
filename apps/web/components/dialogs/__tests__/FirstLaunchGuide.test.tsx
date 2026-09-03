import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FirstLaunchGuide } from "../FirstLaunchGuide";

const COOKIE_NAME = "blackhole_getting_started";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("FirstLaunchGuide", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows once for a fresh browser and remembers dismissal", () => {
    act(() => root.render(<FirstLaunchGuide />));

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    const closeButton = document.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');
    expect(closeButton).not.toBeNull();

    act(() => closeButton?.click());

    expect(document.cookie).toContain(`${COOKIE_NAME}=1`);

    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<FirstLaunchGuide />));

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
