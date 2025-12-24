uniform sampler2D texturePosition;
uniform sampler2D texturePrevPosition;
uniform sampler2D textureHistory1;
uniform sampler2D textureHistory2;
uniform sampler2D textureVelocity;
uniform sampler2D uColorLUT;
uniform float uColorLUTSize;
uniform float uBaseSize;

attribute vec2 reference;

varying vec3 vColor;
varying vec2 vUV;

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

    // Hide unspawned particles
    if (lifetime < 0.0) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
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

    // Color from LUT
    float idx = clamp(floor(colorIndex + 0.5), 0.0, uColorLUTSize - 1.0);
    vColor = texture2D(uColorLUT, vec2((idx + 0.5) / uColorLUTSize, 0.5)).rgb;

    // t: 0 = tail (p0), 1 = head (p3)
    float t = position.y + 0.5;

    // Position along the curve using ACTUAL historical positions
    vec3 curvePos = catmullRom(p0, p1, p2, p3, t);

    // Transform curve position to view space
    vec4 viewPos = modelViewMatrix * vec4(curvePos, 1.0);

    // Get ribbon direction in view space
    vec3 ribbonDir = p3 - p0;
    float ribbonLen = length(ribbonDir);
    if (ribbonLen < 0.001) {
        ribbonDir = velocity;
        ribbonLen = length(ribbonDir);
    }
    if (ribbonLen > 0.001) {
        ribbonDir = ribbonDir / ribbonLen;
    } else {
        ribbonDir = vec3(0.0, 0.0, 1.0);
    }
    vec3 ribbonDirView = mat3(modelViewMatrix) * ribbonDir;

    // Project onto screen plane (XY in view space) and get perpendicular
    vec2 screenDir = ribbonDirView.xy;
    float screenLen = length(screenDir);

    vec3 rightView;
    if (screenLen > 0.001) {
        // Rotate 90 degrees in screen space: (x,y) -> (-y,x)
        rightView = vec3(-screenDir.y, screenDir.x, 0.0) / screenLen;
    } else {
        // Ribbon pointing at camera - use screen-right
        rightView = vec3(1.0, 0.0, 0.0);
    }

    // Width in view space - scale with uBaseSize
    float baseWidth = uBaseSize * 1.0;
    float taperT = pow(t, 0.5);
    float halfW = baseWidth * (0.3 + 0.7 * taperT);

    // Offset vertex position in view space along the billboard right vector
    vec3 offsetViewPos = viewPos.xyz + rightView * position.x * halfW;

    // Project to clip space
    gl_Position = projectionMatrix * vec4(offsetViewPos, 1.0);
}
