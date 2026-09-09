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
uniform float uMassContrast;
uniform float uMassRange;
uniform float uVelocityContrast;
uniform float uVelocityRange;
uniform sampler2D texturePreviousPosition;

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

vec3 safeNormalize(vec3 value, vec3 fallbackAxis) {
    float lengthSquared = dot(value, value);
    if (lengthSquared > 1e-12) {
        return value * inversesqrt(lengthSquared);
    }
    return fallbackAxis;
}

vec3 tangentForRadial(vec3 radial) {
    vec3 referenceAxis = abs(radial.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    return safeNormalize(cross(radial, referenceAxis), vec3(0.0, 0.0, 1.0));
}

float getLifetimeDecayProgress(float lifetime) {
    if (uLifetimeMax <= 0.0 || uLifetimeMax <= uLifetimeGracePeriod) {
        return 0.0;
    }
    return smoothstep(uLifetimeGracePeriod, uLifetimeMax, lifetime);
}

// Per-particle mass derived from frequency band (bass=heavy, treble=light)
float getParticleMass(vec2 ip) {
    float emitterIndex = floor(hash2(ip, 100.0) * uEmitterCount);
    float freqIndex = emitterIndex / uEmitterCount;
    float rawMass = mix(uMassRange, 1.0, freqIndex);
    return mix(1.0, rawMass, uMassContrast);
}

// Per-particle initial velocity scale (treble=fast, bass=1.0)
float getParticleVelocityScale(vec2 ip) {
    float emitterIndex = floor(hash2(ip, 100.0) * uEmitterCount);
    float freqIndex = emitterIndex / uEmitterCount;
    float rawScale = mix(1.0, uVelocityRange, freqIndex);
    return mix(1.0, rawScale, uVelocityContrast);
}

// Always-on launch decorrelation (independent of uEmitterSpread).
// Kept modest to preserve the overall spoke aesthetic while breaking phase-locked streak banding.
const float BASE_LAUNCH_ANGLE_JITTER = 0.04;   // radians
const float BASE_LAUNCH_ELEV_JITTER  = 0.02;   // radians
const float BASE_LAUNCH_SPEED_JITTER = 0.06;   // multiplier range ~ +/-3%
const float BASE_LAUNCH_RADIAL_JITTER = 0.03;  // multiplier of orbitalSpeed
// Always-on baseline noise to prevent identical particle streams (independent of spread)
const float BASE_VEL_ANGLE_NOISE = 0.05;
const float BASE_VEL_ELEV_NOISE  = 0.03;
const float BASE_VEL_SPEED_NOISE = 0.04;
// Always-on micro-turbulence applied during KICK (affects all alive particles, not just spawns).
// This is intentionally very small; it should break persistent banding without destroying the spoke aesthetic.
const float BASE_KICK_TURBULENCE = 0.35; // acceleration-ish magnitude (scaled by dt)

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 ip = gl_FragCoord.xy; // integer texel coords (as floats) for PRNG seeding

    vec4 posData = texture2D(texturePosition, uv);
    vec4 previousPosData = texture2D(texturePreviousPosition, uv);
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
    } else if (previousPosData.w <= 0.0) {
        // JUST SPAWNED: set orbital velocity with inward angle
        // Find nearest black hole for orbital velocity calculation
        vec3 nearestPos = uBlackHolePos[0];
        float nearestMass = uBlackHoleMass[0];
        float nearestDist = length(pos - nearestPos);
        for (int i = 1; i < MAX_BLACK_HOLES; i++) {
            if (i >= uBlackHoleCount) break;
            float dist = length(pos - uBlackHolePos[i]);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPos = uBlackHolePos[i];
                nearestMass = uBlackHoleMass[i];
            }
        }

        vec3 toCenter = pos - nearestPos;
        float r_soft = nearestDist + uSoftening;
        float particleMass = getParticleMass(ip);
        float orbitDecayFactor = clamp(uOrbitDecay / 5.0, 0.0, 1.0);
        float decayProgress = getLifetimeDecayProgress(lifetime);
        float gravityMultiplier = (1.0 + (uLifetimeGravityMultiplier - 1.0) * decayProgress * orbitDecayFactor) * particleMass;
        float orbitalSpeed = 0.0;
        if (r_soft > 0.0) {
            orbitalSpeed = sqrt(nearestMass * gravityMultiplier * nearestDist) / r_soft;
        }

        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 r_hat = safeNormalize(toCenter, vec3(1.0, 0.0, 0.0));
        vec3 tangent = tangentForRadial(r_hat);

        // Emitter index (matches position shader) so our time seeding is lane-aware
        float emitterIndex = floor(hash2(ip, 100.0) * uEmitterCount);
        float timeSeed = uTime * 19.0 + emitterIndex * 7.0;

        // Generate random values with different seeds
        float rand1 = hash2(ip, 1.0);
        float rand2 = hash2(ip, 2.0);
        float rand3 = hash2(ip, 3.0);
        float rand4 = hash2(ip, 4.0);

        // Baseline noise (always-on, prevents identical streams)
        float baseAngleNoise = (hash2(ip, uTime) - 0.5) * BASE_VEL_ANGLE_NOISE;
        float baseElevNoise = (hash2(ip, uTime + 100.0) - 0.5) * BASE_VEL_ELEV_NOISE;
        float baseSpeedNoise = (hash2(ip, uTime + 200.0) - 0.5) * BASE_VEL_SPEED_NOISE;

        // Micro-jitter scales with orbital decay - when decay is 0, no jitter for stable orbits
        float jitterScale = clamp(uOrbitDecay / 5.0, 0.0, 1.0);
        float microAngleJitter = (hash2(ip, 10000.0 + timeSeed) - 0.5) * BASE_LAUNCH_ANGLE_JITTER * jitterScale;
        float microElevJitter  = (hash2(ip, 11000.0 + timeSeed) - 0.5) * BASE_LAUNCH_ELEV_JITTER * jitterScale;
        float microSpeedJitter = (hash2(ip, 12000.0 + timeSeed) - 0.5) * BASE_LAUNCH_SPEED_JITTER * jitterScale;
        float microRadialJitter = (hash2(ip, 13000.0 + timeSeed) - 0.5) * BASE_LAUNCH_RADIAL_JITTER * jitterScale;

        // Horizontal jitter - cone angle in orbital plane (spread controls width)
        float angleJitter = (rand1 - 0.5) * uEmitterSpread * 3.14159 + baseAngleNoise + microAngleJitter;
        vec3 jitteredTangent = tangent * cos(angleJitter) + r_hat * sin(angleJitter);

        // Elevation jitter - cone angle up/down from orbital plane
        float elevationJitter = (rand2 - 0.5) * uEmitterSpread * 1.5708 + baseElevNoise + microElevJitter;
        vec3 direction = safeNormalize(jitteredTangent * cos(elevationJitter) + up * sin(elevationJitter), tangent);

        // Mix with inward based on uInwardAngle
        vec3 inward = -r_hat;
        direction = safeNormalize(mix(direction, inward, uInwardAngle), inward);

        vel = direction * orbitalSpeed * getParticleVelocityScale(ip);

        // Speed jitter - baseline noise only (no spread scaling)
        vel *= (1.0 + baseSpeedNoise + microSpeedJitter);

        // Radial velocity jitter - micro only
        vel += r_hat * (microRadialJitter * orbitalSpeed);

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
        vec3 initialOffset = pos - uBlackHolePos[0];
        float nearestDist = length(initialOffset);
        vec3 nearestDir = safeNormalize(initialOffset, vec3(1.0, 0.0, 0.0));

        // Track potential dominance in the gravity pass for multi-source capture.
        int dominantIdx = 0;
        float maxPotential = 0.0;
        float secondMaxPotential = 0.0;
        float dominantDist = nearestDist;
        vec3 dominantToDir = -nearestDir;

        // Per-particle mass from frequency band
        float pMass = getParticleMass(ip);

        // Lifetime decay: particles get heavier after grace period
        // Scale by orbital decay - when decay is 0, no gravity boost for stable orbits
        float decayProgress = getLifetimeDecayProgress(lifetime);
        float orbitDecayFactor = clamp(uOrbitDecay / 5.0, 0.0, 1.0);
        float gravityMultiplier = (1.0 + (uLifetimeGravityMultiplier - 1.0) * decayProgress * orbitDecayFactor) * pMass;

        for (int i = 0; i < MAX_BLACK_HOLES; i++) {
            if (i >= uBlackHoleCount) break;

            vec3 toSource = uBlackHolePos[i] - pos;
            float dist = length(toSource);
            float dist_soft = dist + uSoftening;
            vec3 toSourceDir = safeNormalize(toSource, vec3(1.0, 0.0, 0.0));

            // Track nearest even when this particle is at the source singularity.
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
                nearestDir = -toSourceDir;
            }
            if (dist_soft <= 0.0) {
                continue;
            }

            // Sum gravity from all sources (with lifetime decay multiplier)
            float accel = uBlackHoleMass[i] / (dist_soft * dist_soft) * gravityMultiplier;
            totalAccel += toSourceDir * accel;

            // Sum potential for escape velocity and retain the two largest contributions.
            float potential = uBlackHoleMass[i] / dist_soft;
            totalPotential += potential;
            if (potential > maxPotential) {
                secondMaxPotential = maxPotential;
                maxPotential = potential;
                dominantIdx = i;
                dominantDist = dist;
                dominantToDir = toSourceDir;
            } else if (potential > secondMaxPotential) {
                secondMaxPotential = potential;
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
        vec3 nDir = safeNormalize(n, tangentForRadial(nearestDir));
        vec3 velocityDir = safeNormalize(vel, nearestDir);
        vec3 tangentNoise = safeNormalize(cross(nDir, velocityDir), tangentForRadial(velocityDir));
        vel += tangentNoise * (BASE_KICK_TURBULENCE * uDeltaTime * 0.5 * orbitDecayFactor);

        // Beat-reactive repulsion from nearest black hole
        if (uBeatRepulsion > 0.0 && uBeatIntensity > 0.0 && nearestDist > 0.1) {
            float nearestAccel = uBlackHoleMass[nearestIdx] / ((nearestDist + uSoftening) * (nearestDist + uSoftening));
            float repulsionAccel = uBeatIntensity * (uBeatRepulsion / 100.0) * nearestAccel / pMass;
            vel += nearestDir * repulsionAccel * uDeltaTime * 0.5;
        }

        // Orbital decay: reduce tangential velocity (angular momentum loss)
        // This creates natural spiral motion instead of radial spokes
        float nearestRadius = uBlackHoleRadius[nearestIdx];
        if (uOrbitDecay > 0.0 && nearestDist > nearestRadius) {
            float radialVel = dot(vel, nearestDir);
            vec3 tangentialVel = vel - nearestDir * radialVel;

            // Exponential decay makes the half kick independent of frame subdivision.
            float decayRate = uOrbitDecay * 0.05 * pMass;
            tangentialVel *= exp(-decayRate * abs(uDeltaTime) * 0.5);

            vel = nearestDir * radialVel + tangentialVel;
        }

        // Combined escape velocity cap from total gravitational potential
        // Scale by velocity factor so faster-spawned treble particles aren't immediately clamped
        float escapeVel = sqrt(2.0 * totalPotential);
        float maxVel = escapeVel * (1.0 - uISCOStrength * 0.5) * getParticleVelocityScale(ip);
        float currentSpeed = length(vel);
        if (currentSpeed > maxVel) {
            vel *= maxVel / currentSpeed;
        }

        // Multi-source potential-weighted capture
        if (uBlackHoleCount > 1 && uISCOStrength > 0.0) {
            // Dominance ratio: how much stronger is dominant vs next strongest
            // High ratio means one source controls the local motion.
            float dominanceRatio = maxPotential / (secondMaxPotential + 0.001);

            float dominanceDepth = 1.0 - 1.0 / (0.5 + dominanceRatio * 0.5);
            dominanceDepth = clamp(dominanceDepth, 0.0, 1.0);

            // Distance/direction retained from the gravity accumulation pass
            float distToDominant = dominantDist;
            vec3 toDominant = dominantToDir;
            vec3 fromDominant = -toDominant;

            // Per-BH ISCO radius scales with mass
            float massRatio = uBlackHoleMass[dominantIdx] / (totalPotential * distToDominant + 0.001);
            float bhISCORadius = uISCORadius * sqrt(massRatio) * 0.5 + uISCORadius * 0.5;

            float dominanceThreshold = 0.3;
            float bhEventHorizon = uBlackHoleRadius[dominantIdx];

            if (dominanceDepth > dominanceThreshold && distToDominant < bhISCORadius && distToDominant > bhEventHorizon) {
                // Artist-controlled inner capture zone

                float iscoDepth = 1.0 - (distToDominant - bhEventHorizon) / (bhISCORadius - bhEventHorizon);
                iscoDepth = clamp(iscoDepth, 0.0, 1.0);

                // Scale effect by potential dominance and distance into the capture zone.
                float captureStrength = iscoDepth * (dominanceDepth - dominanceThreshold) / (1.0 - dominanceThreshold);
                captureStrength = clamp(captureStrength, 0.0, 1.0);

                float orbitalSpeed = sqrt(uBlackHoleMass[dominantIdx] / (distToDominant + uSoftening));

                // Decompose velocity relative to dominant BH
                float radialVel = dot(vel, fromDominant);
                vec3 tangentialVel = vel - fromDominant * radialVel;

                // Progressive tangential decay (angular momentum loss) - keep 20% for spiral
                float tangentialDecay = captureStrength * uISCOStrength * 0.8;
                tangentialVel *= pow(max(1.0 - tangentialDecay, 0.0), abs(uDeltaTime) / 0.05);

                // Force inward spiral
                float targetRadialVel = -orbitalSpeed * captureStrength * uISCOStrength;
                radialVel = min(radialVel, targetRadialVel);

                vel = fromDominant * radialVel + tangentialVel;
            }
            else if (dominanceDepth > dominanceThreshold) {
                // Inward drift where one source dominates outside the capture zone
                float driftStrength = (dominanceDepth - dominanceThreshold) / (1.0 - dominanceThreshold);
                driftStrength *= uISCOStrength * 2.0 * orbitDecayFactor;
                vel += toDominant * driftStrength * uDeltaTime * 0.5;
            }
            // Limit speed where the two strongest source potentials are balanced.
            float balancedPotential = max(0.0, 1.0 - dominanceDepth / dominanceThreshold);

            if (balancedPotential > 0.0) {
                float balanceRadius = uEmissionRadius + uSoftening;
                if (balanceRadius > 0.0) {
                    float avgMass = totalPotential * balanceRadius;
                    float maxBalancedSpeed = sqrt(avgMass / balanceRadius) * 0.5;
                    float speed = length(vel);
                    if (speed > maxBalancedSpeed) {
                        vel *= maxBalancedSpeed / speed;
                    }
                }
            }
        }
        else if (uBlackHoleCount == 1 && uISCOStrength > 0.0) {
            // Single-source artist-controlled inner capture
            float singleBHRadius = uBlackHoleRadius[0];
            if (nearestDist < uISCORadius && nearestDist > singleBHRadius) {
                float iscoDepth = 1.0 - (nearestDist - singleBHRadius) / (uISCORadius - singleBHRadius);
                iscoDepth = clamp(iscoDepth, 0.0, 1.0);

                float orbitalSpeed = sqrt(uBlackHoleMass[0] / (nearestDist + uSoftening));

                // Decompose velocity relative to black hole
                float radialVel = dot(vel, nearestDir);
                vec3 tangentialVel = vel - nearestDir * radialVel;

                float tangentialDecay = iscoDepth * uISCOStrength;
                tangentialVel *= pow(max(1.0 - tangentialDecay, 0.0), abs(uDeltaTime) / 0.05);

                // Force inward
                radialVel = min(radialVel, -orbitalSpeed * iscoDepth * uISCOStrength);

                vel = nearestDir * radialVel + tangentialVel;
            }
        }

        // Artist-controlled frame rotation, applied last.
        // Blends tangential velocity toward the local co-rotation speed rather
        // than accumulating acceleration. It only speeds up particles that are
        // slower than the configured co-rotation target.
        if (uFrameDragging > 0.0) {
            vec3 spinAxis = vec3(0.0, 1.0, 0.0);
            for (int i = 0; i < MAX_BLACK_HOLES; i++) {
                if (i >= uBlackHoleCount) break;

                vec3 toSource = uBlackHolePos[i] - pos;
                float dist = length(toSource);
                float dist_soft = dist + uSoftening;
                float r_horizon = uBlackHoleRadius[i];
                if (dist_soft <= 0.0) continue;

                vec3 r_perp = toSource - spinAxis * dot(toSource, spinAxis);
                float r_perp_len = length(r_perp);
                if (r_perp_len > 0.1) {
                    vec3 dragDir = normalize(cross(spinAxis, r_perp));

                    // Target: co-rotate at orbital speed scaled by frame drag parameter
                    float orbitalSpeed = sqrt(uBlackHoleMass[i] / dist_soft);
                    float targetSpeed = orbitalSpeed * uFrameDragging;

                    // Blend rate: how quickly to converge (scales with M/r²)
                    float blendRate = uFrameDragging * uBlackHoleMass[i] / (dist_soft * dist_soft) * 0.001;

                    // Inner boost zone near the absorption radius
                    float boostRadius = r_horizon * 1.5;
                    if (dist < boostRadius) {
                        float boostDepth = 1.0 - (dist - r_horizon) / (boostRadius - r_horizon);
                        boostDepth = clamp(boostDepth, 0.0, 1.0);
                        blendRate = max(blendRate, boostDepth * boostDepth * 30.0);
                        targetSpeed = max(targetSpeed, orbitalSpeed * boostDepth);
                    }

                    // Inside ISCO: reduce co-rotation target so particles plunge.
                    // Applied after the inner boost so the capture behavior wins.
                    if (dist < uISCORadius && dist > r_horizon) {
                        float iscoDepth = 1.0 - (dist - r_horizon) / (uISCORadius - r_horizon);
                        iscoDepth = clamp(iscoDepth, 0.0, 1.0);
                        targetSpeed *= (1.0 - iscoDepth);
                    }

                    float blend = 1.0 - exp(-blendRate * abs(uDeltaTime) * 0.5);

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
