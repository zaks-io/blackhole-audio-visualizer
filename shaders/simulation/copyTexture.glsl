uniform sampler2D tSource;
uniform vec2 resolution;

precision highp float;
precision highp sampler2D;

void main() {
    gl_FragColor = texture2D(tSource, gl_FragCoord.xy / resolution);
}
