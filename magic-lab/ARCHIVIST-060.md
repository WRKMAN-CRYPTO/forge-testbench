# Wandrune 060 · The Archivist Learns to Survive

**Focus:** Combat intelligence, not stat inflation.

## What changed
The Archivist now detects live player Arc Bolts in the ordinary, shared Matter projectile list. Each bolt's current position and velocity are used to estimate closest approach and time to impact in physics ticks. When a bolt is projected to intersect his real body, he may read its trajectory and physically sidestep. Near misses and receding, spent or motionless shots do not prompt a dodge.

His perception remains limited:
- He evaluates at most **20 actual Arc Bolts** per thought, regardless of how many enemy Ember projectiles precede them in the shared list.
- His **recognition delay is imperfect** (approximately 65–215ms, with modest reductions from observed arcane experience) and his brain remains on the existing ~120ms update cycle.
- He weighs multiple incoming bolts, arena boundaries, pillars, debris and crates when choosing between two sidestep directions. He can choose a bad route, react too late, or misjudge a gravity-curved projectile.
- Beginning an emergency dodge interrupts an unfinished cast. He cannot defend and cast perfectly at the same time.
- The visible cyan **READING ARC / EVADE** annotation identifies a real defensive response for the player.
- The dodge replaces existing motion with his **normal movement speed (2.6)**, or the already-existing low-health speed (2.25). No phase-through, invulnerability frames, instant repositioning, increased projectile damage or extra hit points.

## Unchanged by this pass
- The Archivist's **1,650 HP**, attack damage, spell invention vocabulary, imperfect cross-encounter memory and Stargate address **721360**.
- All other enemies, including Glassrunner's two dodge charges and triple dash.
- Player Arc Bolt flight, damage and gravity interactions.
- The physical 200 / 6,000-agent swarm machinery and Convergence rune.

## Test and iPhone checklist
Run the no-Phaser test suite:
`node magic-lab/archivist.tests.js`

Build 060's **15 automated checks passed**, including old region/learning/projectile tests, collision-path detection, nonthreat filtering, multiple-bolt route selection, enemy shots not masking player shots, imperfect delay, one normal-speed physical impulse and unchanged HP.

For the actual phone test, travel to **✶ ☽ ◇ ✦ ⬡ ☼**, west portal, and test:
1. Fire Arc Bolt directly at him from 300–450 world units away. Watch for cyan READING ARC and lateral movement.
2. Deliberately shoot past him. He should usually remain focused on fighting.
3. Cast two bolts with different trajectories, or curve one via a Gravity Well, and see whether his estimated safe direction holds up.
4. Compare the original Senbonku swarm (he still uses the separate swarm-avoidance reflex).
5. Test repeated encounters and confirm previous learning remains available. This patch does **not** guarantee survival against close-range shots.

Real mobile playtesting remains necessary. Unit simulations cannot verify browser frame timings, performance and difficulty perfectly.