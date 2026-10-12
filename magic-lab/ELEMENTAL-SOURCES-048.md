# WRKMAN Arcane Lab 048: Elemental Source Pixels

**Status:** Implemented and tested as an **additive first stage** of migrating elements into the programmable swarm. Existing preset elemental casts remain for compatibility and comparison. Runes are the next independent feature, **not implemented in 048**.

## The three independent dimensions

1. **Movement:** Existing `values` array, 1,024 cells of grayscale 0–255 or magenta -1. Shared motion interpreter `field-physics.js` 037 is **unchanged**.
2. **Birth element:** Optional `sources` 1,024-cell overlay, 0 = no elemental source, 1 = fire, 2 = water, 3 = frost, 4 = lightning. This layer **does not overwrite** grayscale. Marked source cells take part in starting-cell selection. White grayscale cells still emit neutral agents; on a white source pixel the marked element takes priority. Every eligible source cell counts as one birth selection, giving authors physical control of element ratios.
3. **Acquired traits (future):** Planned `runes` overlay. No rune interpreter or mutable agent traits were added in this version.

### Phone instructions
Open `magic-lab/`, start the game, open **Forge**. Five new painter controls join the existing ones: FIRE 🔥, WATER 💧, FROST ❄️, LIGHTNING ⚡, and ◌ (erase the elemental label only). Paint source pixels and run preview. Gray, white, black and magenta still retain their familiar behavior under the colored overlays.

`CLEAR TO MAGENTA`, `RING STARTER`, and `CURTAIN STARTER` reset the element overlay as well as the movement field. Precise stamp, touch drawing, pan/zoom, undo and cancel restore both layers together. The library, equipment, JSON export/import and duplicate operations all preserve sources.

### Simulation
Every agent receives its element **at spawn** and keeps it. Each agent continues to move using exactly the canonical Field Physics 037 `Motion.stepAgent`. The preview, active cast, and post-lifetime moving fade draw agents in their own elemental hues; neutral agents still follow the chosen recipe palette. There is **no particle lifetime or population change** from adding elements.

The solid-agent collision kernel aggregates elemental contacts per target/frame and gives the existing matter simulation bounded transfers:
- Fire increases material temperature.
- Water deposits liquid.
- Frost chills and contributes ice, with existing stagger cooldown.
- Lightning creates an arc flash and can cause additional capped damage influenced by wetness/ice.

Contacts still consume each contacting hex. The existing swept impact calculation, general damage caps, enemy AI and world movement are retained. No extra Phaser bodies are created for 200–6,000 agents.

### Compatibility
Old recipes without `sources` automatically normalize to 1,024 zeroes. Existing seeded random scroll geometry is **unchanged**, to preserve reproduction of any already-discovered scrolls. Players can paint elements onto those scrolls and save them as ordinary editable copies. Existing custom recipes load neutral until the player marks source pixels.

### Tests completed
- All affected module scripts and all 18 HTML inline scripts compile.
- Existing scroll generation loads with neutral sources.
- Overlay validation rejects malformed codes and lengths.
- Spawning a mixed-field 200-agent cast produces neutral and all four elements.
- Movement and aging were simulated for 120 frames.
- End-to-end collision: four differently typed agents hit an enemy; all were consumed; temperature, moisture, ice and electricity changed; elemental state survived a subsequent environment tick.
- Saved Forge library normalization preserved the source overlay and invalid data was rejected.
- Loading order verified (element module precedes crafted magic; generator and Forge compatible).

### Planned: Runes
Runes should be a *third* overlay, not reassign elemental birth or overwrite grayscale guidance. A moving agent acquires an ability **on contact**, and the acquired trait persists on that agent (subject to future stacking/rune rules), including after it leaves the tile. High-velocity agents should use swept cell traversal to avoid skipping rune contact. No rune effects should create free unlimited agents or ignore population/mana budgets.

**Link:** https://wrkman-crypto.github.io/forge-testbench/magic-lab/?v=048
