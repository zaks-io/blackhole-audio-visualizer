uniform float uBeatIntensity;
uniform float uBrightnessBoost;

void main() {
  float brightness = uBrightnessBoost * (1.0 + uBeatIntensity * 0.3);
  gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
}
