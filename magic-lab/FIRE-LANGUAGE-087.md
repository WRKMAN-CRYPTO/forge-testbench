# Wandrune 087: Fire Must Read as Fire

**Scope:** Isolated `forge-testbench` VFX preview only, branch `fix/wandrune-085-nonblocking-fire`. No merge to production.

## Observation

User accepted Pass 086's larger and more visible embers but said they *know* they're fire rather than *feel* they're looking at fire. The prior artwork is a glowing, faceted material particle. Increasing its display footprint cannot provide characteristic flame silhouette or convection-like motion.

## Visual-only experiment

New `pixi-fire-flame.js` paints **three cached fire-tongue variants**, once during Pixi setup, using the original native fire material source as part of the inner coal. The visible drawing is intentionally asymmetric: pointed, uneven tips, side tongues, translucent dark orange shell, amber moving center, and pale yellow hot root.

Existing fire particles now optionally use one of these **three shared flame textures**, not a second visual sprite per agent. Existing hero Sprite and efficient Pixi ParticleContainer paths are reused. For each record, the new `flamePose` supplies continuous small angular oscillation plus width and height breathing. This is **only a transform of the existing rendered source**; agent location, hitbox, force, life, cast count and original alpha remain unchanged. In particular, the 800ms terminal fade is not extended.

The previous 086 small-ember display footprint is retained, providing a readable base for the flame shape. The original 086 appearance is instantly restored via **FLAMES: OFF** or `?fireFlames=0`; the independent **EMBERS ON/OFF** control still exists. Switching `ART: SOFT` also bypasses the material-only flame effect.

Fire clustering, density sampling, the three-plasma-mass presentation limit, flame body and heat contours are unchanged. Frost/water/lightning/neutral materials are not modified.

## Mobile performance considerations

The new textures are created once, not once per frame or once per agent. Three fire source-consistent ParticleContainer groups replace one baseline native-fire source group when enabled. There are still exactly **one active Sprite or Particle per submitted agent**. Natural rotation/height/width modulation is several inexpensive trigonometric operations per fire visual. There is no new physics, lighting system, volumetric simulation or particle spawn loop.

## Verification

Headless run (including new `pixi-fire-flame.tests.js`):
- Living flame: **27 assertions**, covering shape aspect ratio, motion, atlas generation, source hot material, 200-agent coverage, 80 fire silhouettes, 0 additional particle allocation in steady animation, native frost preservation, original alpha, live A/B and zero-alpha fade.
- Existing bridge: 216.
- Material fidelity: 1040.
- Formation: 29.
- Fire clusters: 42.
- Fire perimeter: 47.
- Fire body: 44.
- Fire hot core: 43.
- Fire stability (including 600-agent three-cloud budgeting): 205.
- Camera: 19.

**Total: 1,712 assertions across ten headless suites.** Mock execution and syntax checks are not real iPhone screenshot, visual-identity, frame-time, or GPU verification.

## Acceptance checks on phone

1. Spread a handful of agents. Each should look like **flame tongues** rather than oversized glowy dots or rigid orange shards.
2. Watch in motion. Tops should subtly sway and vary height continuously, with no abrupt frame flicker.
3. Cast dense 200-agent fire and three separate masses. The original shared plasma must remain present; individual flame effects should not turn the entire mass into noisy confetti.
4. Tap **FLAMES OFF/ON** with the same recipe and compare, then return to **EMBERS ON**.
5. Try frost or lightning, then reduce alpha to zero. Their artwork must remain native and fire must disappear completely at the end of lifespan.
6. Assess actual iPhone FPS and responsiveness.

This experiment does not prove realistic combustion. It addresses *visual flame recognizability* cheaply and reversibly before larger fire rendering changes are considered.
