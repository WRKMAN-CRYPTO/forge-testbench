# Elemental VFX Bench / WRKMAN · Experiment 002

**Isolated rendering experiment. No Wandrune sources or gameplay systems are imported or changed.**

Live-test path (when GitHub Pages is enabled for this repository): `/elemental-vfx/`.

## Scope
- Fire: rising embers and turbulent flare.
- Lightning: radial discharges and jittering arcs.
- Ice: outward frost-shard burst.
- Gravity: inward-spiraling debris, procedural singularity core, luminous accretion disk, violet collapse pulse.
- Three renderers: Canvas 2D baseline, PixiJS 8.10.0, Phaser 4.0.0.
- Fixed seed `0x0e1e` and the same per-particle trajectories for all renderers.
- **200 visual particles per cast**. Adjustable simultaneous casts: 1, 2, 4, 6, 10.
- Toggling glow changes presentation only; it does not change particle movement.
- No collisions, damage, targeting, spells, physics, gameplay logic, runes, or mana.

## How to test on an iPhone
1. Start Canvas with Fire and one cast. Capture FPS and p95 after the scene settles.
2. Repeat with Lightning, Ice and Gravity. Increase casts to 2, 4, 6, and 10.
3. Switch PixiJS and Phaser; repeat the same sequence.
4. Use **Copy benchmark report** to export individual readings.
5. Note visual appeal, unexpected glitches, device heat and touch responsiveness separately.

## Measurement limits
- FPS and p95 refer to the browser animation-frame cadence, not GPU timestamps.
- **Main JS** is the JavaScript update/draw call duration; Phaser's own render loop can run separately. Do not interpret this value as comparable GPU render cost across engines.
- The gravity art is a procedural 512-pixel texture, shared between engines; no forces or gameplay collisions are simulated.
- Sprite textures are shared, but glow methods are **not** equivalent: Canvas uses additive texture passes; Pixi attempts its built-in BlurFilter; Phaser uses native additive image sprites with texture glow. This pass evaluates feasibility and appearance, not a scientific identical-shader benchmark.
- CDN access is needed for Phaser and Pixi; Canvas can run offline.
- Browser compatibility and mobile performance remain unverified until tested on a real iPhone. The code passed a JavaScript syntax check.

## Release gate
Do **not** change or connect this experiment to Wandrune without a separate explicit approval after reviewing measured results. Preserve Wandrune logic and all non-rendering behavior.

## Experiment 003: PixiJS 8 visual-quality stress lab

- Page: [PixiJS cinematic stress bench](./pixi-stress.html) (same repository, independent of Wandrune).
- Free-standing renderer-only test with Fire, Lightning, Ice, Gravity.
- Main mode: **Cinematic**, using richer procedural textures, layered glows, animated lightning branches, crystal geometry, and gravity accretion detail.
- Companion mode: Lean, same visual trajectories with reduced ornamental layers.
- Starts at 2,000 animated visual sprites and ramps automatically through 200, 400, 800, 1,600, 2,000, 2,400, 3,200, 4,800, 6,400, 9,600, 12,800, 19,200 and 25,600 visuals (200 per cast).
- Each stage settles for ~650 ms, samples for ~2 seconds, records average FPS, P95 rAF frame time and average JS+render-call duration. Aborts after **two consecutive** failing stages; fail means FPS below 50 or P95 above 25 ms, or insufficient frames. This is a smoothness threshold, not a device crash limit.
- The app offers an on-screen measurement curve and a **Copy results** JSON action for reproducibility.
- Static effects and positions are deterministic per rebuild. This is not a controlled GPU benchmark across different frame rates or thermal conditions.
- The separate previous [Experiment 002 bench](./index.html) remains intact.

**Important:** Vercel project for forge-testbench is linked and deploys from GitHub, but its default deployment protection may require the owner's login. Do not relax security settings merely to share this link.


## Experiment 004: PixiJS Clarity / Composition Lab

Source: [pixi-clarity.html](./pixi-clarity.html)
Production URL: https://forge-testbench.vercel.app/elemental-vfx/pixi-clarity.html

Experiment 003 screenshots revealed that 4,800–6,400 bright fire sprites were visually merging. This experiment tests readability without forbidding spectacular overload.

### Variables
- Element: Fire, Lightning, Ice, Gravity.
- Lighting: Original (additive), Defined (controlled glow and mostly normal blending), Unbound (amplified additive glow).
- Composition: Cluster (overlapping casts), Field (same cast count distributed across viewport), World (3×3 terrain space with zoom and pan).
- Camera: zoom 33%, 50%, 75%, 100%, 125%, 160%; drag the scene to pan.
- Visual quality: Cinematic / Lean; 13 stress levels up to 25,600 visual particles.

### Fixed constraints
- Exactly 200 visual particles per cast; no reduction in Defined mode.
- Deterministic seeded sprite properties. Same per-element trajectory equations as Experiment 003.
- PixiJS 8.10.0 WebGL rendering; no Wandrune simulation, spell, collision, mana, or gameplay code imported or modified.

### Phone test protocol
1. Fire, Cinematic, 24 casts / 4,800 sprites, Field, 100% zoom.
2. Switch Original, Defined and Unbound; wait 5 seconds in each and tap Capture reading.
3. Switch Cluster and Field at the same particle count, compare clarity and performance.
4. Explore World using the camera controls and visible-sprite estimate; do not interpret FPS as equal-workload when fewer sprites are onscreen.
5. Run AUTO STRESS for the chosen effect and lighting, then Copy results for the JSON report.
6. Repeat for Gravity, Lightning and Ice if useful.

### Limits and release gate
- FPS and P95 are browser animation-frame cadence; JS + render is CPU call duration, not GPU execution time.
- Approximate visible count includes particle sprite centers with viewport padding, not the full area of glow.
- Two-second stages do not measure thermal throttling; artistic readability must be judged visually.
- Wandrune remains untouched. Future integration requires separate explicit user approval.
