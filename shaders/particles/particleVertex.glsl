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

// Catmull-Rom spline - smooth curve through all 4 points
vec3 catmullRom(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    return 0.5 * (
        (2.0 * p1) +
        (-p0 + p2) * t +
        (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
        (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
    );
}

// Analytical derivative of Catmull-Rom spline (tangent direction)
vec3 catmullRomDerivative(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
    float t2 = t * t;
    return 0.5 * (
        (-p0 + p2) +
        (4.0 * p0 - 10.0 * p1 + 8.0 * p2 - 2.0 * p3) * t +
        (-3.0 * p0 + 9.0 * p1 - 9.0 * p2 + 3.0 * p3) * t2
    );
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
    vec3 curvePos = catmullRom(p0, p1, p2, p3, t);

    // Compute total trail length for streak ratio (used by fragment shader)
    float totalDist = length(p3 - p2) + length(p2 - p1) + length(p1 - p0);
    vStreakRatio = 1.0 + totalDist * 0.1;

    // Transform curve position to view space
    vec4 viewPos = modelViewMatrix * vec4(curvePos, 1.0);

    // Compute tangent using analytical derivative, blended with overall direction for smoothness
    vec3 localTangent = catmullRomDerivative(p0, p1, p2, p3, t);
    vec3 overallDir = p3 - p0;
    float overallLen = length(overallDir);

    // Blend local tangent with overall direction to reduce twist at segment joints
    vec3 tangentWorld;
    if (overallLen > 0.001) {
        overallDir = overallDir / overallLen;
        float localLen = length(localTangent);
        if (localLen > 0.001) {
            localTangent = localTangent / localLen;
            // Blend: 50% local detail, 50% overall smoothness
            tangentWorld = normalize(localTangent * 0.5 + overallDir * 0.5);
        } else {
            tangentWorld = overallDir;
        }
    } else {
        float localLen = length(localTangent);
        if (localLen > 0.001) {
            tangentWorld = localTangent / localLen;
        } else if (length(velocity) > 0.001) {
            tangentWorld = normalize(velocity);
        } else {
            tangentWorld = vec3(0.0, 0.0, 1.0);
        }
    }

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
            rightView = vec3(1.0, 0.0, 0.0);
            rightLen = 1.0;
        }
    }
    rightView = rightView / rightLen;

    // Width in view space - scale with uBaseSize
    float baseWidth = uBaseSize * 0.2;
    float taperT = pow(t, 0.5);
    float halfW = baseWidth * (0.3 + 0.7 * taperT);

    // Offset vertex position in view space along the billboard right vector
    vec3 offsetViewPos = viewPos.xyz + rightView * position.x * halfW;

    // Project to clip space
    gl_Position = projectionMatrix * vec4(offsetViewPos, 1.0);
}
