# Particle physics

The simulation uses softened Newtonian gravity in scene units, with artistic
controls for audio response and accretion. It does not integrate relativistic
geodesics or solve a fluid disk. The source positions are animated by
`BlackHoleSimulation`; particles do not exert forces on the sources or each other.

## Integration and accuracy

[`ParticleSimulation`](../apps/web/lib/gpu/ParticleSimulation.ts) explicitly
executes a half velocity kick, a full position drift, and a second half kick at
the new position. This uses Three.js's documented
[`doRenderTarget`](https://threejs.org/docs/pages/GPUComputationRenderer.html)
API. `GPUComputationRenderer.compute()` reads all dependencies from the same old
state, so combining the drift and second kick in one call does not implement
velocity Verlet.

For a source with gravitational parameter `GM`, softening `s`, and distance `r`,
the gravity magnitude is `GM / (r + s)^2`. The corresponding potential is
`-GM / (r + s)`, and circular speed is `sqrt(GM * r) / (r + s)`. Launch speed
also accounts for the artistic gravity multiplier. See the
[velocity shader](../apps/web/shaders/simulation/velocityFragment.glsl).

The simulation clock advances by the magnitude of the time actually integrated. Wall-clock stalls
are capped before applying the selected time scale. Steps are at most 0.05 scene
seconds, with at most 0.2 scene seconds per rendered frame. At extreme speed
settings or low frame rates, this budget deliberately slows simulation time.
It is a bounded visual simulation, not an adaptive precision integrator.

Negative beat modulation reverses trajectory integration. Particle aging,
emission, and dissipative damping continue forward, so reversing a beat does
not turn drag into an unstable energy source or attempt to resurrect absorbed
particles.

The source/audio callback runs before the particle callback using React Three
Fiber's documented [negative frame priority](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/hooks.mdx#negative-indices).
The particle callback uploads the current controls, advances physics, and then
binds the new textures for rendering. Forces and audio no longer lag one frame.

For conservative orbit checks, disable orbit decay, mass contrast, frame
dragging, ISCO capture, audio forces, and lifetime expiration. Spawn jitter
remains intentional; conservation tests start with specified positions and
velocities. The escape-speed limiter remains an artistic constraint and means
this is not a model of arbitrary unbound trajectories.

## Corrections from the review

The pre-review implementation at `3cdd44a` evaluated both kicks at the old
position, doubled the spawn-queue time increment, and treated any almost-stopped
particle as a new spawn. These could produce orbital energy drift, excessive
emission, and artificial relaunches. Spawn detection now follows the transition
from queued to alive, and initialization happens in the same step as emission.

The [position shader](../apps/web/shaders/simulation/positionFragment.glsl)
checks the closest point of a swept segment against each absorption sphere. This
handles complete crossings and particles starting inside a sphere without
ray normalization or square roots. Position dither scales with integrated time
and orbit decay, so it cannot move a paused or conservative simulation.

Tangential drag and frame rotation use half-step durations. Capture damping
scales with step duration, calibrated to the previous 0.05-second step. The
frequency-based gravity multiplier, inward capture, and co-rotation remain
artistic effects. Their labels do not establish physical particle mass,
Schwarzschild ISCO dynamics, Kerr frame dragging, or Roche geometry.

## GPU work and trails

The old frame used four simulation passes and two history-copy passes. The new
integrator uses three passes per substep and rotates render targets to preserve
frame history without copying. One substep therefore uses three passes; two use
six. The corrected time scale can require multiple substeps, so these counts
are not an FPS benchmark.

History keeps three previous rendered frames even when a frame contains several
substeps. This needs one extra position target compared with the old history
path: 1 MiB at the default 256-square RGBA32F resolution, or 4 MiB at 512-square.
History-disabled mode retains
only the compute ping-pong targets.

The [trail shader](../apps/web/shaders/particles/particleVertex.glsl) rejects
queued particles before reading velocity and history textures. Lifetime markers
identify recycled history, allowing valid trajectories to cross the world
origin without collapsing their trails.

## Validation

Run `bun run test:physics` after `bunx playwright install chromium`. The suite
executes the actual GLSL through WebGL2 and reads floating-point results back
from the render targets. It also checks draw counts and frame-history ordering.

At `GM=100000`, radius 20, softening 0.5, and a maximum step of 0.05, the
three-orbit test measured maximum relative energy drift of approximately 0.019%
and angular-momentum drift below 0.0001%. Artistic forces were disabled for this
measurement. This is a conservation check for that orbit, not an accuracy bound
for every preset or a GPU timing benchmark.
