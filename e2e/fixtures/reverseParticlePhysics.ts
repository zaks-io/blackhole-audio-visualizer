import { createHarness, maxDifference } from "./particleHarness";

export async function reversibleOrbit() {
  const mass = 100_000;
  const radius = 20;
  const speed = Math.sqrt(mass * radius) / (radius + 0.5);
  const harness = createHarness([[radius, 0, 0, 1]], [[0, 0, speed, 0]], {
    blackHoleMasses: [mass],
  });
  try {
    const initialPosition = harness.readTexture(harness.simulation.positionTexture);
    const initialVelocity = harness.readTexture(harness.simulation.velocityTexture);
    for (let i = 0; i < 20; i++) harness.simulation.advance(0.2);
    for (let i = 0; i < 20; i++) harness.simulation.advance(-0.2);
    const finalPosition = harness.readTexture(harness.simulation.positionTexture);
    const finalVelocity = harness.readTexture(harness.simulation.velocityTexture);
    return {
      positionDifference: maxDifference(initialPosition.slice(0, 3), finalPosition.slice(0, 3)),
      velocityDifference: maxDifference(initialVelocity.slice(0, 3), finalVelocity.slice(0, 3)),
      initialAge: initialPosition[3],
      finalAge: finalPosition[3],
      shaderErrors: harness.shaderErrors,
    };
  } finally {
    harness.dispose();
  }
}

export async function reverseStrongIsco() {
  const harness = createHarness([[6, 0, 0, 1]], [[0, 0, 100, 0]], {
    blackHoleMasses: [100_000],
    blackHoleRadii: [1],
    orbitDecay: 5,
    iscoRadius: 9,
    iscoStrength: 1,
    frameDragging: 1,
  });
  try {
    for (let i = 0; i < 200; i++) harness.simulation.advance(-0.2);
    const position = harness.readTexture(harness.simulation.positionTexture);
    const velocity = harness.readTexture(harness.simulation.velocityTexture);
    return {
      allFinite: position.every(Number.isFinite) && velocity.every(Number.isFinite),
      maxMagnitude: Math.max(...position.map(Math.abs), ...velocity.map(Math.abs)),
      age: position[3],
      shaderErrors: harness.shaderErrors,
    };
  } finally {
    harness.dispose();
  }
}
