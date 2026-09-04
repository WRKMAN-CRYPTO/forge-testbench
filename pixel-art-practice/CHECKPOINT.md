# Pixel Art Practice Checkpoint

Latest completed experiment: **011 — Gap Beasts**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: current best humanoid baseline. Compact head/torso/leg mass hierarchy improved readability.
- 009 Loadout Read: give one dominant equipment mass ownership of the outer contour while keeping the humanoid body compact.
- 010 Armory Grammar: weapon identity can be designed before shading through distinct mass distribution along the main axis.
- 011 Gap Beasts: negative space is an active design element. A few deliberate empty-pixel channels between legs, tail/body, or neck/body can clarify anatomy better than adding contour branches.

## Run 011 research lesson
PixelSanctuary's creature-design breakdown argues that readable creatures need strong thumbnail silhouettes and specifically calls useful gaps between limbs and torso the real negative-space structure of the silhouette. It also warns against distributing spikes everywhere and recommends one dominant silhouette hook. Run 011 applies that principle to original 16×16 side-view creatures rather than copying tutorial artwork.

## Self-critique
Hound and Crane have the clearest functional gaps. Ram keeps the horn as one dominant hook and avoids turning the head into a crown of projections. Raptor is the weakest because its tail/body/leg relationship still leans on generic dinosaur shorthand. Estimated benchmark: **41/53**. Hard-fail condition remains any negative-space cut that creates extra-limb or extra-head ambiguity instead of removing it.

## Next-run guardrail
Do not repeat negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration. Prefer a new transferable problem such as directional facing cues, controlled value grouping at game scale, internal color blocking that preserves the silhouette, or a return to humanoids that combines the proven Crew Call mass hierarchy with one new principle.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
