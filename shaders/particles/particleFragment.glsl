varying vec3 vColor;
varying vec2 vUV;

uniform float uBrightness;
uniform float uAlpha;

void main() {
    // UV.y: 0 = tail, 1 = head
    float t = vUV.y;

    // Centered x coordinate (-0.5 to 0.5)
    float x = vUV.x - 0.5;

    // Simple soft teardrop: ellipse that tapers toward tail
    float centerY = 0.5;
    float dy = (t - centerY) * 1.0;
    float dx = x * 3.0;

    // Elliptical distance
    float dist = length(vec2(dx, dy));

    // Soft falloff
    float shapeAlpha = exp(-dist * dist * 14.0);

    // Extra fade toward tail
    float tailFade = smoothstep(0.0, 0.3, t);
    shapeAlpha *= tailFade;

    float finalAlpha = shapeAlpha * uAlpha;

    vec3 finalColor = min(vColor * uBrightness, vec3(1.5));
    gl_FragColor = vec4(finalColor, finalAlpha);
}
