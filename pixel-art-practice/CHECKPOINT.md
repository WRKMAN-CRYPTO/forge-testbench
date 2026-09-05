# Pixel Art Practice Checkpoint

Latest completed experiment: **019 — Contact Read**

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
- 018 Anchor Drop: spend contour pixels on diagnostic landmarks that change category recognition. A protrusion or notch earns its place when removing it measurably collapses the read; otherwise it is decoration.
- 019 Contact Read: when two forms touch, reserve a tiny amount of negative space or staggered contour at the contact point so ownership of each mass remains legible. Closing those seams should measurably worsen parsing.

## Run 019 research lesson
Wayline's game-ready sprite lesson emphasizes that the silhouette must survive at actual game scale before interior detail is trusted. Animation silhouette guidance identifies overlapping limbs and closed negative space as common reasons a pose collapses into an unreadable mass. Run 019 turns that into a paired-form pixel test: HANDOFF, TUG, RESCUE, and CLASH are built from compact 16×16 character forms and tested with CLEAN seams versus deliberately FUSED contact points.

Sources:
- https://www.wayline.io/learn/pixel-art/4
- https://anim.works/silhouette-in-animation/

## Self-critique
Handoff and Clash express the principle best because the shared object/contact point is distinct while both bodies stay readable. Tug is readable, but some of that clarity comes from bilateral staging rather than the seam itself. Rescue is the weak specimen: the supported figure can still collapse into one irregular torso even with the separation notch. That weakness is useful because it shows a one-pixel gap cannot rescue bad mass organization by itself.

Hard-fail condition: CLEAN and FUSED read equally well; contact seams become decorative holes rather than separating ownership; a pair is understandable only from color/labels; or participants require enlarged stationary inspection.

## Plateau note
Stephen observed that recent runs were competent without real headway. Do not mistake technical cleanliness for breakthrough. Run 019 is a synthesis pressure rather than another isolated silhouette lesson: compact anatomy, occlusion, negative space, action, and overlap all have to coexist at the contact point. The larger question remains whether accumulated constraints become a distinct but comprehensible visual grammar.

## Next-run guardrail
Do not immediately repeat contact-seam A/B testing, diagnostic-landmark subtraction, fur/feather clumps, big–medium–small prop hierarchy, action-verb staging, exaggerated humanoid proportions, large interior value blocking, facing asymmetry, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, or asymmetrical loadout integration as isolated lessons. Prefer controlled foreshortening, readable moving machinery, multi-frame silhouette consistency, or another synthesis pressure that changes the spatial problem.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
