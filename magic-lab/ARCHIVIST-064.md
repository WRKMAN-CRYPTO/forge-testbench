# Wandrune 064 | The Archivist's Judgment

**Dangerous before powerful.** The learning superboss now considers whether an apparently inviting exchange should be declined.

## Mechanical additions

### 1. Suspicion of bait
The Archivist may decide not to cast if he observed **actual recent damage** followed by the player's unusual stillness inside roughly 360 world units. Standing still alone is not a valid trap cue, and recent damage is not inferred from initial state. The conclusion remains probabilistic.

### 2. Breaking the attack rhythm
His mind tracks whether the player began moving unusually quickly shortly before an ordinary attack opportunity (after he has already cast at least once). This can register evidence of **anticipatory movement**, rather than magically reading button presses. He may deliberately pause for 350–710 ms instead of casting on his expected beat.

### 3. Declining an exchange
When sufficiently suspicious, he:
- marks his attack as deferred instead of resetting the underlying cooldown early;
- briefly withdraws on ordinary Matter movement at the **existing speed**;
- displays **DECLINING BAIT** in overhead text, plus an amber double ring;
- emits a combat note, once per genuine refusal;
- retains no invulnerability, auto-counter, extra damage, extra bodies or special physics.

A genuine Arc Bolt dodge or emergency swarm response still outranks this behavior. He may decline only once every two attack sequences, avoiding indefinite stalling.

### 4. Observed consequences
The boss watches whether the player's motion changes after he declines. A consequential hesitation increments his observed disruption evidence; an unproductive refusal increases the 'wasted' count. Judgment retains a small fading summary between encounters:
`judgment: { anticipation, disruption, wasted }`.

Old `wrkman-wandrune-archivist-memory-v1` records are compatible without resetting previously retained strategies.

## Unchanged
- 1,650 HP.
- Projectile damage, projectile counts, element types and trajectories.
- Normal spell charge ~168ms, deceptive charge 270ms.
- Standard attack cooldown, or **longer** when he chooses to delay.
- No hidden ability to inspect player controls, private rune designs or future positions.
- Other enemies, Stargate address `721360`, and existing swarm systems.

## Verification
- **36 isolated regression tests passed.** The six new cases exercise genuine suspicious bait, no fabricated bait evidence, movement anticipation, emergency precedence, bounded persistent judgment and measurable outcomes.
- **1,200-step, 60-second simulated arena encounter passed:** six genuine refused openings, 16 released attack sequences, six maximum simultaneous boss shots in that simulation, no runtime exceptions, and saved memory after defeat.
- Browser syntax and linked script versions verified for Build 064.

## Phone QA
1. Travel through ✶ ☽ ◇ ✦ ⬡ ☼ (721360) and the west portal.
2. Fight normally for several attacks. Observe whether he sometimes stalls only after gathering evidence.
3. Hit him, then stand perfectly still and invite his response. Look for the amber double ring and **DECLINING BAIT**.
4. Repeatedly dodge just before his typical attack window. See whether he occasionally disrupts your timing.
5. When he refuses, rush in to punish the hesitation. He has **no** immunity during this decision.
6. Deliberately ignore the pause and watch whether repeated useless refusals become less attractive.
7. Return after a defeat to check that he retained part of his judgment without inflated stats.
8. Continue using Arc Bolt and 200-mass Senbonku to guard against regressions.

**Scope:** This is bounded tactical adaptation, not an unrestricted planning or machine-learning model. It can refuse moves based on evidence and learn from the consequences, but actual iPhone combat difficulty needs player testing.
