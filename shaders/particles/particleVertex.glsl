#define MAX_BLACK_HOLES 4

uniform sampler2D texturePosition;
uniform sampler2D texturePrevPosition;
uniform sampler2D textureHistory1;
uniform sampler2D textureHistory2;
uniform sampler2D textureVelocity;
uniform sampler2D uColorLUT;
uniform float uColorLUTSize;
uniform float uBaseSize;
uniform vec3 uBlackHolePos[MAX_BLACK_HOLES];
uniform int uBlackHoleCount;

attribute vec2 reference;

varying float vDistance;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUV;
varying float vStreakRatio;

// Piecewise linear interpolation across 3 segments (p0→p1→p2→p3)
vec3 piecewiseLerp(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
    if (t < 0.333) {
        return mix(p0, p1, t * 3.0);
    } else if (t < 0.666) {
        return mix(p1, p2, (t - 0.333) * 3.0);
    } else {
        return mix(p2, p3, (t - 0.666) * 3.0);
    }
}

void main() {
    vec4 posData = texture2D(texturePosition, reference);
    vec4 prevPosData = texture2D(texturePrevPosition, reference);
    vec4 history1Data = texture2D(textureHistory1, reference);
    vec4 history2Data = texture2D(textureHistory2, reference);
    vec4 velData = texture2D(textureVelocity, reference);

    // Position history: p3 (current/head) -> p2 (prev) -> p1 (history1) -> p0 (history2/tail)
    vec3 p3 = posData.xyz;       // newest (head)
    vec3 p2 = prevPosData.xyz;
    vec3 p1 = history1Data.xyz;
    vec3 p0 = history2Data.xyz;  // oldest (tail)

    float lifetime = posData.w;
    vec3 velocity = velData.xyz;
    float colorIndex = velData.w;

    vUV = uv;
    vPosition = p3;

    // Hide unspawned particles
    if (lifetime < 0.0) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
        vStreakRatio = 1.0;
        vDistance = 99999.0;
        vColor = vec3(0.0);
        return;
    }

    // Detect respawn: if any position jumped too far, collapse to current
    float jump01 = length(p1 - p0);
    float jump12 = length(p2 - p1);
    float jump23 = length(p3 - p2);
    float maxJump = max(jump01, max(jump12, jump23));

    if (maxJump > 50.0) {
        p0 = p3;
        p1 = p3;
        p2 = p3;
    }

    // Distance to nearest black hole (use current position)
    float nearestDist = 99999.0;
    for (int i = 0; i < MAX_BLACK_HOLES; i++) {
        if (i >= uBlackHoleCount) break;
        nearestDist = min(nearestDist, length(p3 - uBlackHolePos[i]));
    }
    vDistance = nearestDist;

    // Color from LUT
    float idx = clamp(floor(colorIndex + 0.5), 0.0, uColorLUTSize - 1.0);
    vColor = texture2D(uColorLUT, vec2((idx + 0.5) / uColorLUTSize, 0.5)).rgb;

    // t: 0 = tail (p0), 1 = head (p3)
    float t = position.y + 0.5;

    // Position along the curve using ACTUAL historical positions
    vec3 curvePos = piecewiseLerp(p0, p1, p2, p3, t);

    // Compute total trail length for streak ratio (used by fragment shader)
    float totalDist = length(p3 - p2) + length(p2 - p1) + length(p1 - p0);
    vStreakRatio = 1.0 + totalDist * 0.1;

    // Transform curve position to view space
    vec4 viewPos = modelViewMatrix * vec4(curvePos, 1.0);

    // Compute tangent in world space using nearby curve points
    float dt = 0.05;
    vec3 nextPos = piecewiseLerp(p0, p1, p2, p3, min(t + dt, 1.0));
    vec3 prevPos = piecewiseLerp(p0, p1, p2, p3, max(t - dt, 0.0));
    vec3 tangentWorld = nextPos - prevPos;
    float tangentLen = length(tangentWorld);

    // Fallback if tangent is too small
    if (tangentLen < 0.001) {
        tangentWorld = p3 - p0;  // Use head-to-tail
        tangentLen = length(tangentWorld);
        if (tangentLen < 0.001) {
            tangentWorld = velocity;  // Use velocity
            tangentLen = length(tangentWorld);
            if (tangentLen < 0.001) {
                tangentWorld = vec3(0.0, 0.0, 1.0);  // Final fallback
                tangentLen = 1.0;
            }
        }
    }
    tangentWorld = tangentWorld / tangentLen;

    // Transform tangent to view space
    vec3 tangentView = normalize(mat3(modelViewMatrix) * tangentWorld);

    // View direction: from point towards camera (camera is at origin in view space)
    vec3 viewDir = normalize(-viewPos.xyz);

    // Billboard right vector: perpendicular to both tangent and view direction
    vec3 rightView = cross(viewDir, tangentView);
    float rightLen = length(rightView);

    // Handle case where tangent is parallel to view direction
    if (rightLen < 0.001) {
        vec3 upView = mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0);
        rightView = cross(upView, tangentView);
        rightLen = length(rightView);
        if (rightLen < 0.001) {
            rightView = vec3(1.0, 0.0, 0.0);  // Final fallback
            rightLen = 1.0;
        }
    }
    rightView = rightView / rightLen;

    // Width in view space - scale with uBaseSize
    float baseWidth = uBaseSize * 0.1;  // Moderate scale factor
    float taperT = pow(t, 0.5);
    float halfW = baseWidth * (0.3 + 0.7 * taperT);

    // Offset vertex position in view space along the billboard right vector
    vec3 offsetViewPos = viewPos.xyz + rightView * position.x * halfW;

    // Project to clip space
    gl_Position = projectionMatrix * vec4(offsetViewPos, 1.0);
}
