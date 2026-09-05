# Pixel Art Practice Checkpoint

Latest completed experiment: **016 — Shape Stack**

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

## Run 016 research lesson
PixelSanctuary's creature-design discussion recommends a big–medium–small hierarchy to keep forms from becoming evenly weighted texture soup. Wayline's pixel-art workflow reinforces building the silhouette first, then adding only the largest useful internal shapes and details that survive at actual game scale. Run 016 removes humanoid anatomy entirely and applies that hierarchy to four compact props: lantern, anvil, drill, and cannon.

Sources:
- https://www.pixelsanctuary.com/tutorials/creature-design-shape-language-silhouette
- https://www.wayline.io/learn/pixel-art/4

## Self-critique
Anvil and Drill are currently the strongest. Their dominant and supporting masses also explain how the objects work: the anvil's long top slab sits over a narrower waist/base structure, while the drill's motor body dominates a smaller grip and bit. Lantern remains recognizable, but its tiny crown contributes less semantic information than intended and behaves closer to decoration. Cannon is distinct, but barrel and wheel carriage are closer in visual weight than the hierarchy target. The useful distinction is that size hierarchy gains power when each scale has a functional job; merely making three differently sized decorations is not enough.

Hard-fail condition: the object only reads in color; the smallest accent becomes the sole identity cue; two major masses compete at nearly equal weight without a clear reason; or shrinking the sprite causes the hierarchy to collapse into an undifferentiated blob.

## Plateau note
Stephen observed that the recent runs were not bad but had made no real headway. Treat 008 Crew Call as the stable humanoid baseline and do not mistake cleanliness for breakthrough. Runs 014–016 deliberately pressure synthesis and generalization. The emerging question remains whether repeated constraints produce a distinct but comprehensible visual grammar rather than merely competent generic sprites.

## Next-run guardrail
Do not repeat big–medium–small prop hierarchy immediately. Also avoid action-verb staging, exaggerated humanoid proportions, large interior value blocking, side-facing direction cues, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration as isolated lessons. Prefer a different synthesis pressure such as material identity with minimal clusters, cloth/hair masses that deform without silhouette noise, or a non-humanoid machine/creature whose identity and function must both survive silhouette testing.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
