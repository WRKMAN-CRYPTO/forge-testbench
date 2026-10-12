# Magic Lab 053 · Bestiary

The Magic Lab menu now has **◈ BESTIARY**, which pauses the arena and opens `bestiary.html`. Open it directly at `/magic-lab/bestiary.html?v=053` to edit outside combat.

## Creature roster (source-verified Build 052)
| Type ID | Display name | Actual game HP | Actual body radius | Gameplay status |
| --- | --- | ---: | ---: | --- |
| `glassrunner` | Glassrunner | 125 | 19 | Active, projectile dodge + triple dash |
| `gravelhorn` | Gravelhorn | 370 | 38 | Active, territorial charge |
| `charger` | Charger | 165 | 26 | Active, kinetic rush |
| `wisp` | Ember Wisp | 80 | 18 | Active, ranged ember bolts |
| `mossling` | Mossling | 90 | 16 | Active, neutral resident |

Names, lore, state descriptions, abilities, counterplay, habitat, tags, design notes, HP references and radius references can all be edited in the Bestiary, including on phones.

## How to work with it
1. From Magic Lab, open ☰ → **BESTIARY**. The game pauses. Search, edit any record, and return without resetting the arena.
2. Press **＋ NEW** to create a concept; or **DUPLICATE AS CONCEPT** for a variant. Concepts are not automatically added to the combat engine.
3. Changes autosave to browser localStorage under `wrkman-magic-lab053-bestiary-v1`. Use **COPY JSON** to paste the whole current roster into a ChatGPT conversation, or **EXPORT .JSON** to keep a portable backup. On another browser/device, **IMPORT .JSON** merges records by stable ID.
4. For a permanent, version-controlled addition shared by all visitors, add a DEFAULTS entry to `magic-lab/bestiary-data.js`. The stable ID must match the eventual engine `type` string.
5. To make a concept actually fight, implement its physical body, behavior, rendering and arena spawning in `combat.js` (and optional dedicated pure mind). Merely changing a Bestiary entry **cannot** alter enemy AI, damage, hp or collisions.
6. Keep the gameplay/documentation boundary deliberate. Mark an entry **IN GAME** only once its ID is in the built-in registry and it is really implemented.

## Structure
- `bestiary-data.js`: versioned roster, normalization, local persistence, merge and export schema; no engine dependency.
- `bestiary.html`: standalone mobile-first searchable/editorial UI.
- `index.html`: menu entry and pause-safe iframe overlay; same-origin close message.
- `combat.js`: authoritative runtime behavior, unchanged by this pass.

The `format` field of exported JSON is `wrkman-magic-lab-bestiary` and `version` is 1. Imported files are checked for valid IDs and duplicate IDs before merging. Default creatures are never deletable in the editor (they can be restored); custom concepts can be deleted after confirmation.

## Manual smoke checks
- In-game ☰ → BESTIARY freezes creatures, BACK TO LAB resumes without resetting spells or player.
- Glassrunner opens selected; shows 125 HP, radius 19, two dodge charges and triple dash 10s cooldown.
- Search `stone` and `crystal`, filter IN GAME vs CONCEPTS.
- Make a new concept, rename and write a special; close/reopen and refresh, confirm local persistence.
- Export and import a backup, confirm stable IDs merge without duplicating shipped records.
- Landscape iPhone: scroll roster and details independently, with no movement/CAST touches leaking to the arena.
