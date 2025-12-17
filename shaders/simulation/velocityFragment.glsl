uniform float uTime;
uniform float uDeltaTime;
uniform float uGM;
uniform float uSoftening;
uniform float uEventHorizon;
uniform float uEmissionRadius;
uniform float uEmitterCount;
uniform float uInwardAngle;
uniform bool uDoKick;

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
        // JUST SPAWNED: set orbital velocity with inward angle
        float r_len = length(pos);
        float r_soft = r_len + uSoftening;
        float orbitalSpeed = sqrt(uGM / r_soft);

        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 r_hat = normalize(pos);
        vec3 tangent = normalize(cross(up, r_hat));

        // Mix tangent and inward based on uInwardAngle
        vec3 inward = -r_hat;
        vec3 direction = normalize(mix(tangent, inward, uInwardAngle));

        vel = direction * orbitalSpeed;

        // Small Y variation for 3D depth
        float randomY = (hash(uv) - 0.5) * orbitalSpeed * 0.1;
        vel.y += randomY;
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
        }
    }

    gl_FragColor = vec4(vel, 1.0);
}
