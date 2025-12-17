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
uniform bool uDoKick;

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
        // WAITING: no velocity
        vel = vec3(0.0);
    } else if (length(vel) < 0.1) {
        // JUST SPAWNED: set orbital velocity with inward angle
        float r_len = length(pos);
        float r_soft = r_len + uSoftening;
        float orbitalSpeed = sqrt(uGM / r_soft);

        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 r_hat = normalize(pos);
        vec3 tangent = normalize(cross(up, r_hat));

        // Generate random values with different seeds
        float rand1 = hash2(uv, 1.0);
        float rand2 = hash2(uv, 2.0);
        float rand3 = hash2(uv, 3.0);
        float rand4 = hash2(uv, 4.0);

        // Base jitter - time-varying to break frame clumping
        float baseAngleJitter = (hash2(uv, uTime) - 0.5) * 0.1;
        float baseElevJitter = (hash2(uv, uTime + 100.0) - 0.5) * 0.05;
        float baseSpeedJitter = (hash2(uv, uTime + 200.0) - 0.5) * 0.2;

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

        // Speed jitter
        vel *= (1.0 + baseSpeedJitter + (rand3 - 0.5) * uEmitterSpread * 0.3);

        // Radial velocity jitter - scales with spread
        float radialJitter = (rand4 - 0.5) * orbitalSpeed * uEmitterSpread * 0.4;
        vel += r_hat * radialJitter;
    } else if (uDoKick) {
        // KICK: Apply gravitational acceleration (half-step)
        float r_len = length(pos);

        if (r_len > 0.1) {
            vec3 r_hat = pos / r_len;
            float r_soft = r_len + uSoftening;

            // Newtonian gravity: a = -GM/r²
            float accel = uGM / (r_soft * r_soft);

            // Half-step kick
            vel -= r_hat * accel * uDeltaTime * 0.5;

            // GLOBAL: Cap velocity below escape velocity so particles can NEVER escape
            // Escape velocity = sqrt(2 * GM / r), we cap at fraction of that
            float escapeVel = sqrt(2.0 * uGM / r_soft);
            float maxVel = escapeVel * (1.0 - uISCOStrength * 0.5);
            float currentSpeed = length(vel);
            if (currentSpeed > maxVel) {
                vel *= maxVel / currentSpeed;
            }
        }

        // ISCO Region: Force spiral inward
        if (r_len < uISCORadius && r_len > uEventHorizon && uISCOStrength > 0.0) {
            float iscoDepth = 1.0 - (r_len - uEventHorizon) / (uISCORadius - uEventHorizon);
            iscoDepth = clamp(iscoDepth, 0.0, 1.0);

            vec3 r_hat_isco = pos / r_len;
            float orbitalSpeed = sqrt(uGM / (r_len + uSoftening));

            // Decompose into radial and tangential
            float radialVel = dot(vel, r_hat_isco);
            vec3 tangentialVel = vel - r_hat_isco * radialVel;

            // Kill tangential velocity progressively
            tangentialVel *= (1.0 - iscoDepth * uISCOStrength);

            // Force inward
            radialVel = min(radialVel, -orbitalSpeed * iscoDepth * uISCOStrength);

            vel = r_hat_isco * radialVel + tangentialVel;
        }
    }

    gl_FragColor = vec4(vel, 1.0);
}
