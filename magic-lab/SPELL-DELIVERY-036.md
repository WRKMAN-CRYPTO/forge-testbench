# WRKMAN Arcane Lab 036 | Spell Delivery

## What's new
The in-game Spell Forge now offers a **DELIVERY** selector. Each saved 32×32 field recipe carries its delivery mode in `settings.delivery` while preserving the portable `WRKMAN_AGENT_FIELD_V1` format and all 1,024 painted cells.

- **Aura**: player-following field, lasting 14 seconds. Quick-cast with the CAST orb, as in Build 035.
- **Projectile**: a field swarm that moves toward the current aim direction at up to 410 world units/second, travels up to 520 units, and lingers at its destination until its 5.3-second lifetime ends. Quick-cast from the orb; manually tapping the arena establishes direction.
- **Placed Field**: static field anchored to a world-space target; persists for 9 seconds. Select the spell, then tap the arena location to place it.

Each mode uses the *same* grayscale/magenta field interpreter. The delivery moves the world-space center of the field but does not replace painted geometry with hardcoded projectile effects. One crafted field can be active at a time; recasting while active releases it. The cap remains 130–360 rendered hexes, depending on the recipe's requested agent population.

## Impacts and links
Individual hex positions determine enemy and existing destructible pillar contact. Contact is throttled per target; pillar damage uses the game's existing `Combat.damagePillar` physics path. Linked Minor Heal remains **player-anchored**, firing every 3 seconds while the cast is active, regardless of field delivery. No recursive chaining exists yet.

## Use it on iPhone
1. Open `☰ → SPELL FORGE`. Create or select one of your saved spells.
2. Under **DELIVERY**, choose **AURA**, **PROJECTILE**, or **PLACED FIELD**.
3. **SAVE & EQUIP**. Close Forge.
4. For Aura/Projectile, cast via the orb. For Placed Field, tap an arena location after equipping.
5. Try a Projectile against a Charger, or place a field on a stone pillar. Switch to Aura and walk through the arena to compare.

## Persistence and compatibility
- Prior Build 035 and Agent·Field exports without `settings.delivery` default to **Aura**.
- Forge spell-library storage keys, existing outfit saves, spell-wheel slots, Stargate region addresses, physics, and other spell definitions are unchanged.
- An active field keeps a cast-time snapshot, so editing or switching recipes cannot mutate it.
- Forge Save & Equip updates the Bound Field slot's cast behavior dynamically without adding more spell slots.

## Verification
- Source on GitHub: Build 036 index, crafted-magic.js, spell-forge.js.
- Automated JavaScript parse checks passed for the interpreter, forge module, and main game script.
- 33 pure-logic checks passed: mode normalization, recipe storage round-trip, start, duration, cast exclusivity, anchor movement, player-anchored healing, snapshots, expiry.
- Additional simulated collision checks passed for enemy hits and existing pillar damage in all three modes.
- **Remaining playtest**: full Phaser runtime on actual iPhone, aiming/camera placement after travel, effects under load, and visual feel of projectile swarms.

_W / Clock In. Build Something._
