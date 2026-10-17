# Wandrune Physics 038: Equal Footing for Painted Pixels

**Status:** Isolated preview branch `fix/wandrune-field-sampling-symmetry`. Not merged to `main` or the original Pixi migration branch.

## Verified defect in Physics 037

Physics 037 sampled a value at normalized `(nx,ny)` by interpolating the pixel at `floor(nx*32),floor(ny*32)` and its **right, below and lower-right** neighbors. It treated the upper-left corner of the pixel as its interpolation origin, although the authored grayscale value visually represents the entire cell centered at `(i+0.5,j+0.5)`.

This is directionally asymmetric. An exactly balanced bright center with identical N/S/E/W surrounding values 64 was sampled at value **95.75**, then given downhill gradient direction approximately **(+0.707,+0.707)**, rather than zero. In a 32x32 field, that adds an unintended right/down steering tendency to certain gradients.

The recording shows a right/down tendency in the Forge preview, which is independent of PixiJS. It is not proof that all observed drift in this particular recipe comes from the sampler, because initial headings are random and some fully masked/constant fields have zero gradient even in the old code.

## Physics 038 correction

- Keep pixel occupancy **exactly** as before. Magenta (-1) at the agent's current pixel remains no field.
- Recenter interpolation coordinates by one-half cell so equal neighbors surround a pixel center symmetrically.
- Treat out-of-bounds interpolation neighbors as the nearest edge cell. Masked neighboring cells are ignored and valid weights renormalized as before.
- Keep spawn rules, velocities, age/lifespan, acceleration strength, drag, swirl, momentum, colors, collisions, directional runes, mass, and saves unchanged.
- This is a real physics change: saved recipes stay compatible, but some trajectories will intentionally differ because the biased sampling is corrected.
- Update `magic-lab/index.html` to load `../field-physics.js?v=038-symmetry`, preventing stale cached Physics 037.

## Verification

`node field-physics-symmetry.tests.js`: 5,250 deterministic assertions passed through the isolated JS runner (mask semantics, exact bright center, 180-degree mirror-symmetric values and gradients, 50 mirrored paired agents over 100 frames, unmodified starting cells). Additional mirror motion tests: 64 paired agents × 150 frames at swirl 0%, 26%, and 100%, with no measurable divergence beyond floating-point rounding.

## Phone A/B checks

On this **new preview hostname**, open Wandrune, enter Spell Forge, and inspect a four-way symmetric grayscale pattern in the preview at 200 agents. Try both muted and strong swirl, and reseed several times. Watch for reproducible preference toward any compass direction. Compare with the **previous feature-branch preview** if useful. Since preview hostnames differ, browser-local spells are not automatically shared; recreating the simple sample or importing exported recipes is more dependable.

**Release gate:** Do not merge to the live main branch until the user's preview confirms normal authored magic, cardinal runes, enemy impacts and FPS. The baseline Pixi migration remains independently testable.
