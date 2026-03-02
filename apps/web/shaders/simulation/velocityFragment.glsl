#define MAX_BLACK_HOLES 4

precision highp float;
precision highp int;
precision highp sampler2D;

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
uniform float uFrameDragging;

// Multi-black hole uniforms
uniform vec3 uBlackHolePos[MAX_BLACK_HOLES];
uniform float uBlackHoleMass[MAX_BLACK_HOLES];
uniform float uBlackHoleRadius[MAX_BLACK_HOLES];
uniform int uBlackHoleCount;

// Lattice-safe hash (Dave Hoskins style). Works well when inputs are integer texel coords.
float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float hash(vec2 p) {
    return hash13(vec3(p, 0.0));
}

float hash2(vec2 p, float seed) {
    return hash13(vec3(p, seed));
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
    vec2 ip = gl_FragCoord.xy; // integer texel coords (as floats) for PRNG seeding

    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);

    vec3 pos = posData.xyz;
    float lifetime = posData.w;
    vec3 vel = velData.xyz;
    float colorIndex = velData.w;

    if (lifetime <= 0.0) {
        // Compute emitter index consistently with position shader (same hash seed)
        float emitterIndex = floor(hash2(ip, 100.0) * uEmitterCount);

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
        vec3 tangent = normalize(cross(r_hat, up));

        // Emitter index (matches position shader) so our time seeding is lane-aware
        float emitterIndex = floor(hash2(ip, 100.0) * uEmitterCount);
        float timeSeed = uTime * 19.0 + emitterIndex * 7.0;

        // Generate random values with different seeds
        float rand1 = hash2(ip, 1.0);
        float rand2 = hash2(ip, 2.0);
        float rand3 = hash2(ip, 3.0);
        float rand4 = hash2(ip, 4.0);

        // All jitter now scales with uEmitterSpread - when spread is 0, no jitter
        float baseAngleJitter = (hash2(ip, uTime) - 0.5) * 0.1 * uEmitterSpread;
        float baseElevJitter = (hash2(ip, uTime + 100.0) - 0.5) * 0.05 * uEmitterSpread;
        float baseSpeedJitter = (hash2(ip, uTime + 200.0) - 0.5) * 0.2 * uEmitterSpread;

        // Micro-jitter scales with orbital decay - when decay is 0, no jitter for stable orbits
        float jitterScale = clamp(uOrbitDecay / 5.0, 0.0, 1.0);
        float microAngleJitter = (hash2(ip, 10000.0 + timeSeed) - 0.5) * BASE_LAUNCH_ANGLE_JITTER * jitterScale;
        float microElevJitter  = (hash2(ip, 11000.0 + timeSeed) - 0.5) * BASE_LAUNCH_ELEV_JITTER * jitterScale;
        float microSpeedJitter = (hash2(ip, 12000.0 + timeSeed) - 0.5) * BASE_LAUNCH_SPEED_JITTER * jitterScale;
        float microRadialJitter = (hash2(ip, 13000.0 + timeSeed) - 0.5) * BASE_LAUNCH_RADIAL_JITTER * jitterScale;

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

        // Inherit local frame rotation at spawn point
        if (uFrameDragging > 0.0) {
            vec3 spinAxis = vec3(0.0, 1.0, 0.0);
            vec3 r_perp = -(toCenter - spinAxis * dot(toCenter, spinAxis));
            float r_perp_len = length(r_perp);
            if (r_perp_len > 0.1) {
                float omega = uFrameDragging * nearestMass / (r_soft * r_soft * r_soft);
                vec3 dragDir = normalize(cross(spinAxis, r_perp));
                vel += dragDir * omega * r_perp_len;
            }
        }
    } else if (uDoKick) {
        // KICK: Apply gravitational acceleration from ALL sources (half-step)
        vec3 totalAccel = vec3(0.0);
        float totalPotential = 0.0;

        // Find nearest black hole for ISCO and beat repulsion
        int nearestIdx = 0;
        float nearestDist = 99999.0;
        vec3 nearestDir = vec3(0.0);

        // Lifetime decay: particles get heavier after grace period
        // Scale by orbital decay - when decay is 0, no gravity boost for stable orbits
        float decayProgress = smoothstep(uLifetimeGracePeriod, uLifetimeMax, lifetime);
        float orbitDecayFactor = clamp(uOrbitDecay / 5.0, 0.0, 1.0);
        float gravityMultiplier = 1.0 + (uLifetimeGravityMultiplier - 1.0) * decayProgress * orbitDecayFactor;

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

        // Micro-turbulence scales with orbital decay - when decay is 0, no turbulence for stable orbits
        float emitterIndexKick = floor(hash2(ip, 100.0) * uEmitterCount);
        float tStep = floor(uTime * 12.0); // update noise ~12 Hz to avoid per-frame shimmer
        float seed = tStep * 97.0 + emitterIndexKick * 31.0;
        vec3 n = vec3(
            hash2(ip, 14000.0 + seed),
            hash2(ip, 15000.0 + seed),
            hash2(ip, 16000.0 + seed)
        ) - 0.5;
        vec3 nDir = normalize(n + vec3(1e-3));
        vec3 tangentNoise = normalize(cross(nDir, normalize(vel + vec3(1e-3))));
        vel += tangentNoise * (BASE_KICK_TURBULENCE * uDeltaTime * 0.5 * orbitDecayFactor);

        // Beat-reactive repulsion from nearest black hole
        if (uBeatRepulsion > 0.0 && uBeatIntensity > 0.0 && nearestDist > 0.1) {
            float nearestAccel = uBlackHoleMass[nearestIdx] / ((nearestDist + uSoftening) * (nearestDist + uSoftening));
            float repulsionAccel = uBeatIntensity * (uBeatRepulsion / 100.0) * nearestAccel;
            vel += nearestDir * repulsionAccel * uDeltaTime * 0.5;
        }

        // Orbital decay: reduce tangential velocity (angular momentum loss)
        // This creates natural spiral motion instead of radial spokes
        float nearestRadius = uBlackHoleRadius[nearestIdx];
        if (uOrbitDecay > 0.0 && nearestDist > nearestRadius) {
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
            float bhEventHorizon = uBlackHoleRadius[dominantIdx];

            if (lobeDepth > lobeThreshold && distToDominant < bhISCORadius && distToDominant > bhEventHorizon) {
                // ISCO CAPTURE ZONE - spiral dynamics toward dominant BH

                float iscoDepth = 1.0 - (distToDominant - bhEventHorizon) / (bhISCORadius - bhEventHorizon);
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
                driftStrength *= uISCOStrength * 2.0 * orbitDecayFactor;
                vel += toDominant * driftStrength * uDeltaTime;
            }
            // L-point speed cap only - no damping (damping traps particles at barycenter)
            float lPointProximity = max(0.0, 1.0 - lobeDepth / lobeThreshold);

            if (lPointProximity > 0.0) {
                float avgMass = totalPotential * (uEmissionRadius + uSoftening);
                float maxLPointSpeed = sqrt(avgMass / (uEmissionRadius + uSoftening)) * 0.5;
                float speed = length(vel);
                if (speed > maxLPointSpeed) {
                    vel *= maxLPointSpeed / speed;
                }
            }
        }
        else if (uBlackHoleCount == 1 && uISCOStrength > 0.0) {
            // Single black hole: Original ISCO physics
            float singleBHRadius = uBlackHoleRadius[0];
            if (nearestDist < uISCORadius && nearestDist > singleBHRadius) {
                float iscoDepth = 1.0 - (nearestDist - singleBHRadius) / (uISCORadius - singleBHRadius);
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

        // Frame dragging (Lense-Thirring) — applied LAST
        // Blends tangential velocity toward the local co-rotation speed rather
        // than accumulating acceleration. This can't eject particles because it
        // converges to a finite target (orbital speed), and only speeds up
        // particles that are slower than co-rotation — never slows them down.
        if (uFrameDragging > 0.0) {
            vec3 spinAxis = vec3(0.0, 1.0, 0.0);
            for (int i = 0; i < MAX_BLACK_HOLES; i++) {
                if (i >= uBlackHoleCount) break;

                vec3 toSource = uBlackHolePos[i] - pos;
                float dist = length(toSource);
                float dist_soft = dist + uSoftening;
                float r_horizon = uBlackHoleRadius[i];

                vec3 r_perp = toSource - spinAxis * dot(toSource, spinAxis);
                float r_perp_len = length(r_perp);
                if (r_perp_len > 0.1) {
                    vec3 dragDir = normalize(cross(spinAxis, r_perp));

                    // Target: co-rotate at orbital speed scaled by frame drag parameter
                    float orbitalSpeed = sqrt(uBlackHoleMass[i] / dist_soft);
                    float targetSpeed = orbitalSpeed * uFrameDragging;

                    // Blend rate: how quickly to converge (scales with M/r²)
                    float blendRate = uFrameDragging * uBlackHoleMass[i] / (dist_soft * dist_soft) * 0.001;

                    // Ergosphere boost zone: extends to photon sphere (1.5 Rs)
                    float ergosphere = r_horizon * 1.5;
                    if (dist < ergosphere) {
                        float ergoDepth = 1.0 - (dist - r_horizon) / (ergosphere - r_horizon);
                        ergoDepth = clamp(ergoDepth, 0.0, 1.0);
                        blendRate = max(blendRate, ergoDepth * ergoDepth * 30.0);
                        targetSpeed = max(targetSpeed, orbitalSpeed * ergoDepth);
                    }

                    // Inside ISCO: reduce co-rotation target so particles plunge.
                    // Applied AFTER ergosphere so it wins — no stable orbits inside ISCO.
                    if (dist < uISCORadius && dist > r_horizon) {
                        float iscoDepth = 1.0 - (dist - r_horizon) / (uISCORadius - r_horizon);
                        iscoDepth = clamp(iscoDepth, 0.0, 1.0);
                        targetSpeed *= (1.0 - iscoDepth);
                    }

                    float blend = 1.0 - exp(-blendRate * uDeltaTime);

                    // Only enforce co-rotation for particles slower than frame drag.
                    // Faster prograde particles are left alone.
                    float currentDragVel = dot(vel, dragDir);
                    if (currentDragVel < targetSpeed) {
                        float newDragVel = mix(currentDragVel, targetSpeed, blend);
                        vel += dragDir * (newDragVel - currentDragVel);
                    }
                }
            }
        }
    }

    // Preserve colorIndex - it was set at spawn time and shouldn't change
    gl_FragColor = vec4(vel, colorIndex);
}
