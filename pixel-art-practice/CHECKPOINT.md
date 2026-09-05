# Pixel Art Practice Checkpoint

Latest completed experiment: **015 — Mass Signal**

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

## Run 015 research lesson
SpriteGen's 16×16 character guide argues that realistic human proportions collapse at tiny scale and that proportions should be cheated toward readability; it also specifically recommends widening shoulders or pushing pose features when silhouette needs help. Wayline reinforces that the silhouette must read at actual game size before smaller interior detail matters. Run 015 turns that into a synthesis constraint: each worker receives one intentionally exaggerated proportional bias and no equipment clue. The exaggeration must survive an all-ink test while preserving the compact, connected-body lessons from Crew Call and Hidden Limb.

Sources:
- https://spritegen.io/guides/how-to-draw-a-pixel-art-character/
- https://www.wayline.io/learn/pixel-art/4

## Self-critique
Power is currently the strongest specimen because widening shoulder/arm mass changes the whole body at once without creating isolated contour branches. Load also separates well because the back and torso become one heavy volume over a planted base. Speed is less successful: long legs and a narrow trunk signal lightness, but the idea is close to simply making the character skinny. Reach is the dangerous specimen because elongated arms communicate function while simultaneously approaching the old false-limb/antenna failure. This run does not yet look like a breakthrough, but it exposes a promising distinction: useful exaggeration reorganizes several connected masses together; weak exaggeration changes one anatomical dimension and hopes the viewer supplies the meaning.

Hard-fail condition: the function disappears in INK; an exaggerated part looks detached from the body; long thin anatomy becomes antenna/branch noise; or two roles differ mainly by color instead of silhouette-level mass distribution.

## Plateau note
Stephen observed that the recent runs were not bad but had made no real headway. Treat 008 Crew Call as the stable humanoid baseline and do not mistake cleanliness for breakthrough. Runs 014 and 015 are deliberate synthesis pressure. The emerging question is whether repeated constraints produce a distinct but comprehensible visual grammar rather than merely competent generic sprites.

## Next-run guardrail
Do not repeat action-verb staging or exaggerated humanoid proportions immediately. Also avoid large interior value blocking, side-facing direction cues, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration as isolated lessons. Prefer a new synthesis pressure where readability and style can interact, such as cloth/hair masses that deform with motion, material identity using only a few connected clusters, or a functional non-humanoid machine/creature whose silhouette must communicate both what it is and what it does.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
