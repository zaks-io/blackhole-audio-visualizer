uniform float uTime;
uniform float uDeltaTime;
uniform float uGM;
uniform float uSoftening;
uniform float uEventHorizon;
uniform float uEmissionRadius;
uniform float uEmitterCount;
uniform float uEmitterAngle;
uniform float uEmitterTilt;
uniform float uSpawnRate;
uniform float uOrbitDecay;
uniform bool uDoDrift;
uniform float uBassOnset;
uniform float uMidOnset;
uniform float uHighOnset;
uniform float uAudioAmplitude;

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
        // WAITING: stochastic spawn - random chance each frame
        float spawnChance = hash2(uv, uTime);
        float threshold = uDeltaTime * uSpawnRate * 0.1;
        if (spawnChance < threshold) {
            lifetime = 0.0; // spawn now
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

            // Beat-reactive Y offset - oscillates around 0
            float audioEnergy = uBassOnset * 20.0 + uMidOnset * 10.0 + uHighOnset * 5.0;
            float oscillation = sin(uTime * 8.0);
            float y = tiltAmount + audioEnergy * oscillation * uAudioAmplitude;

            pos = vec3(x, y, z);
            lifetime = 1.0;
        }
    } else if (r < uEventHorizon) {
        // HIT CENTER: recycle to emitter queue
        float recycleRand = hash2(uv, uTime + 500.0);
        lifetime = -(recycleRand * 0.9 + 0.1) * (1.0 / max(uSpawnRate, 0.01));
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
