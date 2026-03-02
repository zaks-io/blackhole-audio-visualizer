varying vec3 vColor;
varying vec2 vUV;
varying float vDensityAlphaScale;

uniform float uBrightness;
uniform float uAlpha;
uniform float uMotionBlurFade;
uniform float uDenseGuardStrength;

precision highp float;

void main() {
    // UV.y: 0 = tail, 1 = head
    float t = vUV.y;

    // Centered x coordinate (-0.5 to 0.5)
    float x = vUV.x - 0.5;

    // Simple soft teardrop: ellipse that tapers toward tail
    float centerY = 0.5;
    float dy = (t - centerY) * 1.0;
    float dx = x * 3.0;

    // Ellipse implicit function: inside <= 0, boundary = 0
    float e = dx * dx + dy * dy - 1.0;
    float aa = fwidth(e);
    // Analytic edge AA: stable under camera motion and avoids pixel-grid “holes”.
    // Inside shape: e < 0 => edge ~ 1. Outside: e > 0 => edge ~ 0.
    float edge = 1.0 - smoothstep(-aa, aa, e);

    // Soft falloff (inside shape)
    float dist = length(vec2(dx, dy));
    float shapeAlpha = exp(-dist * dist * 14.0) * edge;

    // Extra fade toward tail
    float fadeEdge = mix(0.3, 0.55, clamp(uMotionBlurFade * 0.5, 0.0, 1.0));
    float tailFade = smoothstep(0.0, fadeEdge, t);
    shapeAlpha *= tailFade;

    float finalAlpha = shapeAlpha * uAlpha * vDensityAlphaScale;

    // Early-out for negligible fragments — avoids framebuffer read-modify-write.
    // In dense zones vDensityAlphaScale drops alpha so Gaussian tails hit this
    // threshold, cutting ~40-50% of fragments while additive blend still saturates.
    float discardThreshold = mix(0.008, 0.012, clamp(uDenseGuardStrength, 0.0, 1.0));
    if (finalAlpha < discardThreshold) discard;

    vec3 finalColor = min(vColor * uBrightness, vec3(1.5));
    gl_FragColor = vec4(finalColor, finalAlpha);
}
