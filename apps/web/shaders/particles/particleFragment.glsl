varying vec3 vColor;
varying vec2 vUV;
varying float vRedshiftFade;

uniform float uBrightness;
uniform float uAlpha;

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
    float tailFade = smoothstep(0.0, 0.3, t);
    shapeAlpha *= tailFade;

    float finalAlpha = shapeAlpha * uAlpha * vRedshiftFade;

    vec3 finalColor = min(vColor * uBrightness, vec3(1.5));
    gl_FragColor = vec4(finalColor, finalAlpha);
}
