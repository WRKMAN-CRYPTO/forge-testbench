# Elemental VFX Bench / WRKMAN

**Isolated rendering experiment. No Wandrune sources or gameplay systems are imported or changed.**

Live-test path (when GitHub Pages is enabled for this repository): `/elemental-vfx/`.

## Scope
- Fire: rising embers and turbulent flare.
- Lightning: radial discharges and jittering arcs.
- Ice: outward frost-shard burst.
- Three renderers: Canvas 2D baseline, PixiJS 8.10.0, Phaser 4.0.0.
- Fixed seed `0x0e1e` and the same per-particle trajectories for all renderers.
- **200 visual particles per cast**. Adjustable simultaneous casts: 1, 2, 4, 6, 10.
- Toggling glow changes presentation only; it does not change particle movement.
- No collisions, damage, targeting, spells, physics, gameplay logic, runes, or mana.

## How to test on an iPhone
1. Start Canvas with Fire and one cast. Capture FPS and p95 after the scene settles.
2. Repeat with Lightning and Ice. Increase casts to 2, 4, 6, and 10.
3. Switch PixiJS and Phaser; repeat the same sequence.
4. Use **Copy benchmark report** to export individual readings.
5. Note visual appeal, unexpected glitches, device heat and touch responsiveness separately.

## Measurement limits
- FPS and p95 refer to the browser animation-frame cadence, not GPU timestamps.
- **Main JS** is the JavaScript update/draw call duration; Phaser's own render loop can run separately. Do not interpret this value as comparable GPU render cost across engines.
- Sprite textures are shared, but glow methods are **not** equivalent: Canvas uses additive texture passes; Pixi attempts its built-in BlurFilter; Phaser uses native additive image sprites with texture glow. This pass evaluates feasibility and appearance, not a scientific identical-shader benchmark.
- CDN access is needed for Phaser and Pixi; Canvas can run offline.
- Browser compatibility and mobile performance remain unverified until tested on a real iPhone. The code passed a JavaScript syntax check.

## Release gate
Do **not** change or connect this experiment to Wandrune without a separate explicit approval after reviewing measured results. Preserve Wandrune logic and all non-rendering behavior.
