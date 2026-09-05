# Pixel Art Practice Checkpoint

Latest completed experiment: **014 — Action Read**

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

## Run 014 research lesson
Pixel Canvas Hub's motion-first character lesson recommends readable action silhouettes, separated major masses, and black-out testing. Its silhouette-to-soul lesson frames gesture as a single dominant line of action that prevents stiffness. Wayline reinforces testing the silhouette at actual game scale before adding smaller interior shapes. Run 014 combines those ideas into a synthesis constraint: one worker is redrawn as four distinct verbs, and each verb must survive an all-ink view while preserving the compact Crew Call body hierarchy.

Sources:
- https://pixelcanvashub.com/post/dynamic-poses-strong-characters-a-motion-first-guide-to-character-design
- https://pixelcanvashub.com/post/from-silhouette-to-soul-a-stepbystep-character-design-workout-for-any-skill-level
- https://www.wayline.io/learn/pixel-art/4

## Self-critique
Sprint currently has the clearest directional force because head, torso, and leg placement agree on a forward diagonal. Lift has the clearest task because the overhead mass and centered support body create an unmistakable vertical relationship. Push is structurally useful but its forward arm/body mass risks merging into one blunt horizontal block. Swing is the most ambitious and the weakest in refinement: the raised tool direction creates useful energy, but the upper contour can still regress into the old branch/antenna problem if the tool is described too thinly. This is a more meaningful test than adding another isolated silhouette trick because several retained rules are now required to coexist in the same 16×16 figure.

Hard-fail condition: COLOR appears readable but INK loses the verb; the line of action is contradicted by limb placement; or exaggeration reintroduces false heads, false limbs, antenna-like projections, or disconnected pixel confetti.

## Plateau note
Stephen observed that the recent runs were not bad but had made no real headway. Treat 008 Crew Call as the stable humanoid baseline and do not mistake cleanliness for breakthrough. Run 014 begins deliberate synthesis. Future runs should continue asking whether multiple learned principles can coexist naturally enough that the result begins to develop a distinctive but comprehensible visual grammar.

## Next-run guardrail
Do not repeat action-verb staging immediately. Also avoid repeating large interior value blocking, side-facing direction cues, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration as isolated lessons. Prefer another synthesis pressure that changes the design problem, such as readable cloth/hair mass under motion, material identity with minimal clusters, or a functional non-humanoid prop/creature whose silhouette must communicate both identity and purpose.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
