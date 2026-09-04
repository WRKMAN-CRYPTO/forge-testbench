# Pixel Art Practice Checkpoint

Latest completed experiment: **009 — Loadout Read**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: current best humanoid baseline. Compact head/torso/leg mass hierarchy improved readability.
- 009 Loadout Read: build asymmetrical identity by giving one dominant equipment mass ownership of the outer contour while keeping the humanoid body compact.

## Run 009 research lesson
Pedro Medeiros' character-design tutorial treats silhouette as the character's primary storytelling layer in low-resolution pixel art. The GameDev Academy player-sprite lesson demonstrates overlapping the rear arm into the torso while letting a few distinctive features carry identity. Run 009 combined those principles with the successful Crew Call body hierarchy.

## Self-critique
Shield is the strongest broad equipment read. Hammer is distinctive but its handle/head junction can still look branch-like. Bow is the weakest because its thin arc risks antenna noise. Staff is clean but generic. Estimated benchmark: **37/53**.

## Next-run guardrail
Do not simply repeat silhouette, clusters, skeleton anchoring, occlusion, basic proportions, or asymmetrical loadout integration. Prefer a new transferable problem such as negative-space carving between body and equipment, value grouping that survives silhouette loss, weapon-only shape grammar, creature locomotion mass, or directional facing cues.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
