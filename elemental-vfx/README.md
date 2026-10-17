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

## Experiment 005: Intelligent PixiJS VFX

**URL:** https://forge-testbench.vercel.app/elemental-vfx/pixi-intelligent.html

Goal: compare the rendering of identical animated sprite-state records across four approaches, without modifying Wandrune. Experiment 003 and 004 remain available.

### Four modes

- **Baseline:** all Sprites rendered; reproduces Experiment 004's regular PixiJS path.
- **Cull:** every state is still updated, but off-screen PixiJS Sprites receive `renderable=false`. The app counts how many it submits versus skips.
- **Smart LOD:** the same off-screen culling plus near/mid/far sampling, drawing all near sprites, half of mid sprites, and one-sixth of far sprites, with slight scale changes to preserve mass.
- **Particle:** PixiJS 8 `ParticleContainer` and `Particle` with dynamic position, vertex/size, rotation and color; a single shared texture and blend mode for efficient batching. This is NOT pixel-identical to the other three modes, and no per-particle GPU culling is claimed.

### Fair comparisons

Select an element, lighting quality, composition, zoom and cast count once. Press **COMPARE 4 MODES**. The app sequentially constructs each renderer, resets the animation phase to the same origin, settles for 700 ms, collects 2.2 seconds of FPS/frame-time data, logs approximate visible counts and actual Sprite renderable submissions. Stops can be requested during the comparison. It restores the original mode afterward.

For a high-load phone test: **Fire / Cinematic / World / Defined / 50% zoom / 128 casts (25,600 states)**, then Compare 4 Modes. Repeat with **Field** to avoid mistaking off-screen culling for a rendering-speed improvement. Test Gravity similarly.

The separate AUTO STRESS button still ramps 200–25,600 **visual states**, stopping after two consecutive stages with FPS below 50 or P95 over 25ms. It runs the *selected* renderer mode.

### Reporting and limitations

- The 200 visual states per cast are preserved in every mode. No Wandrune simulation, mana, combat, swarm, runes or other gameplay code is touched.
- On-screen counts are approximate and not GPU instrumented; submitted and skipped counters track the app's chosen Sprite `renderable` decisions, not GPU draw calls. ParticleContainer submits all its particles by design.
- Frame timing is browser requestAnimationFrame cadence and JS+render call duration, not measured GPU execution time.
- Smart LOD intentionally changes distant visual detail; compare readability along with frame timings.
- ParticleContainer intentionally sacrifices per-particle artwork variants and blend control for faster batching. It may differ visually from Baseline.
- Two-second samples cannot prove thermal stability. Report device behavior separately.

Reference measured on user's iPhone, Experiment 003 Fire Cinematic: 3,200 at ~60 FPS, 4,800 at ~57.09 FPS P95 22 ms, 6,400 failed P95 26 ms. These are baseline observations, not guarantees for Experiment 005.

**Integration rule:** This is a standalone `forge-testbench` lab. Wandrune stays untouched unless separately approved.

## Experiment 006: Hybrid Visuals / PixiJS 8

**Open:** https://forge-testbench.vercel.app/elemental-vfx/pixi-hybrid.html

The user's Experiment 005 screenshot and benchmark showed that the single-texture ParticleContainer mode looked flat, even though at 25,600 fire particles it averaged 40.71 FPS versus 33.64 FPS for full Sprite rendering. This experiment explores the beauty/performance compromise.

### The hybrid design
- Per cast exactly **200 animated visual states** are generated with the same deterministic seed and trajectory equations used in Experiments 003–005.
- A chosen fraction of those states uses full PixiJS Sprite objects and the existing three texture variations for prominent structure.
- The remainder uses **three ParticleContainer batches**, each associated with one of the same three procedural textures. Every state continues updating every frame.
- Detail importance is deterministically ranked per cast using brightness, size, and lifetime parameters. The high-detail fraction is **exact per cast**, not approximate.
- Only the representation changes. This is an isolated rendering test, not a gameplay simulation or modification to Wandrune.

### Experiments
1. Open the Hybrid strategy and choose a ratio from **0%, 10%, 25%, 50%, 75%, 100% detailed Sprites**.
2. Compare the visual personalities at Fire / Cinematic / Cluster / Defined, preferably 4,800 and 25,600 total states. Photograph 0%, 25%, 50% and 100% for subjective comparison.
3. Run **COMPARE 6 RATIOS** for the same effect, camera, quality, lighting and count. Each ratio reconstructs the renderer but keeps the same seeded particle motion and sets its local animation phase to zero. It settles ~700 ms and samples ~2.2 s.
4. Press **Copy results** and share the JSON, including per-ratio detailed/fast counts and FPS/P95.
5. Repeat with Gravity, Lightning, and Ice. Use World and pan/zoom for off-screen load scenarios.

### How to interpret
- 0% hybrid uses three particle texture groups; the older **Particle** strategy uses a single texture. They should not be treated as pixel-identical.
- 100% hybrid is regular Sprites but retains three empty lightweight containers, which may add a small overhead compared with Baseline.
- A higher FPS is not automatically visually preferable; preserve texture depth and spell identity.
- The browser-frame samples do not measure GPU execution time and are too short to assess thermal throttling.
- The underlying 200 states per cast are NEVER reduced. Any future level-of-detail changes would affect rendering only.
- Experiments 001–005 and all Wandrune code remain unchanged. Rendering integration requires separate user approval.
