# Pixel Art Practice Checkpoint

Latest completed experiment: **022 — Machine Phase**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: current best humanoid baseline. Compact head/torso/leg mass hierarchy improved readability.
- 009 Loadout Read: give one dominant equipment mass ownership of the outer contour while keeping the humanoid body compact.
- 010 Armory Grammar: weapon identity can be designed before shading through distinct mass distribution along the main axis.
- 011 Gap Beasts: negative space is an active design element. A few deliberate empty-pixel channels can clarify anatomy better than adding contour branches.
- 012 Facing Signal: side-facing humanoids can communicate direction with a few agreeing one-sided contour cues while the opposite side remains visually quiet.
- 013 Value Crew: preserve the compact outer silhouette and move profession/equipment information inward into broad connected value regions.
- 014 Action Read: synthesize retained rules around one dominant direction of force. The pose should communicate a verb before profession, color, or interior detail.
- 015 Mass Signal: proportional distortion works when several connected masses participate in one coherent semantic exaggeration.
- 016 Shape Stack: big-medium-small hierarchy is strongest when each size tier has a different structural job.
- 017 Tuft Signal: material texture should ride existing masses rather than manufacture a second contour language.
- 018 Anchor Drop: a contour landmark earns pixels when removing it changes category recognition.
- 019 Contact Read: negative space can clarify ownership of good masses but cannot rescue confused mass organization.
- 020 Motion Lock: decide which identity masses are not allowed to drift before spending silhouette pixels on locomotion.
- 021 Depth Cheat: at 16×16, projection may be intentionally dishonest when literal foreshortening destroys semantic truth.
- 022 Machine Phase: modular movement is only a scaffold. After rotation or translation lands on the integer grid, hand-correct silhouettes so part thickness, pivots, joints, and diagnostic masses remain stable across phases.

## Run 022 research lesson
Pedro Medeiros' Modular Animation discussion notes that procedural/modular animation can save work but tends to feel stiff and produce rotation artifacts; his preferred compromise is modular construction followed by manual fixes. His Machines and Weird Tech reference sheet also points toward studying real/broken machinery and combining simple mechanical elements rather than decorating a box until it looks technological.

Sources:
- https://www.patreon.com/saint11/posts/modular-15160612
- https://www.patreon.com/saint11/posts/machines-and-7800465

## Experiment
**Machine Phase** uses four original 16×16 machines: FAN, PRESS, WINCH, and PUMP. Each cycles through four mechanical phases. PIXEL FIX uses hand-corrected key silhouettes. RAW MODULE deliberately keeps naive integer-grid transform artifacts such as one-pixel blades, fattened/shifted corners, and drifting attachment points. COLOR/INK and FREEZE/STEP controls let the viewer inspect whether identity survives motion.

## Self-critique
Fan demonstrates the lesson most clearly because raw diagonal blade phases visibly lose thickness consistency. Winch also benefits because its crank needs a stable visual pivot. Press is intentionally the least dramatic A/B case because vertical translation is naturally grid-friendly; that makes it a useful control rather than a flashy specimen. Pump is the weakest design: the rocker arm can still read as a decorative antenna instead of mechanism unless its attachment is watched carefully. The run therefore supports a narrower rule than “hand-draw every frame”: correct only the pixels where modular transforms damage structure, attachment, or category read.

Hard-fail condition: PIXEL FIX and RAW MODULE read identically in every phase; corrected frames wobble more than raw ones; the machines are identifiable only from color or labels; or moving parts detach visually from their parent mass.

## Plateau note
Stephen observed that competent runs without headway should not be mistaken for breakthroughs. 022 changes the spatial problem again: recognition must survive rigid-part motion, not merely a static pose or whole-character locomotion. The useful test is whether accumulated silhouette rules now govern animation cleanup decisions automatically.

## Next-run guardrail
Do not immediately repeat modular machinery cleanup, tool foreshortening, four-frame locomotion tracking, contact-seam A/B testing, diagnostic-landmark subtraction, fur/feather clumps, big-medium-small prop hierarchy, action-verb staging, exaggerated humanoid proportions, interior value blocking, facing asymmetry, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, or asymmetrical loadout integration as isolated lessons. Prefer attack anticipation/recovery, rotation consistency of a single character/creature across viewpoints, silhouette hierarchy in a small boss encounter, or another synthesis pressure that combines multiple retained rules.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
