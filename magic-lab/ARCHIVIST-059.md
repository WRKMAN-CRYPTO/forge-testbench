# Wandrune 059 · The Archivist

## Stargate
- **Reserved address:** `721360` → **✶ ☽ ◇ ✦ ⬡ ☼**
- Open **☰ → DIAL GATE → ✶ ARCHIVIST → ENGAGE**. The manual glyph sequence remains valid.
- The special region preserves generator v1 for all other addresses. It contains five linked arenas: The Unwritten Vestibule, Margins of Doubt, Hall of Failed Hypotheses, The Revision Gallery, and **The Living Archive**.
- The arrival vestibule remains a peaceful sanctuary. From there, take the **west** portal to the unique boss arena. The ordinary practice dummy is moved outside the combat area.
- The Living Archive contains **one Archivist**. No extra Gravelhorn, Glassrunner or Mossling spawns in the boss chamber.

## Learning boss behavior
Unlike mortal creatures, the Archivist can make defeat a learning event.

**Perception:** Observes local visible movement and a bounded sample of visible spell agents (source element is physically visible). It cannot read the wizard's rune grid, controller input, or future moves. Swarm presence near its body creates a real avoidance direction. Sampling is bounded even against 6,000 agents.

**Theory:** Learns elemental usage and directional dodge trends over an encounter, then combines them with a selectively forgotten local memory from previous encounters. Poor guesses remain possible.

**Experimentation:** Dynamically assembles bounded projectile spells from **four elements** (Arcane/Frost/Fire/Lightning), **four geometries** (Needle/Lance, Crown/Fan, Mirror/Pincer, Helix/Spiral), predictive aiming, and optional misleading telegraphs. A single cast uses 3–6 **real Matter bodies**, subject to 16 simultaneous boss projectiles and the global 35-projectile limit. Physical spells can be dodged and deflected.

**Feedback:** Successful experiments increase their selection weight. A recent unproven experiment may lose confidence. Patterns can be revisited or revised. The boss remembers some prior encounters and losses with decaying, bounded scores.

**Memory:** `localStorage`, key `wrkman-wandrune-archivist-memory-v1`. The browser retains encounters, defeats, favored observable element frequencies, lateral dodge habits, and up to six historically useful experimental plans. A retreat also leaves a partial record. Ordinary enemies have **no** persistent encounter memory.

**Boss visuals:** floating annotated pages, rune rings, inscribing / false-tell warnings, unique boss health / cognition HUD and element-colored projectiles.

## Implementation
- `region-gate.js`: single reserved address, deterministic five-arena override
- `archivist-mind.js`: bounded observation, theory updates, imperfect memory, experiments and feints
- `archivist-combat.js`: actual Matter projectile spawning, movement and painting
- `combat.js`: spawn, damage, defeat, cleanup, physical projectile impacts
- `index.html`: gate shortcut, boss HUD and instruction text
- `bestiary-data.js`: implemented creature reference
- `archivist.tests.js`: automated regression suite

### Test command
```sh
node magic-lab/archivist.tests.js
```

Regression suite covers nine scenarios: reserved address; unchanged ordinary generation; visual-only observation without rune access; evasive reaction to ice clusters; unique finite experimental patterns; fair historical windups; bounded memory after a defeat; memory from retreat; and projectile caps/physics. A simulated main combat loop also successfully ran 400 updates with five spells, painted the encounter, killed the boss, and stored its loss.

### Honest scope
This is the **first playable learning adversary**, not a freeform neural model or a complete 32×32 spell-forging agent. Its invented attacks are combinatorial physical projectile experiments, not autonomous edits to Spell Forge. That next layer can be developed on top of this perception/experiment/memory foundation.

### Phone QA
1. Open Build 059 on the phone, Enter Wandrune, dial his glyphs.
2. West exit from the vestibule → Living Archive; inspect distinct boss HUD and no ordinary mobs.
3. Bait a windup, change dodge direction, redirect shots, cast Frost/Lightning against him. Note his attack variations.
4. Defeat him and return to the Archive; the HUD prior encounter count should rise.
5. Test ordinary regions, convergence runes, 200 / 6,000 agents and the regular gate journal to ensure no regressions.
6. Check that restarting in a fresh browser/profile gives an untrained boss, while normal reloads preserve bounded memory.

**No cloud tracking or networking:** Memory is local to the device/browser, not synchronized across players.