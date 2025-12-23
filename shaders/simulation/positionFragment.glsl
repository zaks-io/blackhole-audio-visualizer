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

    if (lifetime < 0.0) {
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

            // Y offset based on this particle's frequency bin energy
            // freqIndex 0 (bass) goes down, freqIndex 1 (highs) goes up
            float y = tiltAmount + (freqIndex * 2.0 - 1.0) * spectrumValue * uAudioAmplitude * 15.0;

            // Tiny arc offset to break banding, plus user-controlled spread
            float h1 = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
            float baseArc = (h1 - 0.5) * 0.05; // minimal base to break patterns
            float spawnAngle = angle + baseArc;
            float spawnX = rad * cos(spawnAngle);
            float spawnZ = rad * sin(spawnAngle);
            pos = vec3(spawnX, y, spawnZ);
            lifetime = 1.0;
        }
    } else if (!uDoDrift) {
        // PASS 1 (no drift): keep alive particles unchanged.
        // Recycling checks are safe to run on the drift pass, since positions only change there.
    } else {
        // Check event horizon against ALL black holes
        bool shouldRecycle = false;
        for (int i = 0; i < MAX_BLACK_HOLES; i++) {
            if (i >= uBlackHoleCount) break;
            float dist = length(pos - uBlackHolePos[i]);
            if (dist < uEventHorizon) {
                shouldRecycle = true;
                break;
            }
        }

        // Also recycle if max lifetime exceeded
        if (uLifetimeMax > 0.0 && lifetime > uLifetimeMax) {
            shouldRecycle = true;
        }

        if (shouldRecycle) {
            // HIT CENTER or MAX LIFETIME: recycle to emitter queue
            float recycleRand = hash2(uv, uTime + 500.0);
            if (uParticlesPerSecond <= 0.0) {
                lifetime = 0.0;  // Instant respawn
            } else {
                lifetime = -recycleRand;  // 0 to -1 second queue position
            }
            pos = vec3(0.0, 0.0, 0.0);  // Reset position for recycled particles
        } else if (uDoDrift) {
            // DRIFT: update position using velocity
            pos = pos + vel * uDeltaTime;

            // Age the particle
            lifetime += uDeltaTime;
        }
    }

    gl_FragColor = vec4(pos, lifetime);
}
