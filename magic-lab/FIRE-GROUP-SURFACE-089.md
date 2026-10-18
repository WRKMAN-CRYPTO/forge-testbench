# Wandrune 089: Connected Group Fire Surface

**Status:** Implemented only in isolated `forge-testbench` preview branch `fix/wandrune-085-nonblocking-fire`. Production Wandrune unchanged.

## User observation and objective

The 088c individual flame direction is now correct. Grouped fire still looked like glowing orange capsules, with animated single-agent flames floating inside a smooth body. The next step must improve the **group silhouette** without spoiling fire density, group selection, or fire agent movement.

## New appearance layer

The rendering-only `pixi-fire-group-flames.js` reads the existing sampled `pixi-fire-perimeter.js` outer contour and draws **curved, connected flame tongues** rooted just inside its boundary. Their dark-orange translucent exteriors and short warm cores deform continuously using a presentation clock. Taller licks favor the upper edges; sides carry smaller flames and the underside remains restrained. Tongues are attached to real, per-cast contours, not generated as independent particles. Ring holes are not emitted as flames (odd nesting depth excluded).

The previous three rounded shell-glow strokes are softened to 45% strength for eligible groups while GROUP FIRE is enabled. Their body and density-driven hot core remain, so existing alpha, ring holes, hot islands, and stable nonblocking group selection remain governed by the original validated renderer. With GROUP FIRE OFF, old Pass 088c shell treatment returns **exactly**.

The layer only activates for groups of at least eight fire agents. It draws at most **10 tongues per enhanced group / 30 tongues total**, across the same existing maximum of **three** density-sampled masses. No additional density field pass, source particle, collision, agent lifecycle, physics, rune, mana, damage, or saves. One reusable Pixi Graphics layer receives a bounded number of Bezier fills. Flame motion uses the existing scene time, not frame count, for comparable cadence on mobile.

## A/B and troubleshooting

- New **GROUP FIRE: ON/OFF** button alongside EMBERS / FLAMES / MOTION and the previous FIRE diagnostic controls.
- `?fireGroupFlames=0` starts with Pass 088c group geometry for an immediate A/B. This does not disable the individual moving flames.
- `PIXICORE` telemetry now reports the group tongue count. Browser fallback disables the optional appearance layer if its draw fails, without affecting gameplay.
- The experiment lives in its own module so it can be removed or changed without modifying Wandrune simulation or the authoritative existing field model.

## Validation

The new `pixi-fire-group-flames.tests.js` passes **62 assertions**, including three 200-agent casts, the 30-tongue bound, unchanged agent records, live A/B toggle, retained original body + hot effects, ring and ice exclusions, and fallback. The original 13 renderer test suites also pass. **Total: 14 headless suites / 1,868 assertions.**

Automated headless checks are not GPU, FPS, or real iPhone visual proof.

## iPhone acceptance gate

1. Cast a moving 200-agent fire cone, then spread some agents. Single flames must keep Pass 088c motion alignment.
2. Watch large masses: the boundary should produce recognizably flame-shaped curved tongues, instead of a clean rounded orange capsule. The top should visibly fluctuate without harsh phase popping.
3. Toggle GROUP FIRE OFF/ON with the same spell and inspect the difference. OFF should restore the previous smooth contour without altering core density or agent movement.
4. Try three simultaneous 200-agent fire casts. All three selected masses should still form, with no major FPS or touch lag regression.
5. Try a fire ring and a frost spell. Preserve ring holes; do not render group fire on non-fire spells.

Production integration remains blocked until on-device approval.
