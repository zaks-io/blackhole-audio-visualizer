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
uniform float uOrbitDecay;
uniform float uLifetimeMax;
uniform bool uDoDrift;
uniform sampler2D uBandOnsetsTexture;
uniform float uBandCount;
uniform float uAudioAmplitude;
uniform float uSpawnBurst;

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

    float r = length(pos);

    if (lifetime < 0.0) {
        // WAITING: count up toward 0
        if (uParticlesPerSecond <= 0.0) {
            // Instant spawn mode
            lifetime = 0.0;
        } else {
            // Rate = particlesPerSecond / totalParticles per second
            lifetime += uDeltaTime * (uParticlesPerSecond / uTotalParticles) * uSpawnBurst;
        }

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

            // Sample this emitter's band onset from texture
            // Texture is 1D (36 x 1), sample at center of texel
            float bandU = (emitterIndex + 0.5) / 36.0;
            float bandOnset = texture2D(uBandOnsetsTexture, vec2(bandU, 0.5)).r;

            // Beat-reactive Y offset - oscillates based on this band's onset
            float audioEnergy = bandOnset * 15.0;
            float oscillation = sin(uTime * 8.0 + emitterIndex * 0.5);
            float y = tiltAmount + audioEnergy * oscillation * uAudioAmplitude;

            // Tiny arc offset to break banding, plus user-controlled spread
            float h1 = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
            float baseArc = (h1 - 0.5) * 0.05; // minimal base to break patterns
            float spawnAngle = angle + baseArc;
            float spawnX = rad * cos(spawnAngle);
            float spawnZ = rad * sin(spawnAngle);
            pos = vec3(spawnX, y, spawnZ);
            lifetime = 1.0;
        }
    } else if (r < uEventHorizon || (uLifetimeMax > 0.0 && lifetime > uLifetimeMax)) {
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

        // Orbit decay scales with age - older particles fall in faster
        if (uOrbitDecay > 0.0) {
            vec3 r_hat = normalize(pos);
            float ageDecay = uOrbitDecay * lifetime;
            pos -= r_hat * ageDecay * uDeltaTime;
        }
    }

    gl_FragColor = vec4(pos, lifetime);
}
