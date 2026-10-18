# Wandrune 086: Individual Fire Ember Fidelity

**Status:** Isolated `forge-testbench` preview branch `fix/wandrune-085-nonblocking-fire`, not merged into production.

## Problem reported from iPhone capture

Fire cluster material improved, but isolated spell agents looked like tiny orange pinpricks. The authoritative 48×48 fire atlas has a smaller faceted body inside the texture; displaying it at `3.2 * r` world units leaves little readable core when `r` is small and the landscape viewport is scaled to phone pixels.

## Scope and change

Only the **display footprint of small element=fire agents using authentic FORGE materials** changes. The same original per-agent atlas, tint, angle, alpha, lifetime and Sprite/ParticleContainer assignments remain. No new drawing layer, generated spark, simulation actor or graphics pass is added.

The original diameter `base = 3.2 * radius` is replaced, for native fire art only, by:

```js
displaySize = Math.hypot(base, 12);
```

This is a continuous visual enlargement with no hard transition at a chosen radius. At radius 0.6, display size goes from 1.92 to 12.15 world units; at radius 2.8, from 8.96 to 14.98; at radius 20, from 64 to 65.12. The baked material halo and pale interior therefore have more pixels to show on mobile without an additional glow/point primitive. At larger radii, the change becomes negligible.

**Importantly:** the original nonlinear opacity curve, including zero opacity at the end of the fade, is unchanged. Visual footprint does not alter collision size, density samples, merging radius, plasma contours, mana, agent budget or spells.

## Live comparison

The preview has a new `EMBERS: ON/OFF` button alongside other renderer diagnostics. It defaults ON; `?fireEmbers=0` starts with previous Pixi material sizing for direct A/B, and ON can be restored during the same cast. The PIXICORE line shows the number of fire visuals receiving the display support. `ART: SOFT` uses its original reference size, while `ART: FORGE` and `FORGE-HOT` use this treatment for fire only. Frost, water, lightning and neutral palettes remain unchanged.

## Gate

- Fire single: visibly faceted and readable on landscape iPhone, not a round glow-dot.
- Fire scatter: individual agents remain present when spread out or separating.
- Fire cluster: current three-mass nonblocking plasma budget, hot core and stable contour behavior are not modified.
- 200 fire agents and 600 across three casts: no extra render particles, unchanged visual-agent counts, stable performance.
- Fade: an individual agent still disappears completely when its submitted alpha reaches zero.
- Other materials: ice and every other non-fire element remain exactly as they were.
- Fallback: Phaser rendering and original FIRE EMBERS OFF comparison remain accessible.

Headless regression tests in `pixi-material-fidelity.tests.js` check native fire material sizing, A/B restoration, original alpha, no extra particle creation, preserved 200 agents and unchanged frost artwork. Bridge baseline tests also pass. **Headless assertions are not iPhone/GPU performance proof.** Keep production untouched until on-device visuals are accepted.
