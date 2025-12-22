#define MAX_BLACK_HOLES 4

uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform sampler2D uColorLUT;
uniform float uColorLUTSize;
uniform float uPointSize;
uniform vec3 uBlackHolePos[MAX_BLACK_HOLES];
uniform int uBlackHoleCount;

attribute vec2 reference;

varying float vDistance;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
    vec4 posData = texture2D(texturePosition, reference);
    vec4 velData = texture2D(textureVelocity, reference);

    vec3 pos = posData.xyz;
    float lifetime = posData.w;
    float colorIndex = velData.w;

    vPosition = pos;

    // Calculate distance to nearest black hole
    float nearestDist = 99999.0;
    for (int i = 0; i < MAX_BLACK_HOLES; i++) {
        if (i >= uBlackHoleCount) break;
        float d = length(pos - uBlackHolePos[i]);
        nearestDist = min(nearestDist, d);
    }
    vDistance = nearestDist;

    // Sample a 1D color LUT in the vertex shader to avoid large uniform arrays
    float idx = clamp(floor(colorIndex + 0.5), 0.0, max(uColorLUTSize - 1.0, 0.0));
    float u = (idx + 0.5) / max(uColorLUTSize, 1.0);
    vColor = texture2D(uColorLUT, vec2(u, 0.5)).rgb;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Hide particles that haven't spawned yet (negative lifetime)
    if (lifetime < 0.0) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
        gl_PointSize = 0.0;
        return;
    }

    // Size attenuation based on distance from camera
    gl_PointSize = uPointSize * (300.0 / -mvPosition.z);

    // Clamp minimum and maximum size
    gl_PointSize = clamp(gl_PointSize, 2.0, 64.0);
}
