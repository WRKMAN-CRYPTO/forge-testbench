# Wandrune VFX 082: Trail-Aligned Formation Glow

**Status:** Standalone preview branch `fix/wandrune-formation-trail-alignment`. Production `main`, Physics 038, cardinal runes, and spell simulation are unchanged.

## Confirmed renderer mismatch

The visually recognizable orange spell streaks are drawn in `crafted-magic.js` using `a.tail` positions, converted to world coordinates with `worldPosition`. In VFX 081, the formation analysis received **only the newest head position** per agent and constructed an entirely different median-spine ribbon across those head positions. On a fast cone, the heads have traveled away from earlier streaks, so the median glow appeared as a separate zigzag below the orange beam.

**This is an alignment and source-data error, not a camera-pixel offset.** Shifting the overlay by an arbitrary fixed number of screen pixels would break as soon as the camera, velocity, or spell trajectory changed.

## Correction

1. `crafted-magic.js` now sends the **same historic world-space coordinates** used to draw the original Phaser orange lines to the optional Pixi bridge. The physical agent, position, velocity, previous tail array and live gameplay state are never changed by this.
2. `pixi-formation.js` still recognizes coherent flow from current agents but now extracts up to 64 actual, continuous agent trail polylines per detected formation. It copies those coordinates and validates finite values, ignoring duplicates and near-zero lines.
3. `pixi-swarm-bridge.js` no longer draws inferred median-spine polygons. Instead it adds two translucent, additive strokes **exactly on the actual visible line segments**. Each path begins with an explicit moveTo; different agents are never joined.
4. The Original / Bright / Formation A/B toggle and fallback to Phaser are preserved. The visual telemetry records actual connected line segments.
5. `magic-lab/index.html` uses cache-busted 082 script versions so iPhone Safari loads this correction.

This enhancement is intentionally conservative. If geometry detects a coherent group but trails have not accumulated yet, it draws no supplemental formation glow. It must not fabricate a line.

## Checks

- `node magic-lab/pixi-formation.tests.js`: **29 assertions**, including a simulation where orange historical trails sit more than 100 world pixels above current heads. Every formation vertex must match one of the *provided* tail or head coordinates.
- Verifies beam/cone detection, circular/scattered rejection, disconnection guards, no cross-agent line joins, restored brightness, 200 visual records, source-record immutability and safe legacy rendering.
- Does **not** claim real iPhone frame rates or visual alignment are confirmed. GPU testing remains necessary.

## Phone test

Open the newest 082 preview, cast the exact cone from the screenshot, and compare **VFX: BRIGHT** against **VFX: FORMATION**. The glow should now trace the orange streaks, not the lower blue agent heads. Check for excessive thickness, unnatural gaps, flicker, or FPS drops. The full Phaser fallback and Physics 038 remain available.

If the enhanced glow is still spatially displaced, capture a screenshot with PIXICORE telemetry. The next diagnostic would compare the two canvases' Phaser camera world transform with Pixi's transformed coordinate bounds, not patch the simulation.
