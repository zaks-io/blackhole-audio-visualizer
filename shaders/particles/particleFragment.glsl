varying float vDistance;
varying vec3 vPosition;

uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform float uMaxDistance;
uniform float uBrightness;
uniform float uAlpha;
uniform float uEventHorizon;

void main() {
    // Fade out only when extremely close to event horizon
    float fadeStart = uEventHorizon * 1.1;  // Start fading at 1.1x event horizon
    float distanceFade = smoothstep(uEventHorizon, fadeStart, vDistance);

    // Discard particles that have reached the event horizon
    if (vDistance < uEventHorizon) discard;

    // Circular point shape
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if(dist > 0.5) discard;

    // Soft edge
    float edgeAlpha = 1.0 - smoothstep(0.3, 0.5, dist);

    // Color based on distance from black hole
    float t = clamp(vDistance / uMaxDistance, 0.0, 1.0);
    vec3 color = mix(uColorInner, uColorOuter, t);

    // Brightness varies with distance (brighter near center)
    float brightness = uBrightness * (1.0 + (1.0 - t) * 0.5);

    // Combine edge alpha, base alpha, and distance fade
    float finalAlpha = edgeAlpha * uAlpha * distanceFade;

    gl_FragColor = vec4(color * brightness, finalAlpha);
}
