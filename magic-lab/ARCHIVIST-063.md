# Wandrune 063 | The Archivist: Counter-Deception

The Archivist is still mortal and fair. This upgrade gives him more accurate tactical *hypotheses*, not stat boosts.

## New combat intelligence

### Fork, the fourth tactic
In addition to PROBE, HERD and BAIT, he may invent a **FORK**. The first portion of a single legal 3–6-shot cast covers two visibly separate directions, leaving a central gap. As before, the second portion is a delayed physical COUNTERMOVE based on observed player behavior. No projectiles are added.

### He can notice reversals
During the 750ms delay after an opening gambit, he observes the player's lateral velocity relative to the boss. An actual change of sign above an ordinary 90px/s threshold is evidence of a reversal. If close enough to his planned follow-up, he may hesitate roughly 220ms before committing.

This is not input-reading. He can mistake a legitimate retreat for deception, waste valuable time, and be deceived again. **QUESTIONING BAIT** appears over his body when this occurs.

### Failed theories carry a cost
He records number of tactical attempts, actual hits and observed reversals. On defeat or retreat, unused or failed gambits lose confidence, while actual hits increase it. Only bounded information survives in the existing version-1 localStorage memory. Old memory saves default to zero reversals without migration.

## Preserved gameplay rules
- Archivist HP **1,650**
- All projectile speed and damage unchanged
- Regular rapid charge 168ms, false-tell charge 270ms
- Attack cooldown unchanged and no more than 3–6 shots per single spell
- Projectile body collision, defensive interruption, and original player control untouched
- No observation of private rune layouts or future controller inputs
- Other enemies are unchanged

## Testing
Run `node magic-lab/archivist.tests.js`.

**30 regression tests passed**: 24 prior checks plus six for two-lane fork geometry, real delay when reversing, no false reversal from standing still, bound-compatible feint memory, penalty for failed gambits, and exploration of all four tactics.

An integrated 900-step simulated encounter produced Fork, Probe and Herd physical volleys with no exception, at most six concurrent Archivist projectiles in that run, and saved his memory after defeat.

### On your iPhone
1. Travel to the Archivist gate address **✶ ☽ ◇ ✦ ⬡ ☼** (721360).
2. Repeatedly dodge a similar direction, then reverse just after the first gambit and watch for QUESTIONING BAIT.
3. Try standing in the middle of a fork instead of reflexively running to either side.
4. Use Arc Bolt to interrupt him while he is reconsidering a counterattack.
5. Defeat him, return to the archive and observe whether his next experimentation changes.
6. Contrast Arc Bolt and the 200-mass Senbonku. Difficulty and timing on mobile remain for player QA.

This remains a lightweight bounded decision system. It can recognize, hypothesize and sometimes hesitate; it is not a neural model that learns unconstrained spellcraft.
