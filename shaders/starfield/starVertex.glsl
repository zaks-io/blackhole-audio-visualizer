attribute float aTemperature;
attribute float aSize;

uniform float uBeatIntensity;
uniform float uSizeBoost;
uniform float uTime;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float beatSize = 1.0 + uBeatIntensity * uSizeBoost;
  gl_PointSize = aSize * beatSize * (150.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 6.0);
}
