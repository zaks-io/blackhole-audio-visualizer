import * as THREE from "../../apps/web/node_modules/three/build/three.module.js";
import { GPUComputationRenderer } from "../../apps/web/node_modules/three/examples/jsm/misc/GPUComputationRenderer.js";
import { ParticleSimulation } from "../../apps/web/lib/gpu/ParticleSimulation";
import positionShader from "../../apps/web/shaders/simulation/positionFragment.glsl";
import velocityShader from "../../apps/web/shaders/simulation/velocityFragment.glsl";

export type Particle = [number, number, number, number];
type Options = Partial<{
  blackHolePositions: THREE.Vector3[];
  blackHoleMasses: number[];
  blackHoleRadii: number[];
  emissionRadius: number;
  emitterCount: number;
  emitterTilt: number;
  emissionShape: number;
  particlesPerSecond: number;
  lifetimeMax: number;
  orbitDecay: number;
  iscoRadius: number;
  iscoStrength: number;
  beatIntensity: number;
  beatRepulsion: number;
  frameDragging: number;
}>;

export function maxDifference(a: Float32Array | number[], b: Float32Array | number[]): number {
  let maximum = 0;
  for (let i = 0; i < a.length; i++) maximum = Math.max(maximum, Math.abs(a[i] - b[i]));
  return maximum;
}

export function makeDataTexture(values: Particle[]): THREE.DataTexture {
  const data = new Float32Array(values.length * 4);
  values.forEach((value, index) => data.set(value, index * 4));
  const texture = new THREE.DataTexture(data, values.length, 1, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  return texture;
}

export function createHarness(
  positions: Particle[],
  velocities: Particle[],
  options: Options = {},
  enableHistory = false
) {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(Math.max(positions.length, 1), 1, false);
  const gl = renderer.getContext();
  if (!renderer.capabilities.isWebGL2 || !gl.getExtension("EXT_color_buffer_float")) {
    throw new Error("Particle physics tests require WebGL2 float render targets");
  }

  const shaderErrors: string[] = [];
  renderer.debug.onShaderError = (context, program, vertex, fragment) => {
    shaderErrors.push(
      [
        context.getProgramInfoLog(program),
        context.getShaderInfoLog(vertex),
        context.getShaderInfoLog(fragment),
      ]
        .filter(Boolean)
        .join("\n")
    );
  };

  const compute = new GPUComputationRenderer(positions.length, 1, renderer);
  compute.setDataType(THREE.FloatType);
  const positionTexture = makeDataTexture(positions);
  const velocityTexture = makeDataTexture(velocities);
  const velocity = compute.addVariable("textureVelocity", velocityShader, velocityTexture);
  const position = compute.addVariable("texturePosition", positionShader, positionTexture);

  const blackHoleCount = options.blackHolePositions?.length ?? 1;
  const bhPositions = [...(options.blackHolePositions ?? [new THREE.Vector3()])];
  const bhMasses = [...(options.blackHoleMasses ?? [100])];
  const bhRadii = [...(options.blackHoleRadii ?? [0])];
  while (bhPositions.length < 4) bhPositions.push(new THREE.Vector3());
  while (bhMasses.length < 4) bhMasses.push(0);
  while (bhRadii.length < 4) bhRadii.push(0);
  const spectrum = makeDataTexture([[0, 0, 0, 0]]);

  Object.assign(position.material.uniforms, {
    uTime: { value: 0 },
    uDeltaTime: { value: 0 },
    uGM: { value: bhMasses[0] },
    uSoftening: { value: 0.5 },
    uEventHorizon: { value: bhRadii[0] },
    uEmissionRadius: { value: options.emissionRadius ?? 20 },
    uEmitterCount: { value: options.emitterCount ?? 1 },
    uEmitterAngle: { value: 0 },
    uEmitterTilt: { value: options.emitterTilt ?? 0 },
    uParticlesPerSecond: { value: options.particlesPerSecond ?? 0 },
    uTotalParticles: { value: positions.length },
    uLifetimeMax: { value: options.lifetimeMax ?? 100_000 },
    uEmitterSpread: { value: 0 },
    uEmitterWidth: { value: 0 },
    uEmissionShape: { value: options.emissionShape ?? 0 },
    uEmitterLineY: { value: 0 },
    uEmitterLineWidth: { value: 20 },
    uDoDrift: { value: false },
    uBandOnsetsTexture: { value: spectrum },
    uBandOnsetMax: { value: 1 },
    uBandCount: { value: options.emitterCount ?? 1 },
    uSpectrumTexture: { value: spectrum },
    uSpectrumSize: { value: 1 },
    uAudioAmplitude: { value: 0 },
    uSpawnBurst: { value: 1 },
    uBeatIntensity: { value: options.beatIntensity ?? 0 },
    uBeatPulse: { value: 0 },
    uDither: { value: 0 },
    uOrbitDecay: { value: options.orbitDecay ?? 0 },
    uBlackHolePos: { value: bhPositions },
    uBlackHoleMass: { value: bhMasses },
    uBlackHoleRadius: { value: bhRadii },
    uBlackHoleCount: { value: blackHoleCount },
  });
  Object.assign(velocity.material.uniforms, {
    uTime: { value: 0 },
    uDeltaTime: { value: 0 },
    uGM: { value: bhMasses[0] },
    uSoftening: { value: 0.5 },
    uEventHorizon: { value: bhRadii[0] },
    uEmissionRadius: { value: options.emissionRadius ?? 20 },
    uEmitterCount: { value: options.emitterCount ?? 1 },
    uInwardAngle: { value: 0 },
    uISCORadius: { value: options.iscoRadius ?? 0 },
    uISCOStrength: { value: options.iscoStrength ?? 0 },
    uEmitterSpread: { value: 0 },
    uBeatIntensity: { value: options.beatIntensity ?? 0 },
    uBeatRepulsion: { value: options.beatRepulsion ?? 0 },
    uPaletteOffset: { value: 0 },
    uDoKick: { value: false },
    uHFCBoost: { value: 0 },
    uLifetimeGracePeriod: { value: 50_000 },
    uLifetimeMax: { value: options.lifetimeMax ?? 100_000 },
    uLifetimeGravityMultiplier: { value: 3 },
    uOrbitDecay: { value: options.orbitDecay ?? 0 },
    uFrameDragging: { value: options.frameDragging ?? 0 },
    uMassContrast: { value: 0 },
    uMassRange: { value: 5 },
    uVelocityContrast: { value: 0 },
    uVelocityRange: { value: 3 },
    uBlackHolePos: { value: bhPositions },
    uBlackHoleMass: { value: bhMasses },
    uBlackHoleRadius: { value: bhRadii },
    uBlackHoleCount: { value: blackHoleCount },
  });

  compute.setVariableDependencies(position, [position, velocity]);
  compute.setVariableDependencies(velocity, [position, velocity]);
  const error = compute.init();
  if (error) throw new Error(error);
  const simulation = new ParticleSimulation(compute, position, velocity, enableHistory);
  let drawCalls = 0;
  const render = compute.doRenderTarget.bind(compute);
  compute.doRenderTarget = (...args) => {
    drawCalls++;
    return render(...args);
  };

  const readTarget = (target: THREE.WebGLRenderTarget) => {
    const result = new Float32Array(positions.length * 4);
    renderer.readRenderTargetPixels(target, 0, 0, positions.length, 1, result);
    return result;
  };
  const readTexture = (texture: THREE.Texture) => {
    const existing = [...position.renderTargets, ...velocity.renderTargets].find(
      (target) => target.texture === texture
    );
    if (existing) return readTarget(existing);
    const target = compute.createRenderTarget(positions.length, 1);
    compute.renderTexture(texture, target);
    const result = readTarget(target);
    target.dispose();
    return result;
  };
  const dispose = () => {
    simulation.dispose();
    compute.dispose();
    spectrum.dispose();
    positionTexture.dispose();
    velocityTexture.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
  return {
    compute,
    position,
    velocity,
    simulation,
    shaderErrors,
    readTarget,
    readTexture,
    drawCalls: () => drawCalls,
    dispose,
  };
}
