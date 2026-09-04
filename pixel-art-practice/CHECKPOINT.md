# Pixel Art Practice Checkpoint

Latest completed experiment: **010 — Armory Grammar**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: current best humanoid baseline. Compact head/torso/leg mass hierarchy improved readability.
- 009 Loadout Read: build asymmetrical identity by giving one dominant equipment mass ownership of the outer contour while keeping the humanoid body compact.
- 010 Armory Grammar: weapon identity can be designed before shading by assigning each family a distinct distribution of mass along its main axis: broad taper + guard, side-heavy head + shaft, long shaft + sharp point, or compact impact head + handle.

## Run 010 research lesson
Wayline's game-ready sprite lesson recommends testing a solid silhouette first, adding large interior shapes second, and cutting detail that turns to mush at actual game size. The OvO 16×16 sword breakdown reinforces that weapon geometry should be established before shading: taper first, then coherent planes and material cues. Run 010 applies those principles to original weapon families rather than copying tutorial artwork.

## Self-critique
Sword and axe are the clearest silhouettes because their mass distribution is highly asymmetric and specific. Spear is intentionally sparse and may become generic if its point loses prominence. Mace distinguishes itself through a compact heavy head, though the head currently risks feeling more like an icon than a forged object. Estimated benchmark: **40/53** for object readability.

## Next-run guardrail
Do not repeat weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration. Prefer a new transferable problem such as negative-space carving between body and equipment, directional facing cues, creature locomotion mass, value grouping, or controlled asymmetry inside creatures.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
