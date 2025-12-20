uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float uPointSize;

attribute vec2 reference;

varying float vDistance;
varying vec3 vPosition;
varying float vColorIndex;

void main() {
    vec4 posData = texture2D(texturePosition, reference);
    vec4 velData = texture2D(textureVelocity, reference);

    vec3 pos = posData.xyz;
    float lifetime = posData.w;
    float colorIndex = velData.w;

    vPosition = pos;
    vDistance = length(pos);
    vColorIndex = colorIndex;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Hide particles that haven't spawned yet (negative lifetime)
    if (lifetime < 0.0) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
        gl_PointSize = 0.0;
        return;
    }

    // Size attenuation based on distance from camera
    gl_PointSize = uPointSize * (300.0 / -mvPosition.z);

    // Clamp minimum and maximum size
    gl_PointSize = clamp(gl_PointSize, 2.0, 64.0);
}
