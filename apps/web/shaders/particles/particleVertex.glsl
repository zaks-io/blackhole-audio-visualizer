uniform sampler2D texturePosition;
uniform sampler2D texturePrevPosition;
uniform sampler2D textureHistory1;
uniform sampler2D textureHistory2;
uniform sampler2D textureVelocity;
uniform sampler2D uColorLUT;
uniform sampler2D uDensityTexture;
uniform float uColorLUTSize;
uniform float uBaseSize;
uniform float uResolutionScale;
uniform float uDebugMode;
uniform vec2 uViewport;
uniform vec2 uDensityTexel;
uniform float uDensityScale;
uniform float uDenseGuardStrength;
uniform float uCenterBiasStrength;
uniform float uMaxDistance;
uniform float uMotionBlurTaper;
uniform float uRedshiftStrength;
uniform float uRedshiftLightSpeed;
uniform float uRedshiftBeaming;
uniform float uRedshiftGravitational;

#define MAX_BLACK_HOLES 4
uniform vec3 uBlackHolePos[MAX_BLACK_HOLES];
uniform float uBlackHoleRadius[MAX_BLACK_HOLES];
uniform int uBlackHoleCount;
uniform float uISCORadius;

attribute vec2 reference;
attribute float crossIndex;

varying vec3 vColor;
varying vec2 vUV;
varying float vDensityAlphaScale;

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

// Arithmetic hash — decorrelates regular grid inputs (reference UVs)
float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(443.8975, 397.2973, 491.1871));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// (1.0, 0.22, 0.08) and (0.35, 0.55, 1.0) divided by their own luminance.
const vec3 REDSHIFT_TINT = vec3(2.6616, 0.5855, 0.2129);
const vec3 BLUESHIFT_TINT = vec3(0.6482, 1.0186, 1.8520);

void main() {
    vec4 posData = texture2D(texturePosition, reference);
    vec3 p3 = posData.xyz;
    float lifetime = posData.w;
    vUV = uv;
    vColor = vec3(0.0);
    vDensityAlphaScale = 0.0;

    // Queued particles need no history, velocity, density, or palette reads.
    float maxDistance = max(1.0, uMaxDistance * 10.0);
    if (lifetime <= 0.0 || dot(p3, p3) > maxDistance * maxDistance) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
        return;
    }

    vec4 prevPosData = texture2D(texturePrevPosition, reference);
    vec4 history1Data = texture2D(textureHistory1, reference);
    vec4 history2Data = texture2D(textureHistory2, reference);
    vec4 velData = texture2D(textureVelocity, reference);
    vec3 p2 = prevPosData.xyz;
    vec3 p1 = history1Data.xyz;
    vec3 p0 = history2Data.xyz;
    vec3 velocity = velData.xyz;
    float colorIndex = velData.w;

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

    // Lifetime identifies recycling even when an emitter is near the old position.
    // A valid trajectory can cross the origin in a multi-source scene.
    bool recycledHistory = prevPosData.w <= 0.0 || history1Data.w <= 0.0 || history2Data.w <= 0.0
        || prevPosData.w > lifetime || history1Data.w > lifetime || history2Data.w > lifetime;
    if (recycledHistory) {
        p0 = p3;
        p1 = p3;
        p2 = p3;
    }

    // Dense zone detection: estimate proximity to particle clustering regions
    // (ISCO capture zone, frame dragging). Used to reduce per-particle rendering
    // cost via ribbon kill, width reduction, and alpha scaling.
    float bhDensityProxy = 0.0;
    // Squared Schwarzschild factor from the deepest well; the redshift block takes one sqrt.
    float gravShiftSq = 1.0;
    for (int i = 0; i < MAX_BLACK_HOLES; i++) {
        if (i >= uBlackHoleCount) break;
        float bhR = uBlackHoleRadius[i];
        if (bhR <= 0.0) continue;
        float dist = length(p3 - uBlackHolePos[i]);
        float zoneOuter = max(uISCORadius * 2.0, bhR * 6.0);
        float prox = clamp(1.0 - (dist - bhR) / (zoneOuter - bhR), 0.0, 1.0);
        bhDensityProxy = max(bhDensityProxy, prox);
        gravShiftSq = min(gravShiftSq, 1.0 - bhR / max(dist, bhR * 1.02));
    }

    // Screen-space density proxy from low-resolution occupancy buffer.
    // This catches particle clumps anywhere on screen, not only around BH zones.
    vec4 headClip = projectionMatrix * modelViewMatrix * vec4(p3, 1.0);
    vec2 headNdc = headClip.xy / max(1e-5, headClip.w);
    vec2 headUv = headNdc * 0.5 + 0.5;
    float screenDensity = 0.0;
    if (headUv.x >= 0.0 && headUv.x <= 1.0 && headUv.y >= 0.0 && headUv.y <= 1.0) {
        float d0 = texture2D(uDensityTexture, headUv).r;
        float d1 = texture2D(uDensityTexture, headUv + vec2(uDensityTexel.x, 0.0)).r;
        float d2 = texture2D(uDensityTexture, headUv - vec2(uDensityTexel.x, 0.0)).r;
        float d3 = texture2D(uDensityTexture, headUv + vec2(0.0, uDensityTexel.y)).r;
        float d4 = texture2D(uDensityTexture, headUv - vec2(0.0, uDensityTexel.y)).r;
        float densitySample = (d0 + d1 + d2 + d3 + d4) * 0.2;
        screenDensity = clamp(densitySample * uDensityScale, 0.0, 1.0);
    }

    // Center-weighted bias: user-reported hotspots are predominantly center-screen.
    float centerProxy = clamp(1.0 - length(headNdc), 0.0, 1.0) * uCenterBiasStrength;

    // Use screen density only when dense-guard is active to avoid visible patchiness in normal mode.
    float guard = clamp(uDenseGuardStrength, 0.0, 1.0);
    float softScreenProxy = clamp(screenDensity * 0.85 + centerProxy * 0.3, 0.0, 1.0) * guard;
    // Keep BH proximity as a soft cue, but gate by projected density so we don't
    // over-trim at camera angles where clusters spread out on screen.
    float bhSoftProxy = bhDensityProxy * mix(0.45, 1.0, screenDensity);
    float softDensityProxy = max(bhSoftProxy, softScreenProxy);

    // Hard culling proxy: keep conservative and trigger only in extreme screen-density zones.
    float extremeScreenProxy = smoothstep(0.8, 1.0, screenDensity) * guard;
    float bhHardProxy = bhDensityProxy * mix(0.15, 1.0, screenDensity);
    float cullDensityProxy = max(bhHardProxy, extremeScreenProxy);

    // Camera-angle relief: when streak motion is close to view direction, heavy
    // culling can create artificial faded line bands. Ease culling in that case.
    vec3 velocityView = mat3(modelViewMatrix) * velocity;
    float velocityViewLen = length(velocityView);
    float viewAlignment = (velocityViewLen > 0.0001) ? abs(velocityView.z) / velocityViewLen : 0.0;
    float angleCullRelief = smoothstep(0.55, 0.92, viewAlignment);

    // Kill second ribbon in dense zones — invisible when many particles overlap
    float denseRibbonThreshold = mix(0.28, 0.18, guard);
    float depthRibbonCullProxy = cullDensityProxy * mix(1.0, 0.45, angleCullRelief);
    if (crossIndex > 0.5 && depthRibbonCullProxy > denseRibbonThreshold) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
        vColor = vec3(0.0);
        vDensityAlphaScale = 0.0;
        return;
    }

    // Stochastic particle culling: deterministically cull entire particles in dense
    // zones. Hash of reference is constant across all 64 vertices of an instance,
    // so no partial artifacts or temporal flickering.
    float particleHash = hash21(reference);
    float denseCullGain = mix(0.12, 0.3, guard) * mix(1.0, 0.6, angleCullRelief);
    float cullProb = smoothstep(0.65, 1.0, cullDensityProxy) * denseCullGain;
    if (particleHash < cullProb) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
        vColor = vec3(0.0);
        vDensityAlphaScale = 0.0;
        return;
    }

    // Scale down alpha in dense zones so Gaussian tails hit the discard threshold.
    // Additive blend still saturates from the remaining particle cores.
    float denseAlphaFloor = mix(0.72, 0.55, guard);
    vDensityAlphaScale = mix(1.0, denseAlphaFloor, softDensityProxy * softDensityProxy);

    // Color from LUT
    float idx = clamp(floor(colorIndex + 0.5), 0.0, uColorLUTSize - 1.0);
    vColor = texture2D(uColorLUT, vec2((idx + 0.5) / uColorLUTSize, 0.5)).rgb;

    // Relativistic color shift. Doppler from line-of-sight velocity, gravitational from the
    // nearest well, beaming scales brightness. This runs for all 64 ribbon vertices of every
    // particle, so it stays to a handful of ops: one rsqrt, two sqrt, one pow.
    if (uRedshiftStrength > 0.0) {
        vec3 toCamera = cameraPosition - p3;
        float losSpeed = dot(velocity, toCamera) * inversesqrt(max(dot(toCamera, toCamera), 1e-6));
        float beta = clamp(losSpeed / max(uRedshiftLightSpeed, 1.0), -0.95, 0.95);
        float doppler = sqrt((1.0 + beta) / (1.0 - beta));
        float shift = doppler * mix(1.0, sqrt(gravShiftSq), uRedshiftGravitational);

        // Tint targets are pre-scaled to luminance 1 so brightness is owned by beaming alone.
        float shiftDelta = shift - 1.0;
        vec3 target = (shiftDelta < 0.0 ? REDSHIFT_TINT : BLUESHIFT_TINT) * luminance(vColor);
        float tintAmount = clamp(abs(shiftDelta) * 2.5, 0.0, 1.0) * uRedshiftStrength;
        vColor = mix(vColor, target, tintAmount);

        vColor *= pow(shift, 3.0 * uRedshiftBeaming * uRedshiftStrength);
    }

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
    // Geometry extends slightly beyond [-0.5, 0.5] for ribbon shaping, so clamp
    // to avoid extrapolating BH history (causes offset fade lobes) and NaN taper.
    float t = clamp(position.y + 0.5, 0.0, 1.0);

    // Position along the curve using ACTUAL historical positions.
    // NOTE: Standard Catmull-Rom(p0,p1,p2,p3,t) covers p1->p2, not p0->p3.
    // We explicitly build a 3-segment polycurve to span tail->head.
    vec3 curvePos = evalTrailCurve(p0, p1, p2, p3, t);

    // Transform curve position to view space
    vec4 viewPos = modelViewMatrix * vec4(curvePos, 1.0);
    float viewDist = max(0.001, -viewPos.z);
    float nearProxy = clamp((90.0 - viewDist) / 90.0, 0.0, 1.0);
    float closeDenseProxy = nearProxy * softDensityProxy * guard;

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
    vec3 upView;
    if (screenLen > 0.001) {
        // Primary ribbon: perpendicular in screen space
        rightView = vec3(-screenDir.y, screenDir.x, 0.0) / screenLen;
        // Secondary ribbon: perpendicular to both tangent and primary right
        upView = normalize(cross(tangentView, rightView));
    } else {
        // Ribbon pointing at camera - use orthogonal axes
        rightView = vec3(1.0, 0.0, 0.0);
        upView = vec3(0.0, 1.0, 0.0);
    }

    // Select ribbon plane based on crossIndex (0 = screen-aligned, 1 = depth-aligned)
    vec3 offsetDir = (crossIndex < 0.5) ? rightView : upView;

    // Width in view space - scale with uBaseSize
    // Global width trim so trails read more like thin star streaks at typical pointSize values.
    float baseWidth = uBaseSize * max(uResolutionScale, 0.0001) * 0.65;
    float taperExponent = mix(0.5, 2.5, clamp(uMotionBlurTaper, 0.0, 1.0));
    float taperT = pow(t, taperExponent);
    float halfW = baseWidth * (0.3 + 0.7 * taperT);

    // Shrink ribbons in dense zones to reduce rasterized fragment count
    float denseWidthFloor = mix(0.78, 0.58, guard);
    halfW *= mix(1.0, denseWidthFloor, softDensityProxy * softDensityProxy);

    // Close-camera safeguard: when dense clusters get very near camera, cap
    // maximum on-screen ribbon width to avoid catastrophic overdraw spikes.
    float projY = projectionMatrix[1][1]; // f = 1/tan(fov/2)
    float viewPerPixel = (2.0 * viewDist) / (max(1.0, uViewport.y) * projY);
    float maxHalfPixels = mix(120.0, 22.0, closeDenseProxy);
    halfW = min(halfW, viewPerPixel * maxHalfPixels);

    // Additional mild alpha trim only for close+dense cases to cut blend load
    // without introducing hard cull artifacts.
    vDensityAlphaScale *= mix(1.0, 0.84, closeDenseProxy * closeDenseProxy);

    // Prevent subpixel “holes”/moiré by enforcing a minimum screen-space width.
    // Convert 1 pixel to view-space units at this depth using projectionMatrix and viewport height.
    halfW = max(halfW, viewPerPixel * 1.5); // ~1.5 px minimum half-width

    // Offset vertex position in view space along the selected ribbon direction
    vec3 offsetViewPos = viewPos.xyz + offsetDir * position.x * halfW;

    gl_Position = projectionMatrix * vec4(offsetViewPos, 1.0);
}
