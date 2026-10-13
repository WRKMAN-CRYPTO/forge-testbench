# Wandrune 066 | Edict of Motion

## Why this exists

The Archivist could predict shots, but skilled players could safely stand their ground and react to every bolt. Edict of Motion creates a *static spatial obligation*, rather than increasing projectile precision or the boss's stats.

## Behavior

- Starting on a later normal attack turn, the Archivist may choose Edict instead of a usual physical volley, based on observed stillness and results of previous encounters.
- The normal 168ms casting windup still applies. It can be interrupted before the rune is placed.
- On release, a pale violet **82-world-unit** area is fixed to the wizard's observed position. The area never homes or follows movement.
- Its **850ms** ground warning uses a muted circle, eight perimeter marks and a central crossed inscription. The warning exists visually before any hit check.
- If the player remains within the circle plus a small hit radius when the timer resolves, standard `hitPlayer` applies **16 damage**, respecting dash immunity and normal hurt-invulnerability. Lethal hits still register despite automatic test-mode wizard recovery.
- Leaving the marked area entirely avoids damage. The effect resolves only once and briefly fades away. A staggered Archivist cannot place a new Edict but cannot freeze an already placed rune.
- Edict uses an ordinary attack turn and standard cooldown. It does not add extra projectiles or stack concurrent Edicts. His previous HP, walking speed and projectile damage stay unchanged.
- A bounded, fading `edict: { uses, hits, escaped }` memory influences later selection. Previous local memories are compatible.

## Source

- `archivist-edict.js` implements the static warning shape and area check.
- `archivist-mind.js` chooses the new action and records results.
- `archivist-combat.js` starts, paints and resolves the hazard through normal damage logic.
- `combat.js` ticks planted hazards before stagger processing.
- `index.html` loads Build 066 modules.
- `bestiary-data.js` explains counterplay.

## Verification

`node magic-lab/archivist.tests.js`

**52 automated tests passed** (45 existing and seven new): fixed mark, warning duration, stationary damage, escaping without damage, lethal contact, dash protection, no stacking/projectile overhead, regular action cadence, memory compatibility.

A **90-second simulated arena** completed with no runtime exceptions: 25 total boss attack decisions, four selected Edicts, normal projectile sequences retained, and no increase beyond six concurrent Archivist projectiles in the simulation. Three Edicts resolved within the observed window and the fourth was still pending at the end. Observed hits and misses were recorded in memory.

## Phone test

1. Enter Stargate address `721360` (✶ ☽ ◇ ✦ ⬡ ☼), west portal.
2. Fight normally for a few attacks. Pause your movement periodically to make an Edict more likely.
3. Watch for **INSCRIBING EDICT** before the mark appears and **MOVE · EDICT OF MOTION** while it is active.
4. Try staying inside once at healthy HP, then try leaving the area early and late. Check that the mark does not track you.
5. Repeat with low health and after dodging/dashing. Verify invulnerability and recovery work.
6. Defeat him and return. The boss should retain old learning plus an imperfect impression of Edict outcomes.
7. Re-test Arc Bolt, Senbonku and his ordinary projectile strategies for regressions.

**Limit:** Real iPhone gameplay and visual legibility remain to be verified by the player. The pure test harness cannot guarantee live-browser experience.
