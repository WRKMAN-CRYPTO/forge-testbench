# Wandrune 092: Double Agent Footprints

**Status:** Implemented only in the isolated `WRKMAN-CRYPTO/forge-testbench` experimental branch `fix/wandrune-085-nonblocking-fire`. This is a deliberately requested change to gameplay **collision reach**, not a VFX-only pass. Do not merge into production without approval.

## User requirement

Double each crafted-swarm agent's **drawn size** and **collision size** across all elemental types. Interpret size as linear dimensions / radius (i.e., 2× width, height, and swept-circle hit radius), NOT doubling area. The circular contact cross-sectional area is therefore up to 4× before target radii are included.

## Implementation

- New `magic-lab/agent-sizing.js` centralizes an immutable **FACTOR = 2**, with `visualRadius`, `hitRadius`, and target-grid `searchPadding`.
- `crafted-magic.js`: scales each live agent's recipe/rune-derived **draw radius** by 2 before it reaches Phaser geometry, the canonical element VFX renderer or the Pixi adapter. Scales the queued visual fade-out agent radius identically, so ghosts don't suddenly shrink. Enlarged camera culling margins avoid prematurely popping sprites at the viewport edge. Does not alter agent velocity, map navigation, world-emission transform, mass, lifespan, agent count or spell settings.
- `field-impacts.js`: doubles the **individual swept-circle radius** for world target impacts, including regular agents and enlarged Rune/Behemoth agents. The target broadphase padding is doubled from 3→6 for ordinary casts and 48→96 for rune casts, avoiding false misses for larger circles. This directly changes hit opportunity against enemies, stone pillars, crates and dummies, but does not alter per-hit damage computation, impact cap, hit cooldowns or consumption behavior.
- `pixi-swarm-bridge.js`: preserves an **exact** 2× increase in fire particle displayed size by doubling the original Ember hypotenuse footprint rather than leaving the old unscaled fixed 12px support. All other materials already scale linearly with their doubled incoming radii. The existing translucent water stretch/smear, fire motion/tongues, frost/lightning materials and visuals remain available.
- `index.html`: loads sizing before collisions and cast code and cache-busts the modified modules.

## Distinction: Rune WALL

The authored 32×32 rune WALL system uses *grid-crossing point contacts*, not swept-circle target collisions. It is unchanged. The requested radius doubling applies to all agents' **world-target swept collisions**, not to the custom grid WALL tile traversal. Extending contact distance for WALL requires separate design/approval because it would alter field-cell navigation and performance.

## Test results

The new `agent-sizing.tests.js` passes **43 assertions** for exact visual and swept hit multipliers, contact at the newly enlarged boundary, misses beyond it, all four elemental material IDs, heavy Behemoth mass contacts, pillars, real game draw submissions for five element IDs plus a heavy rune, and the retained doubled radius on a faded agent. Existing **16 suites** remain green with **2,002 assertions**. In all, **17/17 headless test suites, 2,045 passing assertions**.

## On-device acceptance

1. Make a single water agent and then a 200-agent spray; compare its footprint to the pre-092 build. A single agent should appear roughly twice as wide/tall as before (existing speed-based water stretch still applies).
2. Test fire, frost, lightning and neutral spells at sparse and heavy populations. Check readability, frame rate and overlapping visuals. The 200-per-cast population limit is unchanged.
3. Aim just beside an enemy or destructible target to check that the larger circle now connects when the original narrow radius missed. A hit still consumes its agent and deals the original per-hit damage.
4. Test Behemoth impacts and cross-screen motion. Watch for unexpectedly generous hit reach due to enlarged large-mass radii.
5. Check the transition to fade-outs and agents near the screen border. They should not change size abruptly or disappear early.

Production integration remains gated on device evaluation.
