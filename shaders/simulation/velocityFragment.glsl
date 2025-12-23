#define MAX_BLACK_HOLES 4

uniform float uTime;
uniform float uDeltaTime;
uniform float uGM;
uniform float uSoftening;
uniform float uEventHorizon;
uniform float uEmissionRadius;
uniform float uEmitterCount;
uniform float uInwardAngle;
uniform float uISCORadius;
uniform float uISCOStrength;
uniform float uEmitterSpread;
uniform float uBeatIntensity;
uniform float uBeatRepulsion;
uniform float uPaletteOffset;
uniform bool uDoKick;
uniform float uHFCBoost;
uniform float uLifetimeGracePeriod;
uniform float uLifetimeMax;
uniform float uLifetimeGravityMultiplier;
uniform float uOrbitDecay;

// Multi-black hole uniforms
uniform vec3 uBlackHolePos[MAX_BLACK_HOLES];
uniform float uBlackHoleMass[MAX_BLACK_HOLES];
uniform int uBlackHoleCount;

// 1D hash that explicitly breaks grid correlation by combining x and y
float hash(vec2 p) {
    float n = p.x * 127.1 + p.y * 311.7;
    return fract(sin(n) * 43758.5453);
}

float hash2(vec2 p, float seed) {
    float n = p.x * 127.1 + p.y * 311.7 + seed * 573.9;
    return fract(sin(n) * 43758.5453);
}

// Always-on launch decorrelation (independent of uEmitterSpread).
// Kept modest to preserve the overall spoke aesthetic while breaking phase-locked streak banding.
const float BASE_LAUNCH_ANGLE_JITTER = 0.04;   // radians
const float BASE_LAUNCH_ELEV_JITTER  = 0.02;   // radians
const float BASE_LAUNCH_SPEED_JITTER = 0.06;   // multiplier range ~ +/-3%
const float BASE_LAUNCH_RADIAL_JITTER = 0.03;  // multiplier of orbitalSpeed
// Always-on micro-turbulence applied during KICK (affects all alive particles, not just spawns).
// This is intentionally very small; it should break persistent banding without destroying the spoke aesthetic.
const float BASE_KICK_TURBULENCE = 0.35; // acceleration-ish magnitude (scaled by dt)

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);

    vec3 pos = posData.xyz;
    float lifetime = posData.w;
    vec3 vel = velData.xyz;
    float colorIndex = velData.w;

    if (lifetime < 0.0) {
        // Compute emitter index consistently with position shader (same hash seed)
        float emitterIndex = floor(hash2(uv, 100.0) * uEmitterCount);

        // WAITING: compute color index based on current palette
        colorIndex = mod(emitterIndex, 8.0) + uPaletteOffset;
        gl_FragColor = vec4(0.0, 0.0, 0.0, colorIndex);
        return;
    } else if (dot(vel, vel) < 0.01) {
        // JUST SPAWNED: set orbital velocity with inward angle
        // Find nearest black hole for orbital velocity calculation
        float nearestDist = 99999.0;
        vec3 nearestPos = vec3(0.0);
        float nearestMass = uGM;
        for (int i = 0; i < MAX_BLACK_HOLES; i++) {
            if (i >= uBlackHoleCount) break;
            float dist = length(pos - uBlackHolePos[i]);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPos = uBlackHolePos[i];
                nearestMass = uBlackHoleMass[i];
            }
        }

        vec3 toCenter = pos - nearestPos;
        float r_soft = length(toCenter) + uSoftening;
        float orbitalSpeed = sqrt(nearestMass / r_soft);

        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 r_hat = normalize(toCenter);
        vec3 tangent = normalize(cross(up, r_hat));

        // Emitter index (matches position shader) so our time seeding is lane-aware
        float emitterIndex = floor(hash2(uv, 100.0) * uEmitterCount);
        float timeSeed = uTime * 19.0 + emitterIndex * 7.0;

        // Generate random values with different seeds
        float rand1 = hash2(uv, 1.0);
        float rand2 = hash2(uv, 2.0);
        float rand3 = hash2(uv, 3.0);
        float rand4 = hash2(uv, 4.0);

        // All jitter now scales with uEmitterSpread - when spread is 0, no jitter
        float baseAngleJitter = (hash2(uv, uTime) - 0.5) * 0.1 * uEmitterSpread;
        float baseElevJitter = (hash2(uv, uTime + 100.0) - 0.5) * 0.05 * uEmitterSpread;
        float baseSpeedJitter = (hash2(uv, uTime + 200.0) - 0.5) * 0.2 * uEmitterSpread;

        // Always-on micro-jitter (time-varying) to break phase locking even when uEmitterSpread = 0
        float microAngleJitter = (hash2(uv, 10000.0 + timeSeed) - 0.5) * BASE_LAUNCH_ANGLE_JITTER;
        float microElevJitter  = (hash2(uv, 11000.0 + timeSeed) - 0.5) * BASE_LAUNCH_ELEV_JITTER;
        float microSpeedJitter = (hash2(uv, 12000.0 + timeSeed) - 0.5) * BASE_LAUNCH_SPEED_JITTER;
        float microRadialJitter = (hash2(uv, 13000.0 + timeSeed) - 0.5) * BASE_LAUNCH_RADIAL_JITTER;

        // Horizontal jitter - vary launch angle in orbital plane
        float angleJitter = baseAngleJitter + (rand1 - 0.5) * uEmitterSpread + microAngleJitter;
        vec3 jitteredTangent = tangent * cos(angleJitter) + r_hat * sin(angleJitter);

        // Elevation jitter - vary launch angle up/down from orbital plane
        float elevationJitter = baseElevJitter + (rand2 - 0.5) * uEmitterSpread * 0.5 + microElevJitter;
        vec3 direction = normalize(jitteredTangent * cos(elevationJitter) + up * sin(elevationJitter));

        // Mix with inward based on uInwardAngle
        vec3 inward = -r_hat;
        direction = normalize(mix(direction, inward, uInwardAngle));

        vel = direction * orbitalSpeed;

        // Speed jitter - also fully controlled by spread
        vel *= (1.0 + baseSpeedJitter + (rand3 - 0.5) * uEmitterSpread * 0.3 + microSpeedJitter);

        // Radial velocity jitter - scales with spread
        float radialJitter = (rand4 - 0.5) * orbitalSpeed * uEmitterSpread * 0.4;
        vel += r_hat * (radialJitter + microRadialJitter * orbitalSpeed);

        // HFC boost - punch on percussive hits (snare, hi-hat)
        vel *= (1.0 + uHFCBoost * 0.3);
    } else if (uDoKick) {
        // KICK: Apply gravitational acceleration from ALL sources (half-step)
        vec3 totalAccel = vec3(0.0);
        float totalPotential = 0.0;

        // Find nearest black hole for ISCO and beat repulsion
        int nearestIdx = 0;
        float nearestDist = 99999.0;
        vec3 nearestDir = vec3(0.0);

        // Lifetime decay: particles get heavier after grace period
        float decayProgress = smoothstep(uLifetimeGracePeriod, uLifetimeMax, lifetime);
        float gravityMultiplier = 1.0 + (uLifetimeGravityMultiplier - 1.0) * decayProgress;

        for (int i = 0; i < MAX_BLACK_HOLES; i++) {
            if (i >= uBlackHoleCount) break;

            vec3 toSource = uBlackHolePos[i] - pos;
            float dist = length(toSource);
            float dist_soft = dist + uSoftening;

            // Sum gravity from all sources (with lifetime decay multiplier)
            float accel = uBlackHoleMass[i] / (dist_soft * dist_soft) * gravityMultiplier;
            totalAccel += normalize(toSource) * accel;

            // Sum potential for escape velocity
            totalPotential += uBlackHoleMass[i] / dist_soft;

            // Track nearest for ISCO
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
                nearestDir = normalize(pos - uBlackHolePos[i]);
            }
        }

        // Apply gravity half-step kick
        vel += totalAccel * uDeltaTime * 0.5;

        // Always-on micro-turbulence: time-varying, lane-aware, and mostly tangential.
        // This breaks long-lived, phase-locked banding patterns even when emitterSpread=0.
        float emitterIndexKick = floor(hash2(uv, 100.0) * uEmitterCount);
        float tStep = floor(uTime * 12.0); // update noise ~12 Hz to avoid per-frame shimmer
        float seed = tStep * 97.0 + emitterIndexKick * 31.0;
        vec3 n = vec3(
            hash2(uv, 14000.0 + seed),
            hash2(uv, 15000.0 + seed),
            hash2(uv, 16000.0 + seed)
        ) - 0.5;
        vec3 nDir = normalize(n + vec3(1e-3));
        vec3 tangentNoise = normalize(cross(nDir, normalize(vel + vec3(1e-3))));
        vel += tangentNoise * (BASE_KICK_TURBULENCE * uDeltaTime * 0.5);

        // Beat-reactive repulsion from nearest black hole
        if (uBeatRepulsion > 0.0 && uBeatIntensity > 0.0 && nearestDist > 0.1) {
            float nearestAccel = uBlackHoleMass[nearestIdx] / ((nearestDist + uSoftening) * (nearestDist + uSoftening));
            float repulsionAccel = uBeatIntensity * (uBeatRepulsion / 100.0) * nearestAccel;
            vel += nearestDir * repulsionAccel * uDeltaTime * 0.5;
        }

        // Orbital decay: reduce tangential velocity (angular momentum loss)
        // This creates natural spiral motion instead of radial spokes
        if (uOrbitDecay > 0.0 && nearestDist > uEventHorizon) {
            float radialVel = dot(vel, nearestDir);
            vec3 tangentialVel = vel - nearestDir * radialVel;

            // Decay tangential velocity - scale factor for reasonable slider values
            float decayRate = uOrbitDecay * 0.05 * uDeltaTime;
            tangentialVel *= (1.0 - decayRate);

            vel = nearestDir * radialVel + tangentialVel;
        }

        // Combined escape velocity cap from total gravitational potential
        float escapeVel = sqrt(2.0 * totalPotential);
        float maxVel = escapeVel * (1.0 - uISCOStrength * 0.5);
        float currentSpeed = length(vel);
        if (currentSpeed > maxVel) {
            vel *= maxVel / currentSpeed;
        }

        // Multi-body Roche lobe physics with per-BH ISCO capture
        if (uBlackHoleCount > 1 && uISCOStrength > 0.0) {
            // Calculate potential contributions from ALL black holes
            float potentials[MAX_BLACK_HOLES];
            float totalPotential = 0.0;

            for (int i = 0; i < MAX_BLACK_HOLES; i++) {
                if (i >= uBlackHoleCount) {
                    potentials[i] = 0.0;
                    continue;
                }
                float dist = length(pos - uBlackHolePos[i]) + uSoftening;
                potentials[i] = uBlackHoleMass[i] / dist;
                totalPotential += potentials[i];
            }

            // Find dominant BH and second-strongest for lobe depth calculation
            int dominantIdx = 0;
            float maxPotential = 0.0;
            float secondMaxPotential = 0.0;

            for (int i = 0; i < MAX_BLACK_HOLES; i++) {
                if (i >= uBlackHoleCount) break;
                if (potentials[i] > maxPotential) {
                    secondMaxPotential = maxPotential;
                    maxPotential = potentials[i];
                    dominantIdx = i;
                } else if (potentials[i] > secondMaxPotential) {
                    secondMaxPotential = potentials[i];
                }
            }

            // Dominance ratio: how much stronger is dominant vs next strongest
            // High ratio = deep in lobe, low ratio = near L-point
            float dominanceRatio = maxPotential / (secondMaxPotential + 0.001);

            // lobeDepth: 0.0 at L-point (equal potentials), approaches 1.0 deep in lobe
            float lobeDepth = 1.0 - 1.0 / (0.5 + dominanceRatio * 0.5);
            lobeDepth = clamp(lobeDepth, 0.0, 1.0);

            // Distance/direction to dominant black hole
            float distToDominant = length(pos - uBlackHolePos[dominantIdx]);
            vec3 toDominant = normalize(uBlackHolePos[dominantIdx] - pos);
            vec3 fromDominant = -toDominant;

            // Per-BH ISCO radius scales with mass
            float massRatio = uBlackHoleMass[dominantIdx] / (totalPotential * distToDominant + 0.001);
            float bhISCORadius = uISCORadius * sqrt(massRatio) * 0.5 + uISCORadius * 0.5;

            float lobeThreshold = 0.3;

            if (lobeDepth > lobeThreshold && distToDominant < bhISCORadius && distToDominant > uEventHorizon) {
                // ISCO CAPTURE ZONE - spiral dynamics toward dominant BH

                float iscoDepth = 1.0 - (distToDominant - uEventHorizon) / (bhISCORadius - uEventHorizon);
                iscoDepth = clamp(iscoDepth, 0.0, 1.0);

                // Scale effect by both lobe depth and ISCO depth
                float captureStrength = iscoDepth * (lobeDepth - lobeThreshold) / (1.0 - lobeThreshold);
                captureStrength = clamp(captureStrength, 0.0, 1.0);

                float orbitalSpeed = sqrt(uBlackHoleMass[dominantIdx] / (distToDominant + uSoftening));

                // Decompose velocity relative to dominant BH
                float radialVel = dot(vel, fromDominant);
                vec3 tangentialVel = vel - fromDominant * radialVel;

                // Progressive tangential decay (angular momentum loss) - keep 20% for spiral
                float tangentialDecay = captureStrength * uISCOStrength * 0.8;
                tangentialVel *= (1.0 - tangentialDecay);

                // Force inward spiral
                float targetRadialVel = -orbitalSpeed * captureStrength * uISCOStrength;
                radialVel = min(radialVel, targetRadialVel);

                vel = fromDominant * radialVel + tangentialVel;
            }
            else if (lobeDepth > lobeThreshold) {
                // DRIFT ZONE - deep in lobe but outside ISCO
                float driftStrength = (lobeDepth - lobeThreshold) / (1.0 - lobeThreshold);
                driftStrength *= uISCOStrength * 2.0; // Stronger than original 0.5
                vel += toDominant * driftStrength * uDeltaTime;
            }
            // Near L-points (lobeDepth < 0.3): N-body gravity creates chaotic transfers
        }
        else if (uBlackHoleCount == 1 && uISCOStrength > 0.0) {
            // Single black hole: Original ISCO physics
            if (nearestDist < uISCORadius && nearestDist > uEventHorizon) {
                float iscoDepth = 1.0 - (nearestDist - uEventHorizon) / (uISCORadius - uEventHorizon);
                iscoDepth = clamp(iscoDepth, 0.0, 1.0);

                float orbitalSpeed = sqrt(uBlackHoleMass[0] / (nearestDist + uSoftening));

                // Decompose velocity relative to black hole
                float radialVel = dot(vel, nearestDir);
                vec3 tangentialVel = vel - nearestDir * radialVel;

                // Kill tangential velocity progressively
                tangentialVel *= (1.0 - iscoDepth * uISCOStrength);

                // Force inward
                radialVel = min(radialVel, -orbitalSpeed * iscoDepth * uISCOStrength);

                vel = nearestDir * radialVel + tangentialVel;
            }
        }
    }

    // Preserve colorIndex - it was set at spawn time and shouldn't change
    gl_FragColor = vec4(vel, colorIndex);
}
