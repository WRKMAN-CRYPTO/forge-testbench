# Pixel Art Practice Checkpoint

Latest completed experiment: **033 — Recovery Window**

## Retained progression
- 004 Pose Relay: Carry had the strongest skeleton; Catch attached arms too near the head.
- 006 Skeleton Lock: readable pose can still fail if contour branches create extra-head/extra-limb ambiguity.
- 007 Hidden Limb: occlude rear limbs instead of granting every anatomical part its own silhouette branch.
- 008 Crew Call: compact head/torso/leg mass hierarchy improved humanoid readability.
- 009 Loadout Read: one dominant equipment mass can own the outer contour while the body remains compact.
- 010 Armory Grammar: weapon identity can be designed before shading through mass distribution along the main axis.
- 011 Gap Beasts: deliberate empty-pixel channels can clarify anatomy better than extra contour branches.
- 012 Facing Signal: direction can read from a few agreeing one-sided contour cues while the opposite side stays quiet.
- 013 Value Crew: compact human silhouettes remained readable even without explicit arms; broad interior values can carry secondary information.
- 014 Action Read: pose readability is not action readability. Push was visually strongest but read too much like jumping.
- 015 Mass Signal: **current humanoid design benchmark**. Stephen explicitly judged the sprites themselves well designed: clean head/limb count, good symmetry, clear construction, and readable labels.
- 016 Shape Stack: anvil was clearly strongest; big-medium-small organization cannot replace a category-defining contour.
- 017 Tuft Signal: Wolf strongest, Boar second. Solid believable animal mass outranked decorative texture.
- 018 Anchor Drop: a contour landmark earns pixels when removing it changes category recognition.
- 019 Contact Read: negative space can clarify ownership of good masses but cannot rescue confused mass organization.
- 020 Motion Lock: decide which identity masses are not allowed to drift before spending silhouette pixels on locomotion.
- 021 Depth Cheat: projection may be intentionally dishonest when literal foreshortening destroys semantic truth.
- 022 Machine Phase: mechanical animation is currently a stronger area. Modular movement is only a scaffold; hand-correct thickness, pivots, joints, and diagnostic masses.
- 023 Windup Lane: anticipation should predict the future hit, not merely effort.
- 024 Volume Bounce: squash/stretch may distort geometry but should preserve apparent volume and diagnostic masses.
- 025 Arc Yard: mechanical in-betweens must preserve pivots and linkage length; the path between key poses is part of construction.
- 026 Joint Lock: important anatomical attachment points can be treated as construction invariants during organic animation.
- 027 Heavy Hand: post-contact follow-through communicates tool weight; terminal tool masses need to remain distinct.
- 028 Ground Shift: grounding is relational. Keep the support foot fixed and organize body mass over it.
- 029 Phase Pack: mechanical phase discipline can organize quadruped motion, but timing cannot rescue weak species construction.
- 030 Core Beasts: remove easy appendage identifiers temporarily; strengthen torso/head/neck ratios if the creature stops reading.
- 031 Turntable Crew: viewpoint changes must preserve a mass contract across redrawn views.
- 032 Edge Tempo: contour rhythm matters at tiny scale; repeated stair-step ratios and gradual curve changes avoid accidental dents, but edge cleanup cannot replace a strong base silhouette.
- 033 Recovery Window: **recovery is state information**. A recovery key pose must remain distinct from both impact and neutral: preserve residual momentum in torso/weapon relationship, then restore compact balance only at READY.

## Run 033 research lesson
Rivals Workshop separates attack animation into anticipation, action, and recovery because each phase has mechanical meaning. It explicitly prioritizes readable, exaggerated, distinct silhouettes and warns that overly smooth transitions can make the current gameplay state ambiguous. Adobe's key-pose guidance independently reinforces that key poses carry the logic of motion and help preserve structural consistency.

Sources:
- https://www.rivalslib.com/workshop_guide/art/anticipation_action_recovery.html
- https://www.adobe.com/creativecloud/animation/discover/animation-key-poses.html

## Experiment
**Recovery Window** is a 12-encounter timing game. Four original 16×16 fighters — Cutter, Lancer, Maul, and Cleaver — cycle through READY, STRIKE, RECOVERY, then READY. The player taps COUNTER only during RECOVERY. No color cue identifies the opening; the body and weapon silhouette must carry the state.

Assets: twelve original 16×16 state silhouettes: ready, strike, and recovery for each of four fighters.

## Assumption challenge
The dangerous shortcut was treating recovery as the attack pose translated backward. That would preserve motion chronology but not communicate a distinct gameplay state. Each recovery was instead redrawn around a different mass relationship: the torso remains displaced after impact while the weapon trails or drops, and only the subsequent ready pose recenters the body.

This run does not repeat 023's anticipation-lane lesson. The player never predicts attack direction. It isolates the post-action vulnerability state.

## Test notes
- JavaScript syntax check passed with `node --check`.
- All 92 sprite rectangles were programmatically checked to remain inside the 16×16 canvas.
- The directory preserves independent localStorage keys and adds `pixelArtPracticeRating033`.

## Self-critique
Maul has the strongest recovery because the large hammer mass creates a clear trailing relationship after impact. Lancer is readable when the spear drops behind the torso, but thin one-pixel shaft cues remain fragile. Cutter is weakest: the forward torso plus diagonal sword trail can still be mistaken for a continuing attack. Cleaver sits between those extremes.

Hard-fail condition: the player must rely on timing memorization rather than silhouette; recovery reads as frozen impact; recovery reads as idle; or any fighter gains extra apparent limbs/heads while posed.

## Next-run guardrail
Do not immediately repeat recovery-window timing, attack/recovery/idle classification, contour-rhythm A/B testing, front-to-side worker matching, core-only quadruped proportion tests, quadruped phase offsets, lower-body weight transfer, tool follow-through, shoulder-lock detection, mechanical arc correction, squash/stretch volume, attack-lane anticipation, modular machinery cleanup, tool foreshortening, four-frame locomotion tracking, contact-seam A/B testing, diagnostic-landmark subtraction, fur/feather clumps, big-medium-small prop hierarchy, action-verb staging, exaggerated humanoid proportions, interior value blocking, facing asymmetry, negative-space creature carving, weapon-only mass grammar, silhouette basics, clusters, skeleton anchoring, occlusion, or asymmetrical loadout integration as isolated lessons.

Promising next pressures: front/back identity preservation; overlap hierarchy with multiple actors; readable damage/hurt poses that do not create anatomical ambiguity; or silhouette-based size/scale contrast between one hero and several enemy classes.

## Feedback limitation
Stephen's 1–5 ratings are stored with `localStorage` on his device. They are not visible to automated future runs unless a shared feedback backend is added.
