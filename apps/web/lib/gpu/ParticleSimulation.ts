import type {
  GPUComputationRenderer,
  Variable,
} from "three/examples/jsm/misc/GPUComputationRenderer.js";
import type { Texture, WebGLRenderTarget } from "three";

// Preserve the existing maximum ordinary step; subdivide beat-driven acceleration.
export const MAX_PHYSICS_STEP = 0.05;
export const MAX_FRAME_ADVANCE = 0.2;

export class ParticleSimulation {
  private currentPosition: WebGLRenderTarget;
  private scratchPosition: WebGLRenderTarget;
  private previousPosition: WebGLRenderTarget;
  private readonly ownedTargets: WebGLRenderTarget[] = [];
  private time = 0;
  private history: WebGLRenderTarget[] = [];

  constructor(
    private readonly compute: GPUComputationRenderer,
    private readonly position: Variable,
    private readonly velocity: Variable,
    enableHistory: boolean
  ) {
    this.currentPosition = position.renderTargets[0];
    this.scratchPosition = position.renderTargets[1];
    this.previousPosition = this.currentPosition;
    if (enableHistory) {
      for (let i = 0; i < 3; i++) {
        const target = position.renderTargets[0].clone();
        compute.renderTexture(position.initialValueTexture, target);
        this.history.push(target);
        this.ownedTargets.push(target);
      }
    }
    velocity.material.uniforms.texturePreviousPosition = { value: this.positionTexture };
  }

  get positionTexture(): Texture {
    return this.currentPosition.texture;
  }

  get velocityTexture(): Texture {
    return this.velocity.renderTargets[0].texture;
  }

  get previousPositionTexture(): Texture {
    return this.history[0]?.texture ?? this.previousPosition.texture;
  }

  get history1Texture(): Texture {
    return this.history[1]?.texture ?? this.previousPositionTexture;
  }

  get history2Texture(): Texture {
    return this.history[2]?.texture ?? this.history1Texture;
  }

  advance(delta: number): void {
    if (!Number.isFinite(delta)) throw new Error("Invalid particle simulation delta");
    if (delta === 0) return;

    // Alternate the scratch target and oldest history target during substeps.
    // The three newer frame samples stay untouched, so history needs no copy passes.
    const framePosition = this.currentPosition;
    const oldest = this.history[2];
    const workA = this.scratchPosition;
    const workB = oldest ?? this.currentPosition;
    const advance = Math.min(Math.abs(delta), MAX_FRAME_ADVANCE);
    const steps = Math.ceil(advance / MAX_PHYSICS_STEP);
    const dt = (Math.sign(delta) * advance) / steps;
    for (let step = 0; step < steps; step++) {
      const output = this.currentPosition === workA ? workB : workA;
      this.step(dt, output);
    }
    this.scratchPosition = this.currentPosition === workA ? workB : workA;
    if (oldest) {
      this.history[2] = this.history[1];
      this.history[1] = this.history[0];
      this.history[0] = framePosition;
    }
  }

  private step(dt: number, output: WebGLRenderTarget): void {
    const p = this.position.material.uniforms;
    const v = this.velocity.material.uniforms;
    const oldPosition = this.positionTexture;
    p.uDeltaTime.value = v.uDeltaTime.value = dt;
    p.uDoDrift.value = v.uDoKick.value = true;
    v.uTime.value = this.time;

    // GPUComputationRenderer.compute() reads all dependencies from the old state.
    // Explicit passes let the second kick evaluate gravity at the new position.
    v.texturePosition.value = oldPosition;
    v.texturePreviousPosition.value = oldPosition;
    v.textureVelocity.value = this.velocityTexture;
    this.compute.doRenderTarget(this.velocity.material, this.velocity.renderTargets[1]);

    p.uTime.value = this.time + Math.abs(dt);
    p.texturePosition.value = oldPosition;
    p.textureVelocity.value = this.velocity.renderTargets[1].texture;
    this.compute.doRenderTarget(this.position.material, output);

    v.uTime.value = this.time + Math.abs(dt);
    v.texturePosition.value = output.texture;
    v.textureVelocity.value = this.velocity.renderTargets[1].texture;
    this.compute.doRenderTarget(this.velocity.material, this.velocity.renderTargets[0]);

    this.previousPosition = this.currentPosition;
    this.currentPosition = output;
    this.time += Math.abs(dt);
  }

  dispose(): void {
    for (const target of this.ownedTargets) target.dispose();
    this.history = [];
  }
}
