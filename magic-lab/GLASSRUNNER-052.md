# WRKMAN Arcane Lab 052: Glassrunner Triple Dash

**Goal:** Preserve the Glassrunner's honest physical projectile evasion, while making him an aggressive hunter with a telegraphed three-dash special on a **10-second cooldown**.

## Combat changes
- **Normal pursuit:** Glassrunner now moves in toward the wizard (~120px preferred engagement) with a stronger forward component and reduced lateral orbit. The ordinary swipe is now 7 HP rather than 6.
- **Triple dash:** Starts if the wizard is ~105–385px away and the special is ready; available after a short ~3.2s initial delay. A **560ms warning** draws a triple-marker, circular tell and aimed line.
- **Three distinct launches:** Each dash is a real Matter velocity impulse, speed ~17.6 / 18.25 / 18.9. Directions snapshot the wizard's current position at **each launch**, but are **locked during each dash**. The second dash tilts slightly for a flank. No instant moves, continuous in-flight steering, damage immunity, or forced target hits.
- **Pacing:** Each dash lasts ~235ms; ~175ms gaps let the creature re-aim before the next launch. After the third dash it enters an approximately 920ms exhausted state where it can be hit. Triple-dash touch deals 13 HP, still governed by the game's normal player hit-invulnerability window. Swipe/knockback are existing mechanisms.
- **Cooldown:** The next triple dash cannot start until at least **10,000 milliseconds after the final dash sequence finishes**. This is separate from the two limited normal evasive charges and their recharge.
- **Interruption:** Stagger/frost interrupts any active triple dash, cancels pending launches, then locks out another triple dash for at least 10s after stagger ends. Existing proactive projectile dodging remains independently operational when not committed to the combo.
- **Readability:** New state labels **TRIPLE DASH!**, **DASH 1/3**, **DASH 2/3**, **DASH 3/3**, **CHAINING**, and **EXHAUSTED**; warm warning line, triple pips, blue speed trail, exhausted ring.
- **Conserved systems:** Existing Glacier/Glassrunner trajectory sensing, Behemoth mass awareness, environment obstacles, sanctuary, Wisp/Charger/Mossling/Gravelhorn, and original shared swarm physics remain untouched.

## Files
- `magic-lab/glassrunner-mind.js`: version 052 decision state machine, pursuit retuning, combo timing and stun/cooldown logic.
- `magic-lab/combat.js`: actual Matter launches, stronger swipe/combo contact, visual warning and states.
- `magic-lab/index.html`: 052 lab marker and two cache-busted script references.

## Tests
- Pure mind simulation through 19 seconds: six launches in two correct 1→2→3 chains, 10-second next-combo gating after completion, locked in-flight direction, per-dash reacquisition, and independent ordinary projectile sidestep preserved.
- Stagger interrupts active combo and applies a fresh lockout.
- Mock game-integrated 17.5-second combat run: six distinct Matter velocities, no extra combo launches; correct combo windup, gap, dash, exhausted timing; normal damage continues to apply.
- Phaser Graphics proxy verified telegraph, dash, and recovery rendering paths.
- Current game's 20 inline script blocks parse and version 052 is loaded for both mind and combat.
- Live iPhone/browser feedback is still needed for movement and balance.

**Play:** https://wrkman-crypto.github.io/forge-testbench/magic-lab/?v=052
