# WRKMAN Arcane Lab 035 — In-Game Spell Forge

## Scope

Build 035 adds a fully in-game, mobile-first Spell Forge. The existing standalone Agent·Field laboratory and the magic roguelike remain distinct. No content in this pass changes the Stargate region generator, Matter physics, combat module, wardrobe, or six-slot input gestures.

## Access

1. Start the game and open **☰ → SPELL FORGE**, or open **SPELLBOOK → FORGE**.
2. Paint a 32×32 grayscale instruction field. Magenta (-1) remains unguided space; white (255) is high-value start; gray transitions; black (0) low-value sink.
3. Choose a brush or the white-to-black gradient-line brush, size, palette, Flat Hex or Leaf material, interpretation, agent population, swirl, momentum, and light.
4. Inspect the live *approximate* Canvas preview. The in-game aura uses the real WRKMAN_CRAFTED_MAGIC field interpreter, capped to 130–360 particles for phone use.
5. Optionally link a self-centered Minor Heal every three seconds.
6. **Save & Equip** sets the active recipe and its link status, and assigns **⬡ Bound Field** to wheel slot 6 if not already equipped. It uses a saved cast-time copy, not a live reference to the editor.
7. Exit the Forge and use the ordinary cast orb/wheel to activate the 14-second aura.

## Library and portability

- Local key: `wrkman-arcane-lab035-spell-library-v1`.
- Up to 24 named entries, stored as `{id,recipe,heal}` with a selected ID.
- Uses the same portable `WRKMAN_AGENT_FIELD_V1` format, with 1,024 integer `values` and `settings`.
- New Blank, Duplicate, Undo, Clear, Ring and Curtain example patterns, Save, Delete, JSON Import/Export.
- Leaving the forge auto-saves edited fields to protect touch-heavy sessions.
- **☰ → SYNC FIELD** and the original JSON import remain supported. Both add the imported recipe to the in-game library if capacity permits.
- The existing 034 key for the equipped Bound Field recipe is unchanged. Existing users retain their old active field. The default library seeds from it.

## Linked trigger scope

- Build 035 keeps the existing *one* link: while Bound Field is active, cast Minor Heal on the current player position every three seconds if its recipe has the link enabled.
- This is a single, limited link instance, not yet a general-purpose chain graph. Linking, timing, and anchors can be generalized later without coupling to field pixels.
- Recasting, traveling, and reset still use Build 034 aura lifetime rules.

## Verification

- `node --check spell-forge.js`: passed.
- Headless Chromium module tests at 852×393 and 390×844: passed with no page errors.
- Tested blank creation, custom name, white-to-black gradient stroke, Undo, save, re-open, palette, Minor Heal link toggling, Save & Equip callback, and local persistence.
- Remote GitHub source verified to include the versioned new module, menu/spellbook entrances, 034 interpreter, six-slot assignment, gate module, and sync bridge.
- The complete Phaser build and performance on a physical iPhone are not confirmed by headless module tests; conduct an in-game playtest for the final verdict.

Clock In. Build Something.
