uniform sampler2D texturePosition;
uniform float uPointSize;

attribute vec2 reference;

varying float vDistance;
varying vec3 vPosition;

void main() {
    vec4 posData = texture2D(texturePosition, reference);
    vec3 pos = posData.xyz;
    vPosition = pos;
    vDistance = length(pos);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation based on distance from camera
    gl_PointSize = uPointSize * (300.0 / -mvPosition.z);

    // Clamp minimum and maximum size
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
}
