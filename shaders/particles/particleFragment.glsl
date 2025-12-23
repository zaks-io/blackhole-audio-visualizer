varying float vDistance;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUV;
varying float vStreakRatio;

uniform float uMaxDistance;
uniform float uBrightness;
uniform float uAlpha;
uniform float uEventHorizon;
uniform float uISCORadius;
uniform float uMotionBlurTaper;
uniform float uMotionBlurFade;

void main() {
    // Distance fades
    float distanceFade = smoothstep(uEventHorizon, uISCORadius, vDistance);
    float horizonAlpha = step(uEventHorizon, vDistance);

    // UV.y: 0 = tail, 1 = head
    float t = vUV.y;

    // Centered x coordinate (-0.5 to 0.5)
    float x = vUV.x - 0.5;

    // Simple soft teardrop: ellipse that tapers toward tail
    // Use polar-ish distance from center, stretched along y
    float centerY = 0.5;  // Center of shape - equal room front/back
    float dy = (t - centerY) * 1.0;  // Balanced vertical
    float dx = x * 3.0;  // Tighter horizontal

    // Elliptical distance
    float dist = length(vec2(dx, dy));

    // Soft falloff - steeper to avoid edge cropping
    float shapeAlpha = exp(-dist * dist * 14.0);

    // Extra fade toward tail
    float tailFade = smoothstep(0.0, 0.3, t);
    shapeAlpha *= tailFade;

    // Brightness with depth
    float depthT = clamp(vDistance / uMaxDistance, 0.0, 1.0);
    float brightness = uBrightness * (1.0 + (1.0 - depthT) * 0.3);

    float finalAlpha = shapeAlpha * horizonAlpha * distanceFade * uAlpha;

    gl_FragColor = vec4(vColor * brightness, finalAlpha);
}
