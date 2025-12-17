uniform float uTime;
uniform float uDeltaTime;
uniform float uGM;
uniform float uSoftening;
uniform float uEventHorizon;
uniform float uEmissionRadius;
uniform float uEmitterCount;
uniform float uDrag;

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
        // WAITING: no velocity
        vel = vec3(0.0);
    } else if (length(vel) < 0.1) {
        // JUST SPAWNED: set orbital velocity tangent to position
        float r_len = length(pos);
        float r_soft = r_len + uSoftening;
        float orbitalSpeed = sqrt(uGM / r_soft);

        // Tangent direction: cross product of up vector and position
        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 r_hat = normalize(pos);
        vec3 tangent = normalize(cross(up, r_hat));

        // Add random Y velocity variation for visual interest
        float randomY = (hash(uv) - 0.5) * orbitalSpeed * 0.3;
        // Slight speed variation too
        float speedVariation = 1.0 + (hash(uv + 0.5) - 0.5) * 0.1;

        vel = tangent * orbitalSpeed * speedVariation + vec3(0.0, randomY, 0.0);
    } else {
        // FLYING: apply gravitational acceleration toward center
        vec3 r_vec = pos;
        float r_len = length(r_vec);

        if (r_len > 0.1) {
            float r_soft = r_len + uSoftening;
            vec3 r_hat = r_vec / r_len;

            // Newtonian gravity: -GM/r^2
            float accelMag = uGM / (r_soft * r_soft);

            // GR correction for inspiral
            float rs = uEventHorizon;
            float grCorrection = 3.0 * uGM * rs * rs / (r_soft * r_soft * r_soft * r_soft);

            vec3 accel = -r_hat * (accelMag + grCorrection);

            // Apply acceleration
            vel = vel + accel * uDeltaTime;

            // Drag scales with 1/r - stronger near center
            float dragScale = 1.0 + 5.0 * rs / r_soft;
            vel = vel * (1.0 - uDrag * dragScale * uDeltaTime);
        }
    }

    gl_FragColor = vec4(vel, 1.0);
}
