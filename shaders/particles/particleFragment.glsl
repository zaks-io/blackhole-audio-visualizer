varying float vDistance;
varying vec3 vPosition;
varying vec3 vColor;

uniform float uMaxDistance;
uniform float uBrightness;
uniform float uAlpha;
uniform float uEventHorizon;
uniform float uISCORadius;

void main() {
    // Fade from ISCO to event horizon
    float distanceFade = smoothstep(uEventHorizon, uISCORadius, vDistance);

    // Circular point shape
    vec2 center = gl_PointCoord - 0.5;
    float dist2 = dot(center, center);
    float circleAlpha = 1.0 - step(0.25, dist2);

    // Soft edge
    float edgeAlpha = 1.0 - smoothstep(0.09, 0.25, dist2);

    // Brightness varies with distance (brighter near center for depth)
    float t = clamp(vDistance / uMaxDistance, 0.0, 1.0);
    float brightness = uBrightness * (1.0 + (1.0 - t) * 0.3);

    // Combine edge alpha, base alpha, and distance fade
    float horizonAlpha = step(uEventHorizon, vDistance);
    float finalAlpha = circleAlpha * horizonAlpha * edgeAlpha * uAlpha * distanceFade;

    gl_FragColor = vec4(vColor * brightness, finalAlpha);
}
