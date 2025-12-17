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

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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
        // WAITING: count toward spawn (scaled by spawn rate)
        lifetime += uDeltaTime * uSpawnRate;
        if (lifetime >= 0.0) {
            // Pick which emitter this particle spawns from
            float emitterIndex = floor(hash(uv) * uEmitterCount);
            float baseAngle = emitterIndex * 6.28318530718 / uEmitterCount;

            // Add emitter rotation offset and jitter
            float angleJitter = (hash(uv + uTime) - 0.5) * 0.3;
            float angle = baseAngle + uEmitterAngle + angleJitter;

            // Calculate position with tilt
            float rad = uEmissionRadius;
            float x = rad * cos(angle);
            float z = rad * sin(angle);

            // Apply tilt around the X axis
            float tiltAmount = sin(angle) * uEmitterTilt;
            float y = tiltAmount;

            pos = vec3(x, y, z);
            lifetime = 1.0;
        }
    } else if (r < uEventHorizon) {
        // HIT CENTER: recycle to emitter queue
        // Ensure minimum negative value so particle is hidden while waiting
        lifetime = -(hash(uv + uTime) * 0.9 + 0.1) * (1.0 / max(uSpawnRate, 0.01));
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
