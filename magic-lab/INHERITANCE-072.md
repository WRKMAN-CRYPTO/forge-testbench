# Wandrune 072 | The Inheritance

The playable wizard can cast **only constructed swarm magic**. The Archivist inherits the seven old one-button combat spells. This is a deliberate role split, not a buff to the player's magic.

## Wizard restrictions

- `spell-loadout.js` now accepts only `crafted`. Old locally saved six-spell arrays safely normalize to `["crafted"]`; old spell data and forged recipes are not deleted.
- The casting engine guards against legacy spell IDs, including direct code, shortcut or stale-UI calls.
- The Spellbook and cast orb show the equipped swarm recipe. The Forge's existing 24-recipe library and Aura / World Emission / Placed Field modes remain available.
- **One recipe can currently be equipped at a time.** Equipping a different saved forged recipe in the Forge changes the next cast. A future multi-swarmed hotbar can be added separately.
- The old linked automatic Minor Heal has been disabled as non-swarm magic. Saved recipes are preserved. Healing agents are a future gameplay task.
- Maximum **200 birth agents per cast** remains unchanged; no combined limit across world casts and no new rendering restriction. Mana has not yet been introduced.

## Archivist's seven inherited spells

| Spell | Hostile-world behavior | Readable counterplay |
|---|---|---|
| Arc Bolt | Physical Matter projectile, actual 13-speed trajectory | Sidestep or use terrain |
| Gravity Well | Real shared 208-radius well lasting 4.8 seconds; bends physical objects and pulls the wizard with bounded movement knock | Escape the field or exploit its curvature |
| Kinetic Pulse | Centered on Archivist, pushes bodies, deals 8 on contact | Retreat beyond its warning ring |
| Frost Field | Centered chill patch for two seconds, slows wizard movement | Leave the cold region |
| Flame Field | Targeted lingering 129-radius flame patch lasting 4.05 seconds; threatens wizard instead of caster | Vacate the burning zone |
| Detonation | Targeted 146-radius blast, pushes physical bodies, deals 19 on contact | Move beyond blast warning |
| Spark | Uses the original `elements.js` vapor-conduction bubbles with hostile ownership; weak 7 dry / 17 wet contact | Avoid vapor networks and discharge zones |

Each ability **replaces an ordinary attack**, using the existing standard cast cooldown and a brief visual warning for area attacks. Original inventions, gambits, Edict of Motion (450 ms), memory, and movement are retained. Archivist HP stays at **1,650**. Hostile spell damage is deliberately tuned for playability rather than copying the player's old damage-to-monsters values verbatim.

The first boss attack can be inherited magic; subsequent inherited spells generally appear every third attack. The opening spell rotates with the number of past encounters, preventing rapid boss kills from showing only Arc Bolt.

## Implementation

- `archivist-legacy.js`: hostile-world spell effects, physics and tell graphics.
- `archivist-inheritance.js`: independently wraps the existing brain's new-plan choices, never overrides an already-charging attack.
- `archivist-combat.js`: delegates legacy casts and ticks while retaining Edict and invented projectiles.
- `combat.js`: skips caster-owned fire damage and ticks world hazards even during stagger.
- `elements.js`: supports hostile `discharge` with a player hit callback but no friendly fire.
- `index.html`, `spell-loadout.js`, `spell-forge.js`: enforce a swarm-only player and update the phone UI.

## Tests and playtest

`node magic-lab/archivist.tests.js`: **55 existing tests pass**.

`node magic-lab/archivist-inheritance.tests.js`: **12 new tests pass**. They cover old loadout migration, all inherited spell implementations, physical and environmental behavior, blast/wet electricity, telegraphs, normal attack cadence and encounter rotation.

A 125-second simulated arena ran with all seven inherited spells firing, plus ordinary attacks and Edicts, no runtime or syntax errors, and up to six concurrent boss projectile bodies in that run. The actual visual impact, dodge windows and phone performance need gameplay verification.

### Test on iPhone
1. Open the Spellbook: only constructed swarm magic should remain. Your saved Forge recipes should still load, with any old population over 200 clamped per cast.
2. Fight The Archivist at Stargate address `721360`, west portal. His *opening* inherited spell should change after each defeat.
3. Watch seven distinct spells, especially Frost slowing movement, hostile Flame not damaging its owner, gravity bending Matter, and Spark through vapor.
4. Verify every new area effect has a visible telegraph, and that interrupted windups cost him the planned cast.
5. Verify long-running multiple swarm emissions can still exceed 200 total agents and keep separate rendering quality.
6. Mana is intentionally deferred for the next pass.
