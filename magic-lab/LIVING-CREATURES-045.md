# WRKMAN Arcane Lab 045 | Living Creatures

## Experiment: resident first, opponent only if provoked

The first test subject is a **Mossling**, a neutral, physically simulated creature. It is **not** a charger/wisp with an extra attack routine. It has a home range, independent wandering, sensory response, short-term memory of hazards, and a defensive reaction only under threat.

The sanctuary retains **zero hostile spawns**, but a Mossling can be observed there. Other explored arenas also gain one Mossling placed away from the entrance and existing encounter spawns. The original charger/wisp enemies and the smaller autonomous ants, moths and pillbugs remain.

### Creature states
- **GRAZE:** explore a local home radius; periodically change wandering destinations, without targeting the wizard.
- **CURIOUS:** investigate sufficiently close mild spell disturbances, keeping distance when it arrives.
- **WARY:** if the player gets too close, pull away. No automatic attack or global hostility.
- **FLEE:** run from loud explosions, nearby charging enemies, or recent injury; critically injured creatures remain cautious.
- **DEFEND:** if recently hurt and then cornered by the wizard, deliver a small defensive nip, with cooldown, and resume fleeing.

State decisions run around 10 Hz, while Matter.js inertia, collision, and environmental impulses remain active continuously. The label above the Mossling shows its current state; it has no enemy-style HP bar until actually hurt. Mosslings do not increase hostile kill counts or block the "hostiles cleared" message.

### Sensory signals
`WRKMAN_COMBAT.stimulus(scene,x,y,kind,power)` registers short-lived positional disturbances with bounded memory. Casting ordinary spells emits milder sounds/light disturbances. Detonations, lightning, and chain blasts generate stronger danger signals. A Mossling senses an event only if it occurs nearby and is recent; it cannot know every spell the wizard casts on the map.

Combat hits call `WRKMAN_CREATURE_MIND.injured` with the immediate source location. Threat memory decays, so panic is not permanent. The creature may be injured or killed by real game magic but does not initiate attacks just because it exists.

### Implementation
- `creature-mind.js`: portable decision engine independent of Phaser, DOM, or rendering.
- `combat.js`: physics integration, spawns, explicit world stimuli, damage response, colored moods and single scene-text mood badge.
- `index.html`: load behavior before combat and register player spell casts as disturbances.
- Existing Agent·Field engine, custom spell Forge and World Emission are unchanged.

This is **reactive autonomous behavior**, not long-term learning or evolved intelligence. Future passes could add hunger, nesting, communication, individual memory across arenas, pack behaviors, and predator/prey relations. This pass intentionally avoids global enemy aggro, artificial spawn waves, or adding 18 extra physical bodies.

## Try it
1. Open Arcane Lab 045 and choose **ENTER THE LAB**.
2. Explore the **arrival sanctuary**. Look for the small green creature with a mood label. It should wander even if you leave it alone.
3. Cast an ordinary spell nearby, but not directly onto it. Look for **CURIOUS**.
4. Detonate near it and look for **FLEE**. Try walking close with no attack and look for **WARY**.
5. Only if you want to test combat, hurt it and approach very closely. It may **DEFEND** while cornered. It is possible to kill the Mossling, so RESET to bring back the resident.
6. Travel through the Stargate. Hostile regions retain ordinary encounters plus a neutral resident.

## Verification
- Pure decision tests confirm nonaggressive grazing, peaceful warning, spell curiosity, explosion flight, injury retreat, conditional defense cooldown, response to charging predators and finite movement commands.
- Integration mock tests confirm a neutral sanctuary spawn, no hostile counter increase, state labels, physical stimuli, injury memory, state transitions, cleanup across arena resets, and bounded sensory events.
- Full Phaser/iPhone frame-rate and play-feel are **not** yet device-tested.

_W / Clock In. Build Something._
