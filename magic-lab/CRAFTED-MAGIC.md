# Arcane Lab Build 034 | Crafted Fields & Spell Links

This is the first **gameplay** integration from the standalone Agent·Field lab into the Phaser/Matter roguelike. It is a deliberately limited vertical slice, not a replacement for the existing spells or the region gate.

## Play on a phone

1. In [Agent·Field](../agent-field/), create your 32×32 grayscale field and tap **SAVE LOCALLY**, or export JSON.
2. Return to Magic Lab, open **☰**, and tap **⬡ SYNC FIELD**. You can also use **IMPORT JSON** to load an exported file.
3. Open **SPELLBOOK**, choose one of the six equipped rune slots, and assign **⬡ BOUND FIELD**.
4. Cast with the usual thumb orb. Your hex swarm forms around your **moving** wizard and lasts 14 seconds. Cast again to end it.
5. With **HEAL LINK: ON** in the game menu, a green **Minor Heal** pulse casts from the player's current position every three seconds while the field persists. Switch the link off for an unlinked field.

Without an imported recipe, the game uses a simple built-in **FIRE RING** map. The separate Agent·Field app is unchanged.

## Architecture

- `crafted-magic.js`: independent 32×32 map validator, grayscale sampler, gradient follower, runtime field agents, bounded contact damage, and one-way timer-link dispatcher. No Phaser dependency at module load time.
- `spell-loadout.js`: adds `crafted` to the library without changing existing six saved equipped slots.
- `index.html`: 034 module loader, menu recipe import/sync, link toggle, and per-frame integration with existing combat and health.

**Portable input**: `WRKMAN_AGENT_FIELD_V1` JSON, `width=height=32`, 1024 values in `[-1,0..255]`. `-1` / `#FF00FF` remains instruction-free. The same-origin forge localStorage key is `wrkman-agent-field-v1`; the game's chosen recipe is stored separately as `wrkman-arcane-lab034-crafted-field-v1`.

**First-slice limits**: 130–360 world-facing hexes per cast, drawn with game-native hex geometry; 14-second duration; 5 damage per enemy contact with a 480ms per-enemy cooldown; heal 5 HP (capped at 100) every 3 seconds when linked. The forge's pixel-identical leaf sprite material is not yet ported into Phaser; this first pass draws its vein marker on larger hexes.

**Lifecycle**: fields are cleaned up on arena reset or region travel. No infinite self-trigger loop. Changing the recipe or link affects the **next** cast, not one already active. All historical spells, saved skins/hues, six-glyph region addresses, and sector transitions remain intact.

## Tests

The module and game inline JavaScript compile cleanly. Source-level integration checks cover the menu and spellbook wiring. Isolated runtime checks exercise recipe validation, storage roundtrips, 3-second healing, expiry, and six-slot library assignment. Physical phone performance and full Phaser+Matter browser behavior still require a real gameplay test.
