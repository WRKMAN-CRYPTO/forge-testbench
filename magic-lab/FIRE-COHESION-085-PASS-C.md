# Wandrune 085, Pass C: Fire Plasma Body

**Status:** Isolated test-branch deployment, created from the verified wizard-skin-recovery and Pass B preview. No production/main changes.

## What the user asked

The video of Pass B showed the perimeter accurately registered, but too distant from the fire and too similar to a glowing containment capsule. The task is to make clustered fire acquire density-dependent material **inside** its shared boundary, while keeping agent motion, collisions, cardinal runes, camera registration, original 20-skin wardrobe and all saves intact. Do not jump to a white-yellow hot core (Pass D) or edge turbulence (Pass E).

## Implementation

- `pixi-fire-perimeter.js` now traces **multiple isovalues from one shared, bounded Gaussian influence field**. The field is evaluated only once per enhanced cluster per frame. Contours at `0.78` and `1.6` yield the outer plasma volume and denser amber interior. Pass B's `0.52` contour remains selectable when the body is disabled.
- Nested marching-square loops are classified by geometric containment and parent/depth. The fill renderer uses PixiJS 8 `Graphics.fill` and `Graphics.cut` so hollow fire rings remain hollow.
- `pixi-swarm-bridge.js` adds **fireBodyGraphics**, placed behind the normal material particles and the perimeter. Two translucent fills use warm red/orange and amber. For small 2-3-agent clusters the extra body is faint; substantial clusters get a richer interior. **There is no opaque fill or white-hot core.**
- The excessive capsule outline shrinks while Body is ON, with `9px/4px/1.4px` translucent strokes instead of `15px/7px/2.4px`. With Body OFF, the Pass B perimeter appearance is unchanged.
- `PLASMA BODY: ON/OFF` is independent from the existing `PLASMA EDGE` and `FIRE GROUPS` controls. `?fireBody=0` starts in Pass B mode. `?fireShell=0` hides the edge, allowing the body to be evaluated alone.
- The same camera transform, fire groups, world-space coordinates and original agent records are used. No additional simulation agents or gameplay bodies are created.
- The shared work limit remains **three enhanced clusters and about 3,500 field samples per frame**, with source agents and other spells rendered normally. The UI exposes shell render time and the number of actual plasma fill polygons.

## Automated verification

- `node magic-lab/pixi-fire-body.tests.js`: 44 assertions. Cone outer vs inner size, two density levels, single agents, separated casts, 200-agent immutable records, ring hole detection and Pixi `cut()`, fill alphas, independent switches and Phaser fallback.
- Pass B original rendering 47 assertions, Pass A clustering 42, camera registration 19, historical trail formation 29, native Forge materials 626. **807 total** mocked tests pass. They are not proof of mobile FPS or desired aesthetic.
- Production and original skin art remain unchanged.

## iPhone test

1. Open the current preview and confirm the **detailed wizard skin still works**. Cast the same 200-agent fire cone used in previous recordings.
2. Compare **PLASMA BODY: OFF** against **ON** with **PLASMA EDGE: ON**. The ON state should add a substantial but translucent fire-colored body to the connected cone, making the edge hug the hot particles more closely.
3. Turn **PLASMA EDGE: OFF** but leave Body ON to see the material shape by itself; then turn both off to compare the unmodified Forge artwork.
4. Cast small pairs, widely spaced embers, a ring and overlapping fire casts. Small groups should stay subtle; the ring's hollow center must remain open.
5. Keep an eye on **PLASMA EDGE ... ms** telemetry and how Archivist dodges feel with multiple simultaneous casts. The field sampling still adds CPU work and must be validated on a real iPhone.
6. If the body flickers, obscures the wizard, becomes too opaque, or hurts FPS, switch it OFF. Do not advance to Pass D until the user judges its scale/heat and performance.

**Philosophy:** A single fire agent contributes appearance; neighboring agents collectively contribute plasma material.
