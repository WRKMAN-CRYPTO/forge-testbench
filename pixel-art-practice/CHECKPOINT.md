# Pixel Art Practice Checkpoint

Latest completed experiment: **018 — Anchor Drop**

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

## Run 018 research lesson
Wayline's game-ready sprite lesson says to establish the solid silhouette first, then cut tiny details that do not survive actual game scale. SpriteGen frames 16×16 as a very small pixel budget that must be prioritized ruthlessly. Run 018 combines those into a diagnostic-landmark drill rather than another static quiz: KEY, BOOT, FISH, and CAN fall while the player moves a catcher. ANCHORS OFF removes bow/teeth, toe/heel, tail/nose break, and handle/spout respectively.

Sources:
- https://www.wayline.io/learn/pixel-art/4
- https://spritegen.io/guides/how-to-draw-a-pixel-art-character/

## Self-critique
Key and Boot are strongest because their category identity is carried by a small number of unmistakable edge events. Fish is informative but exposes a weakness in the test: even after removing the explicit tail, the tapered body still suggests an animal or fish-like form, so its identity is distributed across more than one landmark. Can is the most binary: handle plus spout make the watering-can read, while removing them collapses it into a generic container. This suggests a useful distinction between a diagnostic anchor and a merely distinctive detail: the anchor changes what category the viewer assigns at a glance.

Hard-fail condition: the object still reads equally well after every claimed anchor is removed; recognition depends on interior color; a landmark creates false anatomy/branches; or the player needs stationary inspection rather than instant motion-scale recognition.

## Plateau note
Stephen observed that recent runs were competent without real headway. Do not mistake technical cleanliness for breakthrough. Run 018 deliberately changes both the art pressure and the game chassis: mixed-category silhouettes, pixel subtraction, and recognition under motion/divided attention. The larger question remains whether accumulated constraints become a distinct but comprehensible visual grammar.

## Next-run guardrail
Do not immediately repeat diagnostic-landmark subtraction, fur/feather clumps, big–medium–small prop hierarchy, action-verb staging, exaggerated humanoid proportions, large interior value blocking, facing asymmetry, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, or asymmetrical loadout integration as isolated lessons. Prefer a synthesis pressure that makes multiple objects interact: readable overlap, compact paired-character contact, controlled foreshortening, or machinery whose moving parts must remain comprehensible at 16×16.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
