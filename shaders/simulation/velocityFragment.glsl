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

        // Generate random values with different seeds
        float rand1 = hash2(uv, 1.0);
        float rand2 = hash2(uv, 2.0);
        float rand3 = hash2(uv, 3.0);
        float rand4 = hash2(uv, 4.0);

        // All jitter now scales with uEmitterSpread - when spread is 0, no jitter
        float baseAngleJitter = (hash2(uv, uTime) - 0.5) * 0.1 * uEmitterSpread;
        float baseElevJitter = (hash2(uv, uTime + 100.0) - 0.5) * 0.05 * uEmitterSpread;
        float baseSpeedJitter = (hash2(uv, uTime + 200.0) - 0.5) * 0.2 * uEmitterSpread;

        // Horizontal jitter - vary launch angle in orbital plane
        float angleJitter = baseAngleJitter + (rand1 - 0.5) * uEmitterSpread;
        vec3 jitteredTangent = tangent * cos(angleJitter) + r_hat * sin(angleJitter);

        // Elevation jitter - vary launch angle up/down from orbital plane
        float elevationJitter = baseElevJitter + (rand2 - 0.5) * uEmitterSpread * 0.5;
        vec3 direction = normalize(jitteredTangent * cos(elevationJitter) + up * sin(elevationJitter));

        // Mix with inward based on uInwardAngle
        vec3 inward = -r_hat;
        direction = normalize(mix(direction, inward, uInwardAngle));

        vel = direction * orbitalSpeed;

        // Speed jitter - also fully controlled by spread
        vel *= (1.0 + baseSpeedJitter + (rand3 - 0.5) * uEmitterSpread * 0.3);

        // Radial velocity jitter - scales with spread
        float radialJitter = (rand4 - 0.5) * orbitalSpeed * uEmitterSpread * 0.4;
        vel += r_hat * radialJitter;

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

        // Multi-body: Use Roche lobe physics
        // Single body: Use ISCO physics
        if (uBlackHoleCount > 1 && uISCOStrength > 0.0) {
            // Roche lobe physics for binary/multi-body systems
            // Calculate gravitational potential from first two black holes
            float dist1 = length(pos - uBlackHolePos[0]) + uSoftening;
            float dist2 = length(pos - uBlackHolePos[1]) + uSoftening;
            float potential1 = uBlackHoleMass[0] / dist1;
            float potential2 = uBlackHoleMass[1] / dist2;

            // Potential ratio determines which lobe the particle is in
            // ratio > 0.5 = in BH1's lobe, ratio < 0.5 = in BH2's lobe
            float potentialRatio = potential1 / (potential1 + potential2);

            // l1Proximity: 1.0 at L1 point (potentialRatio = 0.5), 0.0 deep in lobes
            float l1Proximity = 1.0 - abs(potentialRatio - 0.5) * 2.0;

            // Only apply drift when deep in a lobe (l1Proximity < 0.3)
            // Near L1: let gravity create chaotic dynamics
            if (l1Proximity < 0.3) {
                // Determine dominant black hole
                vec3 toBH = potentialRatio > 0.5
                    ? normalize(uBlackHolePos[0] - pos)
                    : normalize(uBlackHolePos[1] - pos);

                // Gentle inward drift (much gentler than ISCO)
                float driftStrength = (0.3 - l1Proximity) / 0.3; // 0 at edge, 1 at lobe center
                vel += toBH * driftStrength * uISCOStrength * 0.5 * uDeltaTime;
            }
        } else if (uBlackHoleCount == 1 && uISCOStrength > 0.0) {
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
