#define MAX_BLACK_HOLES 4

uniform float uTime;
uniform float uDeltaTime;
uniform float uGM;
uniform float uSoftening;
uniform float uEventHorizon;
uniform float uEmissionRadius;
uniform float uEmitterCount;
uniform float uEmitterAngle;
uniform float uEmitterTilt;
uniform float uParticlesPerSecond;
uniform float uTotalParticles;
uniform float uLifetimeMax;
uniform float uEmitterSpread;
uniform bool uDoDrift;
uniform sampler2D uBandOnsetsTexture;
uniform float uBandOnsetMax;
uniform float uBandCount;
uniform sampler2D uSpectrumTexture;
uniform float uSpectrumSize;
uniform float uAudioAmplitude;
uniform float uSpawnBurst;

// Multi-black hole uniforms
uniform vec3 uBlackHolePos[MAX_BLACK_HOLES];
uniform float uBlackHoleMass[MAX_BLACK_HOLES];
uniform float uBlackHoleRadius[MAX_BLACK_HOLES];
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

// Always-on spawn decorrelation (independent of uEmitterSpread).
// Keep these small so we preserve "spokes" while breaking phase-locked banding.
const float BASE_SPAWN_ANGLE_JITTER = 0.035; // ~2 degrees
const float BASE_SPAWN_RADIAL_JITTER = 0.01; // 1% of uEmissionRadius

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec4 posData = texture2D(texturePosition, uv);
    vec4 velData = texture2D(textureVelocity, uv);

    vec3 pos = posData.xyz;
    float lifetime = posData.w;
    vec3 vel = velData.xyz;

    if (lifetime <= 0.0) {
        // PASS 1: keep queued particles unchanged to avoid bunching spawns into the same frame.
        // PASS 2 (drift pass): advance the spawn queue with a doubled dt to preserve overall spawn rate.
        if (!uDoDrift) {
            gl_FragColor = vec4(pos, lifetime);
            return;
        }

        // WAITING: count up toward 0
        float dt = uDeltaTime * 2.0;
        // Rate = particlesPerSecond / totalParticles per second
        lifetime += dt * (uParticlesPerSecond / uTotalParticles) * uSpawnBurst;

        if (lifetime >= 0.0) {
            // Pick which emitter this particle spawns from
            float emitterIndex = floor(hash2(uv, 100.0) * uEmitterCount);
            float baseAngle = emitterIndex * 6.28318530718 / uEmitterCount;

            float angle = baseAngle + uEmitterAngle;

            // Calculate emit position - single point, no offset
            float rad = uEmissionRadius;
            float x = rad * cos(angle);
            float z = rad * sin(angle);
            float tiltAmount = sin(angle) * uEmitterTilt;

            // Map emitter to frequency band (emitter 0 = low freq, emitter N = high freq)
            float freqIndex = emitterIndex / uEmitterCount;
            float spectrumU = (freqIndex * (uSpectrumSize - 1.0) + 0.5) / uSpectrumSize;
            float spectrumValue = texture2D(uSpectrumTexture, vec2(spectrumU, 0.5)).r;

            // Beat-reactive Y offset - oscillates up and down based on frequency energy
            float audioEnergy = spectrumValue * 15.0;
            float oscillation = -sin(uTime * 8.0 + emitterIndex * 0.5);
            float y = tiltAmount + audioEnergy * oscillation * uAudioAmplitude;

            // Always-on temporal + spatial de-correlation:
            // - time-varying per-particle angle jitter breaks phase-locked lanes
            // - uEmitterSpread remains an extra user-controlled intensifier
            float timeSeed = uTime * 17.0 + emitterIndex * 13.0;
            float hJitter = hash2(uv, 1000.0 + timeSeed);
            float baseAngleJitter = (hJitter - 0.5) * BASE_SPAWN_ANGLE_JITTER;

            // Small time-varying arc offset (kept modest to preserve spokes)
            float hArc = hash2(uv, 2000.0 + timeSeed);
            float baseArc = (hArc - 0.5) * 0.02;

            // User-controlled spread (time-varying so it doesn't lock)
            float hSpread = hash2(uv, 3000.0 + timeSeed);
            float userSpread = (hSpread - 0.5) * uEmitterSpread * 0.5;

            float spawnAngle = angle + baseArc + baseAngleJitter + userSpread;

            // Subtle radial jitter breaks perfect circular quantization without destroying spoke structure
            float hRad = hash2(uv, 4000.0 + timeSeed);
            float spawnRad = rad + (hRad - 0.5) * (BASE_SPAWN_RADIAL_JITTER * rad);

            float spawnX = spawnRad * cos(spawnAngle);
            float spawnZ = spawnRad * sin(spawnAngle);
            pos = vec3(spawnX, y, spawnZ);
            lifetime = 1.0;
        }
    } else if (!uDoDrift) {
        // PASS 1 (no drift): keep alive particles unchanged.
        // Recycling checks are safe to run on the drift pass, since positions only change there.
    } else {
        // DRIFT: compute new position first
        vec3 newPos = pos + vel * uDeltaTime;

        // Check if path intersects ANY black hole (ray-sphere intersection)
        // This prevents fast particles from tunneling through
        bool shouldRecycle = false;
        vec3 rayDir = newPos - pos;
        float rayLen = length(rayDir);

        for (int i = 0; i < MAX_BLACK_HOLES; i++) {
            if (i >= uBlackHoleCount) break;

            // Recycle very close to center (matches fragment shader effectiveRadius=0, fadeStart=2)
            float radius = 0.5;
            if (uBlackHoleRadius[i] <= 0.0) continue;

            // Check if new position is inside (handles slow particles)
            if (length(newPos - uBlackHolePos[i]) < radius) {
                shouldRecycle = true;
                break;
            }

            // Ray-sphere intersection for fast particles
            if (rayLen > 0.001) {
                vec3 d = rayDir / rayLen; // normalized direction
                vec3 oc = pos - uBlackHolePos[i];
                float b = dot(oc, d);
                float c = dot(oc, oc) - radius * radius;
                float discriminant = b * b - c;

                if (discriminant >= 0.0) {
                    // Check entry point
                    float t = -b - sqrt(discriminant);
                    if (t >= 0.0 && t <= rayLen) {
                        shouldRecycle = true;
                        break;
                    }
                    // Check exit point (in case we started inside)
                    t = -b + sqrt(discriminant);
                    if (t >= 0.0 && t <= rayLen) {
                        shouldRecycle = true;
                        break;
                    }
                }
            }
        }

        // Also recycle if max lifetime exceeded
        if (uLifetimeMax > 0.0 && lifetime > uLifetimeMax) {
            shouldRecycle = true;
        }

        if (shouldRecycle) {
            // HIT BLACK HOLE or MAX LIFETIME: recycle to emitter queue
            float recycleRand = hash2(uv, uTime + 500.0);
            if (uParticlesPerSecond <= 0.0) {
                lifetime = 0.0;  // Instant respawn
            } else {
                lifetime = -recycleRand;  // 0 to -1 second queue position
            }
            pos = vec3(0.0, 0.0, 0.0);  // Reset position for recycled particles
        } else {
            // No collision: commit new position
            pos = newPos;
            lifetime += uDeltaTime;
        }
    }

    gl_FragColor = vec4(pos, lifetime);
}
