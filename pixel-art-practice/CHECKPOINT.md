# Pixel Art Practice Checkpoint

Latest completed experiment: **031 — Turntable Crew**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: compact head/torso/leg mass hierarchy improved humanoid readability.
- 009 Loadout Read: one dominant equipment mass can own the outer contour while the body remains compact.
- 010 Armory Grammar: weapon identity can be designed before shading through mass distribution along the main axis.
- 011 Gap Beasts: deliberate empty-pixel channels can clarify anatomy better than extra contour branches.
- 012 Facing Signal: direction can read from a few agreeing one-sided contour cues while the opposite side stays quiet.
- 013 Value Crew: compact human silhouettes remained readable even without explicit arms; broad interior values can carry secondary information.
- 014 Action Read: pose readability is not action readability. Push was visually strongest but read too much like jumping.
- 015 Mass Signal: **current humanoid design benchmark**. Stephen explicitly judged the sprites themselves well designed: clean head/limb count, good symmetry, clear construction, and readable labels.
- 016 Shape Stack: anvil was clearly strongest; big-medium-small organization cannot replace a category-defining contour.
- 017 Tuft Signal: Wolf strongest, Boar second. Solid believable animal mass outranked decorative texture.
- 018 Anchor Drop: a contour landmark earns pixels when removing it changes category recognition.
- 019 Contact Read: negative space can clarify ownership of good masses but cannot rescue confused mass organization.
- 020 Motion Lock: decide which identity masses are not allowed to drift before spending silhouette pixels on locomotion.
- 021 Depth Cheat: projection may be intentionally dishonest when literal foreshortening destroys semantic truth.
- 022 Machine Phase: mechanical animation is currently a stronger area. Modular movement is only a scaffold; hand-correct thickness, pivots, joints, and diagnostic masses.
- 023 Windup Lane: anticipation should predict the future hit, not merely effort.
- 024 Volume Bounce: squash/stretch may distort geometry but should preserve apparent volume and diagnostic masses.
- 025 Arc Yard: mechanical in-betweens must preserve pivots and linkage length; the path between key poses is part of construction.
- 026 Joint Lock: important anatomical attachment points can be treated as construction invariants during organic animation.
- 027 Heavy Hand: post-contact follow-through communicates tool weight; terminal tool masses need to remain distinct.
- 028 Ground Shift: grounding is relational. Keep the support foot fixed and organize body mass over it.
- 029 Phase Pack: mechanical phase discipline can organize quadruped motion, but timing cannot rescue weak species construction.
- 030 Core Beasts: remove easy appendage identifiers temporarily; strengthen torso/head/neck ratios if the creature stops reading.
- 031 Turntable Crew: **viewpoint changes must preserve a mass contract**. Hand-redraw the new view, but hold ground anchor, overall scale, and diagnostic proportion relationships stable enough that the sprite remains the same character.

## Run 031 research lesson
Multi-direction sprite guidance consistently treats each facing as a redraw rather than an arbitrary rotation. The useful transferable rule is to preserve invariant scale and anchors while translating the same design relationships into a new silhouette. Pixeldex specifically recommends fixed foot/ground anchors, same scale across directions, silhouette checks, and warns that diagonals should not simply be rotated cardinals. A skeletal-animation tutorial for pixel art independently notes that raw rotation produces jagged artifacts and uses enlarged transforms plus cleanup rather than trusting low-resolution rotation directly.

Sources:
- https://pixeldex.dev/sprites/builder/
- https://itch.io/devlog/214252/tutorial-basic-skeletal-animation.amp

## Experiment
**Turntable Crew** is a four-round matching game. A 16×16 front-facing worker is shown as the reference. Three clean side-view silhouettes are offered; exactly one belongs to the same worker. The wrong answers are not malformed decoys. They are valid side sprites whose body-width, depth, head/body, or grounded-height relationships belong to another worker. INK is the default so color cannot solve the match.

Assets: four original front views plus four original side views for Hauler, Scout, Guard, and Miner.

## Assumption challenge
The dangerous shortcut was to use obvious distortions as wrong answers. That would test error spotting rather than viewpoint consistency. The experiment therefore swaps complete, plausible side-view proportion systems between workers.

A second risk was confusing side-view facing cues with the already-practiced 012 lesson. 031 does not ask which direction a sprite faces. It asks whether a front and side silhouette preserve one character identity across projection.

## Self-critique
Hauler and Guard have the strongest contracts because their width/depth differences survive a turn clearly. Scout and Miner are more fragile: at 16×16, one pixel of width can swing their identity too far. The game is also stricter than a single turnaround showcase because every distractor is a legitimate sprite. If choices feel arbitrary, the mass contracts are not separated enough.

Hard-fail condition: matching requires color; the correct side view is not distinguishable from another worker by broad shape; side sprites float relative to the front reference; or one character becomes a visibly different scale when turned.

## Next-run guardrail
Do not immediately repeat front-to-side worker matching, generic multi-direction turnaround, core-only quadruped proportion tests, quadruped phase offsets, lower-body weight transfer, tool follow-through, shoulder-lock detection, mechanical arc correction, squash/stretch volume, attack-lane anticipation, modular machinery cleanup, tool foreshortening, four-frame locomotion tracking, contact-seam A/B testing, diagnostic-landmark subtraction, fur/feather clumps, big-medium-small prop hierarchy, action-verb staging, exaggerated humanoid proportions, interior value blocking, facing asymmetry, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, or asymmetrical loadout integration as isolated lessons.

Promising next pressures: recovery-state readability after an action; maintaining one character identity across front/back rather than front/side; silhouette hierarchy when multiple actors overlap in a small encounter; or a deliberately non-humanoid mechanical-to-organic transfer that has not been isolated before.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
