uniform float uTime;
uniform float uDeltaTime;
uniform float uGM;
uniform float uSoftening;
uniform float uEventHorizon;
uniform float uEmissionRadius;
uniform float uEmitterCount;

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
        // WAITING: count toward spawn
        lifetime += uDeltaTime;
        if (lifetime >= 0.0) {
            // SPAWN at emitter with time-varying angle jitter
            float angleJitter = (hash(uv + uTime) - 0.5) * 0.15;
            float r = uEmissionRadius;
            pos = vec3(r * cos(angleJitter), 0.0, r * sin(angleJitter));
            lifetime = 1.0;
        }
    } else if (r < uEventHorizon) {
        // HIT CENTER: recycle to emitter queue
        lifetime = -hash(uv + uTime) * 2.0;
    } else {
        // FLYING: update position
        pos = pos + vel * uDeltaTime;
    }

    gl_FragColor = vec4(pos, lifetime);
}
