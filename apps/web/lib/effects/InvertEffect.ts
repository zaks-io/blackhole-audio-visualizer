import { Effect, BlendFunction } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
  uniform float intensity;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 inverted = 1.0 - inputColor.rgb;
    outputColor = vec4(mix(inputColor.rgb, inverted, intensity), inputColor.a);
  }
`;

export class InvertEffect extends Effect {
  constructor({ blendFunction = BlendFunction.NORMAL, intensity = 1.0 } = {}) {
    super("InvertEffect", fragmentShader, {
      blendFunction,
      uniforms: new Map<string, Uniform>([["intensity", new Uniform(intensity)]]),
    });
  }

  get intensity(): number {
    return this.uniforms.get("intensity")!.value as number;
  }

  set intensity(value: number) {
    this.uniforms.get("intensity")!.value = value;
  }
}
