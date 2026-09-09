import * as THREE from "../../apps/web/node_modules/three/build/three.module.js";
import { createHarness, makeDataTexture, maxDifference, type Particle } from "./particleHarness";
import { reversibleOrbit, reverseStrongIsco } from "./reverseParticlePhysics";

function stateMetrics(state: Float32Array, mass: number, softening: number) {
  const [x, y, z, , vx, vy, vz] = [
    state[0],
    state[1],
    state[2],
    state[3],
    state[4],
    state[5],
    state[6],
  ];
  const radius = Math.hypot(x, y, z);
  const energy = 0.5 * (vx * vx + vy * vy + vz * vz) - mass / (radius + softening);
  const angularMomentum = Math.hypot(y * vz - z * vy, z * vx - x * vz, x * vy - y * vx);
  return { radius, energy, angularMomentum };
}

async function measureOrbit(mass: number, periodsToRun: number) {
  const radius = 20;
  const softening = 0.5;
  const speed = Math.sqrt(mass * radius) / (radius + softening);
  const harness = createHarness([[radius, 0, 0, 1]], [[0, 0, speed, 0]], {
    blackHoleMasses: [mass],
  });
  try {
    const initial = stateMetrics(
      new Float32Array([radius, 0, 0, 1, 0, 0, speed, 0]),
      mass,
      softening
    );
    let maxEnergyDrift = 0;
    let maxAngularMomentumDrift = 0;
    const period = (2 * Math.PI * radius) / speed;
    const advances = Math.ceil((period * periodsToRun) / 0.2);
    for (let i = 0; i < advances; i++) {
      harness.simulation.advance(0.2);
      const position = harness.readTexture(harness.simulation.positionTexture);
      const velocity = harness.readTexture(harness.simulation.velocityTexture);
      const current = stateMetrics(
        new Float32Array([...position.slice(0, 4), ...velocity.slice(0, 4)]),
        mass,
        softening
      );
      maxEnergyDrift = Math.max(
        maxEnergyDrift,
        Math.abs((current.energy - initial.energy) / initial.energy)
      );
      maxAngularMomentumDrift = Math.max(
        maxAngularMomentumDrift,
        Math.abs((current.angularMomentum - initial.angularMomentum) / initial.angularMomentum)
      );
    }
    const finalPosition = harness.readTexture(harness.simulation.positionTexture);
    return {
      periods: (advances * 0.2) / period,
      maxEnergyDrift,
      maxAngularMomentumDrift,
      finalRadius: Math.hypot(finalPosition[0], finalPosition[1], finalPosition[2]),
      shaderErrors: harness.shaderErrors,
    };
  } finally {
    harness.dispose();
  }
}

async function orbitStability() {
  return measureOrbit(100, 3);
}

async function productionGravityOrbit() {
  return measureOrbit(100_000, 3);
}

async function queueTiming() {
  const positions = Array.from({ length: 16 }, () => [0, 0, 0, -0.5] as Particle);
  const velocities = Array.from({ length: 16 }, () => [0, 0, 0, 0] as Particle);
  const harness = createHarness(positions, velocities, { particlesPerSecond: 4 });
  try {
    for (let i = 0; i < 5; i++) harness.simulation.advance(0.2);
    const result = harness.readTexture(harness.simulation.positionTexture);
    return { lifetime: result[3], shaderErrors: harness.shaderErrors };
  } finally {
    harness.dispose();
  }
}

async function zeroDelta() {
  const harness = createHarness([[12, 1, 2, 4]], [[0.25, -0.5, 1, 3]]);
  try {
    const beforePosition = harness.readTexture(harness.simulation.positionTexture);
    const beforeVelocity = harness.readTexture(harness.simulation.velocityTexture);
    harness.simulation.advance(0);
    return {
      positionDifference: maxDifference(
        beforePosition,
        harness.readTexture(harness.simulation.positionTexture)
      ),
      velocityDifference: maxDifference(
        beforeVelocity,
        harness.readTexture(harness.simulation.velocityTexture)
      ),
      drawCalls: harness.drawCalls(),
      shaderErrors: harness.shaderErrors,
    };
  } finally {
    harness.dispose();
  }
}

async function stationaryParticle() {
  const harness = createHarness([[10, 0, 0, 1]], [[0, 0, 0, 2]]);
  try {
    harness.simulation.advance(0.05);
    const position = harness.readTexture(harness.simulation.positionTexture);
    const velocity = harness.readTexture(harness.simulation.velocityTexture);
    return { position: [...position], velocity: [...velocity], shaderErrors: harness.shaderErrors };
  } finally {
    harness.dispose();
  }
}

async function sweptAbsorption() {
  const harness = createHarness([[-2, 0, 0, 1]], [[100, 0, 0, 0]], {
    blackHoleMasses: [0],
    blackHoleRadii: [0.5],
  });
  try {
    const p = harness.position.material.uniforms;
    p.uDeltaTime.value = 0.05;
    p.uTime.value = 0.05;
    p.uDoDrift.value = true;
    p.texturePosition.value = harness.position.renderTargets[0].texture;
    p.textureVelocity.value = harness.velocity.renderTargets[0].texture;
    harness.compute.doRenderTarget(harness.position.material, harness.position.renderTargets[1]);
    const result = harness.readTarget(harness.position.renderTargets[1]);
    return { position: [...result], shaderErrors: harness.shaderErrors };
  } finally {
    harness.dispose();
  }
}

async function freshSpawn() {
  const harness = createHarness([[0, 0, 0, -0.001]], [[0, 0, 0, 0]], {
    particlesPerSecond: 1,
    emissionRadius: 20,
  });
  try {
    harness.simulation.advance(0.05);
    const position = harness.readTexture(harness.simulation.positionTexture);
    const velocity = harness.readTexture(harness.simulation.velocityTexture);
    return { position: [...position], velocity: [...velocity], shaderErrors: harness.shaderErrors };
  } finally {
    harness.dispose();
  }
}

async function historySnapshots() {
  const harness = createHarness([[20, 0, 0, 1]], [[0, 0, 2, 0]], {}, true);
  try {
    const initial = harness.readTexture(harness.simulation.positionTexture);
    harness.simulation.advance(0.2);
    const firstFrame = harness.readTexture(harness.simulation.positionTexture);
    harness.simulation.advance(0.05);
    const previous = harness.readTexture(harness.simulation.previousPositionTexture);
    const history1 = harness.readTexture(harness.simulation.history1Texture);
    return {
      currentMoved: maxDifference(initial, harness.readTexture(harness.simulation.positionTexture)),
      previousDifference: maxDifference(firstFrame, previous),
      history1Difference: maxDifference(initial, history1),
      shaderErrors: harness.shaderErrors,
    };
  } finally {
    harness.dispose();
  }
}

async function drawCount() {
  const harness = createHarness([[20, 0, 0, 1]], [[0, 0, 2, 0]], {}, true);
  try {
    harness.simulation.advance(0.04);
    return { drawCalls: harness.drawCalls(), shaderErrors: harness.shaderErrors };
  } finally {
    harness.dispose();
  }
}

async function poleSpawn() {
  const harness = createHarness([[0, 10, 0, 1]], [[0, 0, 0, 0]]);
  const previous = makeDataTexture([[0, 0, 0, -1]]);
  try {
    const v = harness.velocity.material.uniforms;
    v.uDeltaTime.value = 0.05;
    v.uTime.value = 0.05;
    v.uDoKick.value = true;
    v.texturePosition.value = harness.position.renderTargets[0].texture;
    v.texturePreviousPosition.value = previous;
    v.textureVelocity.value = harness.velocity.renderTargets[0].texture;
    harness.compute.doRenderTarget(harness.velocity.material, harness.velocity.renderTargets[1]);
    const result = harness.readTarget(harness.velocity.renderTargets[1]);
    return {
      velocity: [...result],
      allFinite: result.every(Number.isFinite),
      shaderErrors: harness.shaderErrors,
    };
  } finally {
    previous.dispose();
    harness.dispose();
  }
}

async function multiBlackHoleFinite() {
  const blackHolePositions = [
    new THREE.Vector3(-8, 0, 0),
    new THREE.Vector3(8, 0, 0),
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(0, 0, 8),
  ];
  const positions: Particle[] = [
    [18, 1, 0, 1],
    [-18, -1, 0, 2],
    [0, 2, 18, 3],
    [0, -2, -18, 4],
  ];
  const velocities: Particle[] = [
    [0, 0.1, 3, 0],
    [0, -0.1, -3, 1],
    [-3, 0.1, 0, 2],
    [3, -0.1, 0, 3],
  ];
  const harness = createHarness(positions, velocities, {
    blackHolePositions,
    blackHoleMasses: [120, 90, 70, 50],
    blackHoleRadii: [1.2, 1, 0.8, 0.7],
    orbitDecay: 4,
    iscoRadius: 7,
    iscoStrength: 0.8,
    beatIntensity: 1,
    beatRepulsion: 35,
    frameDragging: 0.7,
    particlesPerSecond: 4,
  });
  try {
    for (let i = 0; i < 200; i++) harness.simulation.advance(0.05);
    const position = harness.readTexture(harness.simulation.positionTexture);
    const velocity = harness.readTexture(harness.simulation.velocityTexture);
    return {
      allFinite: position.every(Number.isFinite) && velocity.every(Number.isFinite),
      positions: [...position],
      velocities: [...velocity],
      shaderErrors: harness.shaderErrors,
    };
  } finally {
    harness.dispose();
  }
}

Object.assign(window, {
  particlePhysics: {
    orbitStability,
    productionGravityOrbit,
    reversibleOrbit,
    reverseStrongIsco,
    queueTiming,
    zeroDelta,
    stationaryParticle,
    sweptAbsorption,
    freshSpawn,
    historySnapshots,
    drawCount,
    poleSpawn,
    multiBlackHoleFinite,
  },
});
