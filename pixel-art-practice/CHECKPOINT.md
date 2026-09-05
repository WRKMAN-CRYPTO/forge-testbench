# Pixel Art Practice Checkpoint

Latest completed experiment: **017 — Tuft Signal**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: current best humanoid baseline. Compact head/torso/leg mass hierarchy improved readability. Stephen explicitly judged these the best characters so far.
- 009 Loadout Read: give one dominant equipment mass ownership of the outer contour while keeping the humanoid body compact.
- 010 Armory Grammar: weapon identity can be designed before shading through distinct mass distribution along the main axis.
- 011 Gap Beasts: negative space is an active design element. A few deliberate empty-pixel channels can clarify anatomy better than adding contour branches.
- 012 Facing Signal: side-facing humanoids can communicate direction with a few agreeing one-sided contour cues while the opposite side remains visually quiet.
- 013 Value Crew: preserve the compact outer silhouette and move profession/equipment information inward into a few broad connected value regions.
- 014 Action Read: synthesize the retained rules around one dominant direction of force. At 16×16, the pose should communicate a verb before profession, color, or interior detail does.
- 015 Mass Signal: use deliberate proportional distortion as semantic compression. One dominant body mass can communicate intended function before equipment or color, but only if the distortion reads as one coherent body rather than a damaged skeleton.
- 016 Shape Stack: unequal big–medium–small masses can improve prop recognition, especially when the hierarchy explains construction or function rather than merely adding ornament.
- 017 Tuft Signal: material texture should ride existing masses. A few grouped directional fur/feather clumps can enrich an already-readable silhouette; uniform spikes or strands manufacture false anatomy and contour noise.

## Run 017 research lesson
imonk's fur tutorial argues against trying to represent individual strands or surrounding a sprite with indiscriminate spikes. At low resolution, fur/feathers read more clearly when simplified into larger clumps. Pedro Medeiros' cluster-sketching guidance reinforces working from large connected clusters before refinement. Run 017 turns that into an A/B silhouette test: WOLF, BOAR, OWL, and MAMMOTH can be viewed with CLUMPS ON/OFF and COLOR/INK.

Sources:
- https://itch.io/t/2173926/pixel-tutorial-fur
- https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-2-bcd705cb04d7

## Self-critique
Wolf and Owl are the strongest experiments because their grouped texture follows existing anatomical masses: the wolf concentrates it around neck/tail relationships and the owl along the wing/body hem. Boar remains readable, but the extra shoulder/back rhythm adds less semantic value and could be removed with little loss. Mammoth is the most precarious: the trunk already carries most of the species identity, so brow/chest texture must remain subordinate or the silhouette becomes busy without becoming more informative. The useful distinction is that texture should deform or rhythmically reinforce a mass that already exists; it should not invent a second competing contour language.

Hard-fail condition: clumps create apparent extra horns, tails, limbs, or heads; texture becomes evenly distributed saw-tooth noise; the creature only reads with clumps on; or color/material cues rescue a silhouette that fails in pure ink.

## Plateau note
Stephen observed that the recent runs were not bad but had made no real headway. Treat 008 Crew Call as the stable humanoid baseline and do not mistake cleanliness for breakthrough. Runs 014–017 deliberately pressure synthesis and generalization. The emerging question remains whether repeated constraints produce a distinct but comprehensible visual grammar rather than merely competent generic sprites.

## Next-run guardrail
Do not immediately repeat fur/feather clump treatment, big–medium–small prop hierarchy, action-verb staging, exaggerated humanoid proportions, large interior value blocking, side-facing direction cues, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration as isolated lessons. Prefer a new synthesis pressure such as readable overlapping forms, controlled foreshortening, compact paired-character interaction, or machinery whose functional motion must remain comprehensible at 16×16.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
