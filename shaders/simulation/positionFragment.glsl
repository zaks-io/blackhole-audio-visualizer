uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D textureOrbitalElements;
uniform sampler2D textureOrbitalPhase;
uniform float uGravitationalParameter;
uniform float uEventHorizon;
uniform float uDecayRate;
uniform float uEmissionRadius;
uniform float uSpawnDuration;
uniform float uEmitterCount;
uniform float uEccentricity;
uniform float uInclination;
uniform float uOmega;
uniform float uTurbulenceStrength;

// Hash function for deterministic randomization
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // Read previous position (w stores current semi-major axis)
    vec4 prevPos = texture2D(texturePosition, uv);
    float currentA = prevPos.w;

    // Read phase for spawn delay
    vec4 phase = texture2D(textureOrbitalPhase, uv);
    float spawnDelay = phase.z;

    // Each particle is permanently assigned to one emitter based on UV
    float emitterIndex = floor(hash(uv) * uEmitterCount);
    float emitterAngle = emitterIndex * (6.28318530718 / uEmitterCount);
    float particleAngle = emitterAngle;

    // Orbital parameters from controls
    float e = uEccentricity;
    float inc = uInclination;
    float omega = uOmega;

    // Check if particle should spawn yet (staggered initial spawn)
    if (uTime < spawnDelay * uSpawnDuration) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, uEmissionRadius);
        return;
    }

    // Check if we need to respawn (hit event horizon)
    float prevR = length(prevPos.xyz);
    bool isFirstSpawn = prevR < 0.01;
    bool hitEventHorizon = prevR < uEventHorizon * 1.2 || currentA < uEventHorizon * 1.5;

    float a;

    if (isFirstSpawn || hitEventHorizon) {
        // First spawn or hit event horizon - immediately respawn at emission radius
        a = uEmissionRadius;
    } else {
        // Normal: decay semi-major axis (spiral inward)
        // Wide per-particle variation to spread out particle deaths
        float decayVariation = 0.3 + hash(uv + vec2(2.0, 0.0)) * 1.4;
        a = currentA - uDecayRate * uDeltaTime * decayVariation;
        a = max(a, uEventHorizon * 0.5);
    }

    // Mean motion (faster as we spiral in)
    float n = sqrt(uGravitationalParameter / (a * a * a));

    // Mean anomaly at current time - use fixed particle angle as base
    float M = particleAngle + n * uTime;
    M = mod(M, 6.28318530718);

    // Solve Kepler's equation
    float E = M;
    for(int i = 0; i < 4; i++) {
        E = E - (E - e * sin(E) - M) / (1.0 - e * cos(E));
    }

    // True anomaly
    float cosE = cos(E);
    float sinE = sin(E);
    float cosNu = (cosE - e) / (1.0 - e * cosE);
    float sinNu = sqrt(1.0 - e * e) * sinE / (1.0 - e * cosE);
    float nu = atan(sinNu, cosNu);

    // Keplerian radius
    float r = a * (1.0 - e * e) / (1.0 + e * cos(nu));

    // Position in orbital plane
    float x_orb = r * cos(nu);
    float y_orb = r * sin(nu);

    // Rotation matrices for 3D orientation
    // Use particle's fixed angle for orbital plane orientation
    float cosOmega = cos(particleAngle);
    float sinOmega = sin(particleAngle);
    float cosInc = cos(inc);
    float sinInc = sin(inc);
    float cosOmegaSmall = cos(omega);
    float sinOmegaSmall = sin(omega);

    // Transform to 3D space
    float px = (cosOmega * cosOmegaSmall - sinOmega * sinOmegaSmall * cosInc) * x_orb
             + (-cosOmega * sinOmegaSmall - sinOmega * cosOmegaSmall * cosInc) * y_orb;
    float py = (sinOmega * cosOmegaSmall + cosOmega * sinOmegaSmall * cosInc) * x_orb
             + (-sinOmega * sinOmegaSmall + cosOmega * cosOmegaSmall * cosInc) * y_orb;
    float pz = (sinOmegaSmall * sinInc) * x_orb + (cosOmegaSmall * sinInc) * y_orb;

    gl_FragColor = vec4(px, pz, py, a);
}
