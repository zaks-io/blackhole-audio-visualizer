uniform float uTime;
uniform sampler2D textureOrbitalElements;
uniform sampler2D textureOrbitalPhase;
uniform float uGravitationalParameter;
uniform float uEventHorizon;
uniform float uIscoRadius;
uniform float uDecayRate;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // Read orbital elements
    vec4 elements = texture2D(textureOrbitalElements, uv);
    vec4 phase = texture2D(textureOrbitalPhase, uv);

    float a = elements.x;      // semi-major axis
    float e = elements.y;      // eccentricity
    float inc = elements.z;    // inclination
    float omega = elements.w;  // argument of periapsis
    float Omega = phase.x;     // longitude of ascending node
    float M0 = phase.y;        // initial mean anomaly

    // Calculate perihelion - closest approach to black hole
    float perihelion = a * (1.0 - e);

    // Mean motion
    float n = sqrt(uGravitationalParameter / (a * a * a));

    // Mean anomaly at current time
    float M = M0 + n * uTime;
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
    float r_kepler = a * (1.0 - e * e) / (1.0 + e * cos(nu));

    float r = r_kepler;

    // If perihelion is inside ISCO, this particle will eventually fall in
    // Calculate time of first perihelion passage (when nu = 0, M = 0)
    // From M0, time to reach M=0 is: if M0 > PI then (2PI - M0)/n, else -M0/n...
    // Simplified: first perihelion at t = -M0/n (mod period)
    if (perihelion < uIscoRadius) {
        float period = 6.28318530718 / n;

        // Time of first perihelion passage
        float firstPerihelion = M0 > 3.14159 ? (6.28318530718 - M0) / n : -M0 / n;
        if (firstPerihelion < 0.0) firstPerihelion += period;

        // After first perihelion, start decaying
        if (uTime > firstPerihelion) {
            float timeSinceCapture = uTime - firstPerihelion;

            // Decay from perihelion toward event horizon
            float decay = exp(-timeSinceCapture * uDecayRate);

            // Spiral from perihelion to event horizon
            r = uEventHorizon + (perihelion - uEventHorizon) * decay;

            // Speed up rotation as it falls in
            float speedup = perihelion / max(r, uEventHorizon + 0.01);
            nu = nu + timeSinceCapture * n * speedup;
        }
    }

    // Position in orbital plane
    float x_orb = r * cos(nu);
    float y_orb = r * sin(nu);

    // Rotation matrices for 3D orientation
    float cosOmega = cos(Omega);
    float sinOmega = sin(Omega);
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

    gl_FragColor = vec4(px, pz, py, 1.0);
}
