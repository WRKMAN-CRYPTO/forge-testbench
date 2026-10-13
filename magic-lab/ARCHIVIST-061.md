# Wandrune 061 · The Archivist's Gambit

## Design mandate
**Dangerous before powerful.** The Archivist's 1,650 HP, walking speeds (2.6 and 2.25 when low on HP), projectile speeds, damage values (Arcane/Fire 13, Frost 11, Lightning 15) and original attack cooldowns have not increased. Real Matter bodies can still collide, be deflected, and be evaded.

## Learned tactical attack vocabulary

- **PROBE**: The original entire physical volley. The Archivist continues experimenting with direct formations.
- **HERD**: Bias an opening volley away from the side he believes the wizard prefers to dodge toward. The goal is to leave a tempting escape route, not auto-damage the player.
- **BAIT**: Repeat a familiar-looking attack while withholding part of its physical projectile budget, then counter the observed dodge.

For HERD and BAIT, one attack with 3–6 projectiles is split into:
1. **OPENING GAMBIT:** Roughly half of the ordinary projectile count launches after the existing spell windup. The main aiming point is locked at the observed windup target; the opening lane is biased based on remembered lateral dodge habits.
2. **READING ESCAPE:** For 750 milliseconds the Archivist attempts to infer the player's landing direction from visible positional movement. An amber projected target ring provides a readable player-facing warning.
3. **COUNTERMOVE:** The remaining projectiles launch toward his estimate. He doesn't know future player inputs. If the player changes direction, holds position, curves projectiles, or obstructs the path, the plan can fail.

The second volley **does not** increment the attack counter or shorten the base cooldown; the opening and counter combined never exceed the originally chosen count. If a real incoming Arc Bolt forces emergency evasion during the plan, the boss can forfeit the counterattack.

### Learning
Tactical scores attach to a combination of element, motif, and the strategy used (probe / herd / bait). Successful physical hits improve that choice's next-selection score; an unproven last plan can be demoted after defeat. Only six bounded plans persist. Existing browser memories without `tactic` are automatically treated as `probe`, preserving prior observations.

All decisions depend on observed positions / velocities, retained imperfect tendencies and ordinary physics. There is no access to the player's next input, rune grid, or other hidden intention.

### Feedback
- Boss overhead text: `READING ESCAPE`, `COUNTERMOVE`, plus previous `INSCRIBING`, `A FALSE TELL`, and `READING ARC / EVADE`
- Combat log: `ARCHIVIST OPENING GAMBIT` and `ARCHIVIST COUNTERMOVE`
- Amber predicted landing ring: a *theory*, not a guaranteed hit indicator.

### Tests
`node magic-lab/archivist.tests.js`

**21 regression tests passed** including old combat and memory tests; stage-budget conservation, both trap stages using Matter projectiles, preserved damage values, changed escape directions changing the aim, tactic-specific saved scores and older memory compatibility, and the original attack cooldown.

**Additional integrated simulated arena loop:** 600 combat updates, seven boss attack sequences, 12 opening-phase projectiles and 10 counter-phase projectiles, peak six simultaneous boss projectiles, no runtime exceptions, successful defeat and cross-encounter memory increment.

### Manual iPhone QA
1. Travel to ✶ ☽ ◇ ✦ ⬡ ☼ (code 721360), west portal.
2. Keep dodging consistently in one direction for a while. Watch whether he begins using the route as a hypothesis.
3. Let him establish an opening gambit, then suddenly reverse your preferred dodge. Test whether the amber counter prediction becomes wrong.
4. Stay still when he expects you to evade, to test a false assumption.
5. Use Arc Bolt to interrupt a pending trap and see whether he prioritizes defense over his counterattack.
6. Fight again after defeating him. The game should retain some tactic preferences, without increasing his stats.
7. Repeat with Senbonku (200 agents). Confirm all swarm and existing Convergence physics remain untouched.

This is a **bounded tactical adaptation**, not an unrestricted AI strategist. Real-device difficulty and readability are not proven by simulated tests and need player testing.