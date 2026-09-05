# Pixel Art Practice Checkpoint

Latest completed experiment: **023 — Windup Lane**

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
- 022 Machine Phase: modular movement is only a scaffold; hand-correct grid artifacts that damage thickness, pivots, joints, and diagnostic masses.
- 023 Windup Lane: anticipation is successful only when the silhouette predicts the *future hit*, not merely that effort is happening. Whole-body lean, reach, and balance should agree on attack direction before the active frame.

## Run 023 research lesson
The Rivals Workshop Community Library separates attack animation into anticipation, active action, and recovery, and argues that anticipation must be a distinct silhouette that tells the opponent both that an attack is coming and where it will hit. It also favors fast transitions between readable poses over mushy in-betweens. imonk's sword-slash tutorial independently uses anticipation, slash, and recovery key poses, with the body leaning and balancing around the windup before a fast strike.

Sources:
- https://www.rivalslib.com/workshop_guide/art/anticipation_action_recovery.html
- https://itch.io/t/2489691/pixel-tutorial-sword-slash-animation

## Experiment
**Windup Lane** is a short three-lane dodge game. A 16×16 boss randomly threatens left, center, or right. In CLEAR WINDUP, each startup pose redistributes the boss's whole silhouette toward the future hit. In MUDDY WINDUP, every startup collapses toward one generic crouch. The player has to move out of the threatened lane before the strike lands. COLOR/INK removes palette dependence.

## Self-critique
The left and right windups are strongest because torso lean, arm reach, and counterbalance all point in one direction. The center attack is weaker because a vertical threat naturally offers fewer asymmetric contour clues and risks reading as a generic crouch. That weakness is useful: an anticipation pose cannot rely on intensity alone. It must encode destination or hit region. The game is also a better pressure test than another identification card because the silhouette now affects survival before the active frame appears.

Hard-fail condition: CLEAR and MUDDY produce similar dodge success; the player cannot infer the threatened lane before impact; INK mode destroys the directional read; or the attack is readable only because of the lane highlight at strike time.

## Plateau note
Stephen observed that competent runs without headway should not be mistaken for breakthroughs. 023 adds temporal prediction: the artwork must communicate future gameplay state before the event occurs. This is a stronger synthesis pressure than simply recognizing a finished pose.

## Next-run guardrail
Do not immediately repeat attack-lane anticipation, modular machinery cleanup, tool foreshortening, four-frame locomotion tracking, contact-seam A/B testing, diagnostic-landmark subtraction, fur/feather clumps, big-medium-small prop hierarchy, action-verb staging, exaggerated humanoid proportions, interior value blocking, facing asymmetry, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, or asymmetrical loadout integration as isolated lessons. Prefer rotation consistency across viewpoints, silhouette hierarchy in a small boss encounter with multiple actors, recovery-state readability, or another synthesis pressure that changes the spatial problem.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
