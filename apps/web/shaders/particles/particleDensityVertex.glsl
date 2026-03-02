uniform sampler2D texturePosition;

attribute vec2 reference;

varying float vWeight;

void main() {
    vec4 posData = texture2D(texturePosition, reference);
    float lifetime = posData.w;

    if (lifetime <= 0.0) {
        gl_Position = vec4(0.0, 0.0, -1000.0, 1.0);
        gl_PointSize = 0.0;
        vWeight = 0.0;
        return;
    }

    vec4 mv = modelViewMatrix * vec4(posData.xyz, 1.0);
    gl_Position = projectionMatrix * mv;

    gl_PointSize = 1.0;
    vWeight = 0.04;
}
