# Pixel Art Practice Checkpoint

Latest completed experiment: **013 — Value Crew**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: current best humanoid baseline. Compact head/torso/leg mass hierarchy improved readability. Stephen explicitly judged these the best characters so far.
- 009 Loadout Read: give one dominant equipment mass ownership of the outer contour while keeping the humanoid body compact.
- 010 Armory Grammar: weapon identity can be designed before shading through distinct mass distribution along the main axis.
- 011 Gap Beasts: negative space is an active design element. A few deliberate empty-pixel channels between legs, tail/body, or neck/body can clarify anatomy better than adding contour branches.
- 012 Facing Signal: side-facing humanoids can communicate direction with only a few one-sided contour cues. Profile, brim/hood, body lean, and toe direction should agree while the opposite side remains visually quiet.
- 013 Value Crew: preserve the compact outer silhouette and move profession/equipment information inward. A few broad connected value regions can create role identity without buying that identity with extra contour branches.

## Run 013 research lesson
Pedro Medeiros notes that at very low resolution he avoids excessive outlines while retaining an outside border for contrast and silhouette. Wayline's game-ready-sprite lesson recommends building silhouette first, then adding the biggest interior shapes before small details. Run 013 combines those ideas into one constraint: the outer human contour stays quiet while visor, chest block, bib, and diagonal cloth are expressed as large interior value masses.

Sources:
- https://www.patreon.com/saint11/posts/outlines-14106192
- https://www.wayline.io/learn/pixel-art/4

## Self-critique
This is a deliberate plateau-breaker rather than another contour specialty. Hauler currently has the strongest interior hierarchy because the bib reads as one broad connected mass. Welder's visor is clean but does much of the role work from the head. Medic is clear in value mode but risks leaning on familiar cross-like visual shorthand. Scout's diagonal cloth mass gives motion and identity without changing the body edge, but remains somewhat abstract. The main improvement is structural: all four can carry more information without sprouting extra limb-like projections.

Hard-fail condition: interior value regions fragment into confetti, require black internal linework to make sense, or push outward until the silhouette regains the old branch/antenna ambiguity.

## Plateau note
Stephen observed that the last few runs were not bad but had made no real headway. Treat 008 Crew Call as the stable humanoid baseline and avoid mistaking small technique additions for a breakthrough. Future runs should increasingly test synthesis: multiple retained rules must coexist in one readable design. If repeated synthesis runs remain merely tidy, the bottleneck should be treated as composition/taste rather than another isolated pixel-art rule.

## Next-run guardrail
Do not repeat large interior value blocking, side-facing direction cues, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration. Prefer a synthesis challenge or a genuinely new transferable pressure such as readable cloth/hair mass, material differentiation with minimal clusters, or expressive non-humanoid functional props. Require the new lesson to preserve Crew Call-level body mass hierarchy rather than replacing it.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
