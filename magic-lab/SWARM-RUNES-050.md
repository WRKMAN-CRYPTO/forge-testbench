# WRKMAN Arcane Lab 050 | Five Swarm Runes

Build 050 adds a **third editable 32×32 overlay**, `runes`, alongside the grayscale motion field (`values`) and elemental birth pixels (`sources`). It preserves all existing physics and recipe keys.

## The starting five runes

| Rune | Mark | Rule |
| --- | --- | --- |
| 1. Behemoth | ᛒ | Agents hitting the same Behemoth pixel merge into one physical agent, preserving represented mass and elemental composition. Put it directly on a source pixel to fuse all offspring from that source. In a multiple-source spell, only arrivals at that rune fuse. The simulation uses one body; game radius scales with sqrt(mass), capped. The same single agent occupies one source cell in the 32×32 field. Heavy agents resist rapid momentum change. |
| 2. Fracture | ✳ | Any agent with mass at least 2 splits into up to four children, preserving total integer mass and elemental composition, with slightly fanned trajectories. A normal mass-1 agent is unaffected. |
| 3. Impulse | ➤ | Applies a one-time velocity kick to the crossing agent. Later physics can damp/redirect it as usual. |
| 4. Seeker | ⌖ | Grants up to 2 seconds of bounded steering towards the nearest living enemy in range. The field is still being interpreted by every agent. In Forge preview, a fixed ring provides a training target. |
| 5. Phase | ◈ | Grants 2 seconds of passage through pillars, debris and other environment solids. **Enemies still collide**, ending that agent's flight. |

`× ERASE RUNE` removes a rune without changing its other pixel layers.

### First player experiment
1. Open Forge and choose a **200-agent** spell with World Emission.
2. Erase any source overlays if starting from another recipe.
3. Paint one frost source ❄️ on a white starting pixel.
4. Select **ᛒ BEHEMOTH**, tap that same cell.
5. Preview. One giant frost body holds the mass of 200 agents. Save & Equip.
6. Paint **✳ FRACTURE** several cells downstream where that body will actually travel. Try Impulse or Seeker before or after it. Place rune pixels where agents will cross, not where you merely want the effect to appear in the world.

Because a rune must be crossed and each agent remembers which rune pixels it has already activated, **spelling out geometry still matters**. A Fracture rune need not do anything if the Behemoth never crosses it.

### Architecture and conservation
- `swarm-runes.js` is a plain JavaScript module that validates the rune overlay, implements memory, sweeps trajectory through crossed cells, merges mass, shards mass, modifies velocity/targeting/phase, and provides the display radius.
- `element-sources.js` provides the actual source cell index so a rune overlapping an emitter executes during spawning.
- `crafted-magic.js` normalizes and persists runes and delegates rune operations after canonical field stepping. Mass-aware live-capacity checks count **stored agent mass**, not only body count. Live and faded Behemoths are large.
- `field-impacts.js` respects Phase and broadens physical hit radius for a giant agent. Contacting a 200-unit Behemoth consumes 200 units of mass on collision; damage is capped to remain survivable and material transfer remains aggregated.
- `field-precision-ui.js` displays rune glyphs above source colors and gray geometry, including zoom/minimap; atomic undo restores all three overlays.
- `spell-forge.js` adds a row of six rune/erase controls, preserves runes on copy/import/export/save, and uses the same rune interpreter during preview.
- `index.html` loads runes before the impact kernel, with explicit versioning and HUD displays both physical bodies and total mass.
- The shared `field-physics.js` v037 remains unchanged; original movement rules and 6,000-unit cap remain respected.
- Old spell JSON and seeded 047 random scrolls normalize without runes. You can add runes to any scroll and save your modified version.

### Tests
- Modules compile and the game's inline JS parses.
- 200 frost agents on a source-Behemoth rune become exactly one 200-mass frost agent.
- Fracture splits mass 200 to four agents of mass 50 each.
- Impulse, Seeker and Phase statuses all apply on swept crossing.
- A mass-200 frost body hits once but expends 200 stored mass and transfers frost; the target receives higher, capped impact damage.
- Phase ignores stone but still collides with enemies.
- Merging/fracturing mixed elements conserves each element's represented mass.
- No-rune older saved scrolls and the 24-slot library format still normalize.
- Browser UI needs live manual verification; preview Seeker uses a visual training target.

**Open:** https://wrkman-crypto.github.io/forge-testbench/magic-lab/?v=050
