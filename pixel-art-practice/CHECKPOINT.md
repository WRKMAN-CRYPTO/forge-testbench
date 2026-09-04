# Pixel Art Practice Checkpoint

Latest completed experiment: **012 — Facing Signal**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: current best humanoid baseline. Compact head/torso/leg mass hierarchy improved readability.
- 009 Loadout Read: give one dominant equipment mass ownership of the outer contour while keeping the humanoid body compact.
- 010 Armory Grammar: weapon identity can be designed before shading through distinct mass distribution along the main axis.
- 011 Gap Beasts: negative space is an active design element. A few deliberate empty-pixel channels between legs, tail/body, or neck/body can clarify anatomy better than adding contour branches.
- 012 Facing Signal: side-facing humanoids can communicate direction with only a few one-sided contour cues. Profile, brim/hood, body lean, and toe direction should agree while the opposite side remains visually quiet.

## Run 012 research lesson
Pixel Art Lab's side-view character lesson emphasizes that side-view sprites differ from front-facing sprites through center of gravity, asymmetric outlines, profile protrusions, and toe direction. It recommends establishing direction and weight in silhouette before adding detail. Run 012 compresses that idea to original 16×16 humanoids rather than copying the tutorial artwork.

## Self-critique
Courier and Miner have the clearest facing cues. Guard is readable but its upright body reduces directional lean. Scout's hood peak helps direction but sits close to the old failure mode where a useful protrusion becomes horn/antenna noise. Estimated benchmark: **42/53**. Hard-fail condition: a directional cue becomes an extra head/limb, or mirroring the sprite fails to reverse its facing read immediately.

## Next-run guardrail
Do not repeat side-facing direction cues, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration. Prefer a new transferable problem such as controlled value grouping at game scale, internal color blocking that preserves the silhouette, readable cloth/hair mass without contour noise, or a non-humanoid prop family with strong functional shape language.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
