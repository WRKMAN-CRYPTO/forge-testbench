# WRKMAN Arcane Lab 046 | The Gravelhorn

## Stronger enemy, not a stronger script

The **Gravelhorn** is a solitary, heavy, territorially defensive creature. It patrols and watches its own home range rather than chasing the wizard across the map. One appears in each non-sanctuary regional arena, away from the entry and other placed enemies; the original standalone laboratory also has one near the far side. The arrival sanctuary stays free of hostile spawns, with the neutral Mossling.

### Distinct creature attributes
- **370 health**, 38-unit Matter body radius, high physical density, armored stone hide.
- Recognizable gray armored body, split horn crest, warning ring, aim line, body glow on charge, and a real health bar.
- Behavior labels: **PATROL, WATCH, WARNING, BRACING, CHARGING, RECOVER, RETURN**.
- Bracing reduces crafted-petal damage to 46%; other stances retain 73% of crafted-petal damage. Other normal damage applies.
- A committed charge inflicts 27 HP on contact, subject to the existing player-invulnerability rules, while a warning shove is weaker.
- When damaged below 38% health, the creature performs shorter windups and faster charges. It remains governed by the same territory rules.

### A short physical story
1. **PATROL**: leisurely wandering within approximately 110 units of the original den. No automatic global hostility.
2. **WATCH**: notices nearby disturbances or an approaching intruder.
3. **WARNING**: pauses and faces the intruder as awareness rises.
4. **BRACING**: clearly telegraphs a direction for about 720 ms (550 ms when wounded). The aim is locked before the warning line is drawn.
5. **CHARGING**: a single actual Matter Body velocity impulse begins a 850 ms rush. The player can dodge; the beast does **not** correct its course toward the wizard during its rush.
6. **RECOVER**: its decision system pauses attacks after a committed effort.
7. **RETURN**: once physically displaced more than ~190 units from its den, it aims to return. Leaving its territory stops escalating pursuit.

No artificial teleport, auto-targeting during the charge, invisible range damage, or perpetual arena-wide aggro.

### Other creatures interact
- Charging Gravelhorns frighten nearby Mosslings.
- Charge disturbances are signaled to the area's auditory/environmental event list.
- Physics body collisions can jostle or hurt other creatures, without adding per-agent collision bodies.
- Existing small wildlife, Mossling, Charger, Wisp, and Agent·Field engine are unchanged.

### Code
- `territory-mind.js`: independent seeded patrol and perception/attack decisions, no Phaser, browser or network dependencies.
- `combat.js`: sole heavyweight Matter body, per-frame forces, cooldown-controlled shock, rendering, hit awareness, and state badge.
- `index.html`: loads the new mind before the combat engine. All existing spell saves are unchanged.

### First playtest
1. In the sandbox's original laboratory, travel toward the **far-right portion** of the map to find a Gravelhorn. In Stargate regions, the **arrival sanctuary** stays peaceful; travel to another arena to find one.
2. Approach slowly. Observe PATROL → WATCH → WARNING.
3. Enter closer, watch **BRACING** and the long projected charge direction.
4. Move sideways during the warning and confirm that CHARGING proceeds in its **locked** direction and can miss.
5. Try a Bankai or other crafted swarm. The heavy beast withstands more damage while bracing. Observe RECOVER and RETURN when moving away.

### Tests
- Pure decision tests: wander with no wizard, escalation on intrusion, locked attack direction across sidesteps, one-time launch, recovery, retreat to territory, wounded reaction, finite patrol intents.
- Mock physics integration: regional and sanctuary spawns, HP/mass, readable labels, valid attack timings, only one Matter launch impulse, no repeated charge steering, cast damage and reset cleanup.
- JavaScript syntax and GitHub module dependencies checked. The actual running Phaser browser and iPhone frame rates are **not yet device-tested**.

_W / Clock In. Build Something._
