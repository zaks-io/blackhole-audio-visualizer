varying float vDistance;
varying vec3 vPosition;
varying float vColorIndex;

uniform vec3 uEmitterColors[288];
uniform float uMaxDistance;
uniform float uBrightness;
uniform float uAlpha;
uniform float uEventHorizon;
uniform float uISCORadius;

void main() {
    // Fade from ISCO to event horizon
    float distanceFade = smoothstep(uEventHorizon, uISCORadius, vDistance);

    // Discard particles that have reached the event horizon
    if (vDistance < uEventHorizon) discard;

    // Circular point shape
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if(dist > 0.5) discard;

    // Soft edge
    float edgeAlpha = 1.0 - smoothstep(0.3, 0.5, dist);

    // Color based on stored color index (set at spawn time)
    int colorIndex = int(vColorIndex);
    vec3 color = uEmitterColors[colorIndex];

    // Brightness varies with distance (brighter near center for depth)
    float t = clamp(vDistance / uMaxDistance, 0.0, 1.0);
    float brightness = uBrightness * (1.0 + (1.0 - t) * 0.3);

    // Combine edge alpha, base alpha, and distance fade
    float finalAlpha = edgeAlpha * uAlpha * distanceFade;

    gl_FragColor = vec4(color * brightness, finalAlpha);
}
