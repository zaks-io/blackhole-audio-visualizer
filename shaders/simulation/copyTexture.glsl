uniform sampler2D tSource;
uniform vec2 resolution;

void main() {
    gl_FragColor = texture2D(tSource, gl_FragCoord.xy / resolution);
}
