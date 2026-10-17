# Wandrune 084: PixiJS Material Fidelity

**Status:** Isolated preview branch `feature/wandrune-pixi-material-fidelity`. Production `main` is unaffected. The stable camera registration in VFX 083 and centered Physics 038 are unchanged.

## Why this matters

The Pixi migration's early lightweight particles used a white 128x128 radial-glow texture, substantially translucent across most of its area, with just a small center. Most particles were drawn with normal blending and the visual palette, faceting, material grains, bright central details and ambient motes were missing from the old Phaser `ElementVFX 069` look. At large agent counts that reduced magical effects to pale confetti and obscured authored spell identity. Merely making a weak translucent texture larger is not equivalent to bringing the original material artwork back.

## Canonical art restored in Pixi

- The Pixi bridge now reuses the actual **48x48 faceted material canvases** created by the existing Phaser `element-vfx.js` via `scene.textures.get(key).getSourceImage()` and `PIXI.Texture.from()`. We do not approximate this artwork with another shader or fabricate new elemental palettes.
- The same material names are used: `wandrune-mat069-fire`, `-water`, `-frost`, `-lightning`. Neutral painted colors choose the same phase-specific `neutral-flame/arcane/healing/void-0/1/2` atlases as the previous renderer.
- The original Phaser non-linear luminance alpha curve (`pow(alpha, 0.55)`, frost uses `0.8`) replaces the dampened Pixi alpha when authentic material textures are selected. This does **not** impose a minimum alpha or extend the 800 ms fade.
- Visual display size matches the original `radius*3.2` image footprint rather than a scaled soft 128x128 glow. This preserves shape readability when the agent count grows.
- Preserve the efficient ~10% full Pixi Sprite / ~90% lightweight Pixi ParticleContainer split from Experiment 006. No extra simulation agents or hidden masses.
- Pixi 8 ParticleContainer requires one shared texture source per batch. Material particles are therefore grouped into source-consistent containers, keeping UVs static. They are not reassigned arbitrary textures in a batch.
- If an optional canonical texture is missing, that visual falls back to the previous soft procedural texture, without damaging spell physics or throwing.
- `ART: FORGE+` adds up to 72 deterministic, short bright accents from existing agent records. These do not have mass, lifetimes or gameplay influence.

## In-game controls

The new menu button **ART** cycles:
- `SOFT`: migration-era soft white-glow texture (reference)
- `FORGE`: authentic elemental material atlas; current default
- `FORGE-HOT`: same atlas plus conservative bright inner glints

The independent existing **VFX** control still cycles Original/Bright/Formation; the **RENDER** control swaps all Pixi visuals back to Phaser. For direct A/B launches, use `?art=soft`, `?art=forge` or `?art=forge-hot`, optionally combined with `?vfx=formation`. The HUD PIXICORE readout includes the number of native **MATERIAL** records, fallback records and extra **SPARKS**, so users can tell whether the restored textures loaded.

## Regression checks

- `node magic-lab/pixi-material-fidelity.tests.js`: **626 assertions**, canonical source image selection, palette stages, full 200 visual-state draw, no double tint on already-colored sources, 10/90 split, lower-opacity reference, highlights cap, fallback on missing assets, no gameplay state mutation, source-consistent batching, runtime switching and cleanup.
- `node magic-lab/pixi-camera.tests.js`: 19 assertions, unchanged camera alignment and registration.
- `node magic-lab/pixi-formation.tests.js`: 29 assertions, unchanged formation geometry.
- All three tests are headless mocks; they are not GPU/FPS/visual-parity proof.

## iPhone release gate

1. Open the preview in landscape. Ensure `ART: FORGE` and `PIXICORE: ...200 MATERIAL / 0 FALLBACK` when 200 agents are on screen (count fluctuates with occlusion).
2. Cast the same fire cone or dense laser. Compare **ART: SOFT → FORGE → FORGE-HOT** without changing the recipe. Shapes should feel brighter, solid and faceted, not uniform glowing dots.
3. Test neutral flame, Arcane, Frost, Lightning and Water, plus a palette that transitions across phase values; existing colored authoring must remain recognizable.
4. At 200 agents and then multiple concurrent casts, check mobile FPS, jank and whether the screen saturates. Source-separated ParticleContainers have potentially higher batch overhead and may require a texture atlas in a later optimization.
5. Confirm `VFX: FORMATION` remains aligned after VFX 083; test camera movement and the previous magenta/cyan world registration marker with `?pixiAlign=1`.
6. Switch to `RENDER: PHASER`, verify visually that the old source look remains, then switch back. Check mana, impacts, cardinals, saved spells and controls are unchanged.

**Design goal:** regain authored magical identity without giving the renderer authority over agent behavior, collision, lifespan or procedural spell inventions. If native texture count is zero, do not falsely report visual fidelity as verified.
