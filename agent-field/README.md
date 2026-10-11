# WRKMAN Agent·Field v0.4 | Stone Range

A mobile-first, standalone programmable hex-agent laboratory, with a separate **Stone Range** tab for firing the current field at breakable targets. The roguelike is not modified.

## Use it

1. Go to **FIELD EDITOR**. Paint a 32 × 32 field with grayscale instructions or magenta (`#FF00FF`, instruction-free). Adjust swarm population, palette, motion, and surface texture. You may also import a previously saved JSON/PNG field.
2. Switch to **STONE RANGE** at the top of the page. Your current field/settings automatically become the source for the next shot.
3. Tap a stone to select it and press **CAST FIELD**. The agent swarm travels through the range while continuing to sample the same grayscale behavior rules inside the casting frame.
4. Individual moving hexes can strike the stones. Rocks crack as health drops, and shattered rocks break into physics-driven fragments. Damage persists across casts.
5. Press **REBUILD STONES** to reset the targets or return to **FIELD EDITOR** to change your spell. Field edits don't reset the range.

## Design notes

- There are five stones with different durability, selection highlights, health bars, and cumulative damage.
- Stones respond to actual per-agent proximity collisions, with one registered strike per agent per stone per cast. This is not an automatic timed explosion.
- Both 32 × 32 field sampling and directional gradient logic are shared with the field editor. The range animates the cast as a flying swarm, whose internal behavior is driven by a snapshot of the exact current field and settings.
- The casting frame is a first-pass game-facing delivery mechanism. It's not intended to claim that every field is inherently a projectile. Future delivery styles can reuse the same field interpreter.
- Every cast uses the currently selected population, including 6,000 if requested. At high agent counts, actual mobile performance depends on hardware and browser.
- Switching tabs pauses the inactive canvas, so the expensive renderers do not run together. Existing open-world behavior and offscreen accounting on the field-editor tab remain intact.
- The existing local SAVE / LOAD and portable JSON/PNG functionality are unchanged. The target range resets on reload and is not stored with the field.

## Files

- `index.html`: Entire self-contained application. Open from GitHub Pages or a compatible browser.

## Checks

Headless Chromium tests with a phone-sized viewport covered: switching editor/range/editor without losing the field, applying the custom Magenta Gap field and settings to a live cast, rendering with 1,200 and 6,000 hex agents, registering impacts and shattered stones, waiting for spell completion, and rebuilding intact rocks. No page JavaScript errors were observed. A real iPhone performance pass is still needed.