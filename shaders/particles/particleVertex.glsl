uniform sampler2D texturePosition;
uniform sampler2D texturePrevPosition;
uniform sampler2D textureHistory1;
uniform sampler2D textureHistory2;
uniform sampler2D textureVelocity;
uniform sampler2D uColorLUT;
uniform float uColorLUTSize;
uniform float uBaseSize;
uniform float uResolutionScale;
uniform float uDebugMode;
uniform vec2 uViewport;

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

// Evaluate a tail->head polycurve over the 4 history samples using 3 Catmull-Rom segments.
// - seg 0 covers p0 -> p1 (clamped endpoints)
// - seg 1 covers p1 -> p2 (standard interior segment)
// - seg 2 covers p2 -> p3 (clamped endpoints)
vec3 evalTrailCurve(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t01) {
    float tClamped = clamp(t01, 0.0, 1.0);
    // Map [0,1] -> [0,3) so we get 3 segments. Guard t=1.0.
    float segf = min(tClamped * 3.0, 2.999999);
    float seg = floor(segf); // 0,1,2
    float u = segf - seg;    // local segment parameter [0,1)

    vec3 a;
    vec3 b;
    vec3 c;
    vec3 d;

    if (seg < 0.5) {
        // p0 -> p1
        a = p0; b = p0; c = p1; d = p2;
    } else if (seg < 1.5) {
        // p1 -> p2
        a = p0; b = p1; c = p2; d = p3;
    } else {
        // p2 -> p3
        a = p1; b = p2; c = p3; d = p3;
    }

    return catmullRom(a, b, c, d, u);
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

    // Debug visualization: show fractional parts of position at different scales.
    // Use this to detect quantization (steppy bands) vs correlated randomness.
    float dbg = floor(uDebugMode + 0.5);
    if (dbg >= 1.0) {
        float scale = 1.0;
        if (dbg >= 2.0) scale = 10.0;
        if (dbg >= 3.0) scale = 100.0;
        vColor = fract(abs(p3) * scale);
    }

    // t: 0 = tail (p0), 1 = head (p3)
    float t = position.y + 0.5;

    // Position along the curve using ACTUAL historical positions.
    // NOTE: Standard Catmull-Rom(p0,p1,p2,p3,t) covers p1->p2, not p0->p3.
    // We explicitly build a 3-segment polycurve to span tail->head.
    vec3 curvePos = evalTrailCurve(p0, p1, p2, p3, t);

    // Transform curve position to view space
    vec4 viewPos = modelViewMatrix * vec4(curvePos, 1.0);

    // Local tangent in view space (finite difference on the same polycurve).
    // This ensures the streak width is oriented correctly even on curved/off-axis trails.
    float dt = 1.0 / 96.0;
    float t0 = max(0.0, t - dt);
    float t1 = min(1.0, t + dt);
    vec3 curvePos0 = evalTrailCurve(p0, p1, p2, p3, t0);
    vec3 curvePos1 = evalTrailCurve(p0, p1, p2, p3, t1);
    vec3 tangentWorld = curvePos1 - curvePos0;
    float tangentLen = length(tangentWorld);
    if (tangentLen < 0.001) {
        tangentWorld = velocity;
        tangentLen = length(tangentWorld);
    }
    if (tangentLen > 0.001) {
        tangentWorld = tangentWorld / tangentLen;
    } else {
        tangentWorld = vec3(0.0, 0.0, 1.0);
    }
    vec3 tangentView = mat3(modelViewMatrix) * tangentWorld;

    // Project onto screen plane (XY in view space) and get perpendicular
    vec2 screenDir = tangentView.xy;
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
    // Global width trim so trails read more like thin star streaks at typical pointSize values.
    float baseWidth = uBaseSize * max(uResolutionScale, 0.0001) * 0.65;
    float taperT = pow(t, 0.5);
    float halfW = baseWidth * (0.3 + 0.7 * taperT);

    // Prevent subpixel “holes”/moiré by enforcing a minimum screen-space width.
    // Convert 1 pixel to view-space units at this depth using projectionMatrix and viewport height.
    float projY = projectionMatrix[1][1]; // f = 1/tan(fov/2)
    float viewPerPixel = (2.0 * max(0.001, -viewPos.z)) / (max(1.0, uViewport.y) * projY);
    halfW = max(halfW, viewPerPixel * 0.75); // ~0.75 px minimum half-width

    // Offset vertex position in view space along the billboard right vector
    vec3 offsetViewPos = viewPos.xyz + rightView * position.x * halfW;

    // Project to clip space
    gl_Position = projectionMatrix * vec4(offsetViewPos, 1.0);
}
