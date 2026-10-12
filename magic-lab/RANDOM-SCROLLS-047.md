# Arcane Lab 047 | Found Scrolls

## Scope
Version 047 implements **generator + Forge testing surface**, not region loot drops, inventory pickups, scroll rarity, enemy drops, or identification. These are later mechanics.

## On your phone
1. Open Arcane Lab, start the game, then open **Forge**.
2. Scroll to **03 / YOUR SPELLS → FOUND SCROLL EXPERIMENT**.
3. Tap **📜 UNSEAL SCROLL**. With a blank seed, you get a new one. Enter a seed to recreate the original scroll exactly.
4. Tap **⚄ NEW RANDOM** to get a fresh seed regardless of what is typed.
5. The new scroll is a normal editable 32×32 recipe in the 24-slot local library, **not equipped automatically**. Use the regular preview, painting tools, **SAVE & EQUIP**, or export JSON. Delete it if it is junk.

## Rules
- Pure deterministic function `WRKMAN_SCROLL_GENERATOR.generate(seed)` returns `{seed, pattern, recipe}`.
- Eight geometric starting families: FUNNEL, ORBIT, NEEDLE, FORK, SPIRAL, LATTICE, GUTTER, SHATTER. Each includes parameter variation, occasional holes/marks, and fully randomized real spell settings.
- No predefined "on hit" effects, damage promises, power tiers, rarity odds, or usefulness tests.
- Generated spells use **200 simulated agents** (the current low-cost testing baseline). Lifespan, movement settings, delivery, and cosmetic palette can vary. Settings remain fully editable in Forge.
- No physics files were changed. Every agent still runs the exact shared Agent Field 037 interpreter; field-impacts and combat are untouched.
- As always, a recipe requires the standard 32×32 array of cell values (`-1` magenta or `0..255` grayscale) and a source. Generator ensures at least one white starting cell.
- Saved library scrolls contain their seed and pattern as library-entry provenance. Replaying a seed reconstructs the **original generated recipe**, not any edits made afterward. Portable exported spell JSON remains compatible with existing normalized recipe format; the UI/library provenance is not part of export.

## Files
- `scroll-generator.js`: standalone deterministic generator, no DOM or Phaser dependency.
- `spell-forge.js`: generator UI and local library provenance.
- `index.html`: script load order and cache bust for 047.

## Validation
- 500 seeds: deterministic equality, 1,024 valid cells, generated 200-agent settings, 500 distinct geometries.
- 400 additional seeds: passed canonical `Crafted.normalize`, generated valid starting cells, spawned agents, and simulated 60 frames each using `Motion.stepAgent`.
- Forge saved-library origin round trip verified; all HTML inline scripts parsed; generator loaded before Forge.
- Browser UI clickthrough is not automatically tested.

## Next integration
Found-scroll loot pickup in regions should call this generator **once at loot creation**, store the generated seed and recipe as a persistent item, and offer study/equip/salvage separately. Do not recalculate a picked-up scroll on reload or mix it into the player's current equipped spell without consent.
