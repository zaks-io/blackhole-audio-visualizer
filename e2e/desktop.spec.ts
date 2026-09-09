import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, access, stat, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const product = "Blackhole Audio Visualizer";
const executable =
  process.platform === "darwin"
    ? path.resolve(`release/mac-${process.arch}/${product}.app/Contents/MacOS/${product}`)
    : path.resolve(`release/win-unpacked/${product}.exe`);

test("packaged app plays and saves presets, playlists, and video offline", async ({}, testInfo) => {
  await access(executable);
  const profile = await mkdtemp(path.join(tmpdir(), "blackhole-offline-test-"));
  const environment = { ...process.env };
  // Coding-agent hosts can export this for their own Electron Node subprocesses.
  delete environment.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    env: environment,
    executablePath: executable,
    args: [`--user-data-dir=${profile}`],
    offline: true,
  });
  try {
    expect(await app.evaluate(({ app }) => app.isPackaged)).toBe(true);
    const page = await app.firstWindow();
    const errors: string[] = [];
    const externalRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    app.context().on("request", (request) => {
      if (/^https?:/.test(request.url())) externalRequests.push(request.url());
    });
    // Exercise the real Web Audio/worker/recording pipeline with generated sound.
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const output = context.createMediaStreamDestination();
        oscillator.frequency.value = 110;
        oscillator.connect(output);
        oscillator.start();
        await context.resume();
        return output.stream;
      };
    });
    await page.reload();
    await expect(page).toHaveURL("app://./app.html");
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
    await expect(page.locator("canvas")).toBeVisible();
    const guide = page.getByRole("dialog", { name: "Getting Started" });
    if (await guide.isVisible())
      await guide.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByText("Sign In", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Scene Agent", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Preset editor", exact: true }).click();
    await page.getByRole("button", { name: "Create new preset", exact: true }).click();
    await page.getByPlaceholder("Preset name").fill("Offline test preset");
    await page.getByRole("dialog").getByRole("button", { name: "Create", exact: true }).click();
    await page.getByRole("button", { name: "Play preset", exact: true }).click();
    await page.getByRole("tab", { name: "Playlists", exact: true }).click();
    await page.getByRole("button", { name: "Create Playlist", exact: true }).click();
    await page.getByPlaceholder("Playlist name").fill("Offline test playlist");
    await page.getByRole("dialog").getByRole("button", { name: "Create", exact: true }).click();
    await page.getByRole("button", { name: "Add Preset", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Offline test preset", exact: true })
      .click();
    await page.getByRole("button", { name: "Play Playlist", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause playlist", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Stop playlist", exact: true }).click();

    await page.reload();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(guide).not.toBeVisible();
    const saved = await page.evaluate(() => ({
      presets: JSON.parse(localStorage.getItem("producer-presets")!).state.presets,
      playlists: JSON.parse(localStorage.getItem("producer-playlists")!).state.playlists,
    }));
    expect(saved.presets).toHaveLength(1);
    expect(saved.presets[0].name).toBe("Offline test preset");
    expect(saved.playlists[0].items[0].presetId).toBe(saved.presets[0].id);

    await page.getByRole("button", { name: "Connect audio", exact: true }).click();
    await page.getByRole("menuitem", { name: "Microphone", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Microphone connected", exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("button", { name: "Start Recording", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Recording / })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recording 0:01", exact: true })).toBeVisible();
    const directory = testInfo.outputPath("recording");
    await mkdir(directory, { recursive: true });
    // Choose the destination through Electron's native download API during the test.
    const download = await app.evaluateHandle(({ session }, directory) => {
      const result = { state: "waiting", filename: "" };
      session.defaultSession.once("will-download", (_event, item) => {
        result.filename = item.getFilename();
        item.setSavePath(`${directory}/${result.filename}`);
        item.once("done", (_event, state) => {
          result.state = state;
        });
      });
      return result;
    }, directory);
    await page.getByRole("button", { name: /^Recording / }).click();
    await expect.poll(() => download.evaluate((result) => result.state)).toBe("completed");
    const videoPath = path.join(directory, await download.evaluate((result) => result.filename));
    expect((await stat(videoPath)).size).toBeGreaterThan(1000);
    await page.keyboard.press("Escape");
    await page.screenshot({ path: testInfo.outputPath("offline-visualizer.png") });
    await page.goto("app://./getting-started");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Getting Started", exact: true })).toBeVisible();
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
  }
});
