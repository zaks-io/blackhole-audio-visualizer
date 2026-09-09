import { expect, test, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const runProcess = promisify(execFile);
let fixtureBundle = "";

test.beforeAll(async () => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "particle-physics-"));
  const outputPath = path.join(outputDirectory, "fixture.js");
  await runProcess("bun", [
    "build",
    path.resolve("e2e/fixtures/particlePhysics.ts"),
    "--target=browser",
    "--format=iife",
    "--loader=.glsl:text",
    `--outfile=${outputPath}`,
  ]);
  fixtureBundle = await readFile(outputPath, "utf8");
});

test.beforeEach(async ({ page }) => {
  await page.route("http://particle-physics.test/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/fixture.js") {
      await route.fulfill({ contentType: "text/javascript", body: fixtureBundle });
      return;
    }
    await route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><canvas></canvas><script src="/fixture.js"></script>',
    });
  });
  await page.goto("http://particle-physics.test/");
  await page.waitForFunction(() => "particlePhysics" in window);
});

async function runFixture<T>(page: Page, name: string): Promise<T> {
  return page.evaluate(async (fixtureName) => {
    const fixtures = (
      window as unknown as { particlePhysics: Record<string, () => Promise<unknown>> }
    ).particlePhysics;
    return fixtures[fixtureName]();
  }, name) as Promise<T>;
}

test("softened circular orbit conserves energy and angular momentum over three periods", async ({
  page,
}) => {
  const result = await runFixture<{
    periods: number;
    maxEnergyDrift: number;
    maxAngularMomentumDrift: number;
    finalRadius: number;
    shaderErrors: string[];
  }>(page, "orbitStability");
  expect(result.shaderErrors).toEqual([]);
  expect(result.periods).toBeGreaterThanOrEqual(3);
  expect(result.maxEnergyDrift).toBeLessThan(0.0001);
  expect(result.maxAngularMomentumDrift).toBeLessThan(0.0001);
  expect(result.finalRadius).toBeCloseTo(20, 1);
});

test("production gravity orbit remains bounded over three periods", async ({ page }) => {
  const result = await runFixture<{
    periods: number;
    maxEnergyDrift: number;
    maxAngularMomentumDrift: number;
    finalRadius: number;
    shaderErrors: string[];
  }>(page, "productionGravityOrbit");
  expect(result.shaderErrors).toEqual([]);
  expect(result.periods).toBeGreaterThanOrEqual(3);
  expect(result.maxEnergyDrift).toBeLessThan(0.001);
  expect(result.maxAngularMomentumDrift).toBeLessThan(0.00001);
  expect(result.finalRadius).toBeGreaterThan(19.5);
  expect(result.finalRadius).toBeLessThan(20.5);
});

test("conservative orbit returns to its initial state after forward and reverse flow", async ({
  page,
}) => {
  const result = await runFixture<{
    positionDifference: number;
    velocityDifference: number;
    initialAge: number;
    finalAge: number;
    shaderErrors: string[];
  }>(page, "reversibleOrbit");
  expect(result.shaderErrors).toEqual([]);
  expect(result.positionDifference).toBeLessThan(0.001);
  expect(result.velocityDifference).toBeLessThan(0.005);
  expect(result.initialAge).toBe(1);
  expect(result.finalAge).toBeCloseTo(9, 3);
});

test("reverse flow remains finite with strong ISCO and frame dragging", async ({ page }) => {
  const result = await runFixture<{
    allFinite: boolean;
    maxMagnitude: number;
    age: number;
    shaderErrors: string[];
  }>(page, "reverseStrongIsco");
  expect(result.shaderErrors).toEqual([]);
  expect(result.allFinite).toBe(true);
  expect(result.maxMagnitude).toBeLessThan(1_000_000);
  expect(result.age).toBeGreaterThan(1);
});

test("spawn queue advances once per physics step", async ({ page }) => {
  const result = await runFixture<{ lifetime: number; shaderErrors: string[] }>(
    page,
    "queueTiming"
  );
  expect(result.shaderErrors).toEqual([]);
  expect(result.lifetime).toBeCloseTo(-0.25, 5);
});

test("zero delta leaves GPU state untouched", async ({ page }) => {
  const result = await runFixture<{
    positionDifference: number;
    velocityDifference: number;
    drawCalls: number;
    shaderErrors: string[];
  }>(page, "zeroDelta");
  expect(result.shaderErrors).toEqual([]);
  expect(result.positionDifference).toBe(0);
  expect(result.velocityDifference).toBe(0);
  expect(result.drawCalls).toBe(0);
});

test("stationary live particle accelerates inward without relaunching", async ({ page }) => {
  const result = await runFixture<{
    position: number[];
    velocity: number[];
    shaderErrors: string[];
  }>(page, "stationaryParticle");
  expect(result.shaderErrors).toEqual([]);
  expect(result.position[0]).toBeLessThan(10);
  expect(result.velocity[0]).toBeLessThan(0);
  expect(Math.hypot(result.velocity[1], result.velocity[2])).toBeLessThan(1e-5);
});

test("swept horizon check absorbs a particle that crosses between endpoints", async ({ page }) => {
  const result = await runFixture<{ position: number[]; shaderErrors: string[] }>(
    page,
    "sweptAbsorption"
  );
  expect(result.shaderErrors).toEqual([]);
  expect(result.position[0]).toBe(0);
  expect(result.position[1]).toBe(0);
  expect(result.position[2]).toBe(0);
  expect(result.position[3]).toBeLessThan(0);
});

test("freshly spawned particle receives velocity in the same update", async ({ page }) => {
  const result = await runFixture<{
    position: number[];
    velocity: number[];
    shaderErrors: string[];
  }>(page, "freshSpawn");
  expect(result.shaderErrors).toEqual([]);
  expect(result.position[3]).toBeGreaterThan(0);
  expect(Math.hypot(result.velocity[0], result.velocity[1], result.velocity[2])).toBeGreaterThan(1);
});

test("history records render frames instead of physics substeps", async ({ page }) => {
  const result = await runFixture<{
    currentMoved: number;
    previousDifference: number;
    history1Difference: number;
    shaderErrors: string[];
  }>(page, "historySnapshots");
  expect(result.shaderErrors).toEqual([]);
  expect(result.currentMoved).toBeGreaterThan(0.1);
  expect(result.previousDifference).toBeLessThan(1e-6);
  expect(result.history1Difference).toBeLessThan(1e-6);
});

test("one ordinary history-enabled step uses three physics draws", async ({ page }) => {
  const result = await runFixture<{ drawCalls: number; shaderErrors: string[] }>(page, "drawCount");
  expect(result.shaderErrors).toEqual([]);
  expect(result.drawCalls).toBe(3);
});

test("fresh spawn on the polar axis remains finite", async ({ page }) => {
  const result = await runFixture<{
    velocity: number[];
    allFinite: boolean;
    shaderErrors: string[];
  }>(page, "poleSpawn");
  expect(result.shaderErrors).toEqual([]);
  expect(result.allFinite).toBe(true);
  expect(Math.hypot(result.velocity[0], result.velocity[1], result.velocity[2])).toBeGreaterThan(1);
});

test("four-body artistic forces remain finite", async ({ page }) => {
  const result = await runFixture<{
    allFinite: boolean;
    positions: number[];
    velocities: number[];
    shaderErrors: string[];
  }>(page, "multiBlackHoleFinite");
  expect(result.shaderErrors).toEqual([]);
  expect(result.allFinite).toBe(true);
});
