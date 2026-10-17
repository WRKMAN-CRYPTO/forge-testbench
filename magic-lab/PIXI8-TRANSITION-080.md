# WANDRUNE 080: PixiJS 8 rendering transition · phase 1

**Status:** Isolated feature-branch preview. The production `main` branch has not been modified.

**Preview:** https://forge-testbench-git-feature-wandrune-pixi8-swarm-wrkmanf-orge.vercel.app/magic-lab/ (branch alias if assigned), or use the exact deployment preview URL returned by Vercel.

## Architectural decision

Wandrune is not just a sprite game. Its current Phaser 3.90 scene and Matter world handle collision bodies, the moving camera, phone touch aiming, player skins, the Archivist, projectiles, wildlife, regions, and stage scaling. Removing Phaser all at once would be a gameplay engine rewrite.

Instead, port **only the core authored-swarm visual pass** to PixiJS 8 first. The data flow is:

`Phaser + Matter + WRKMAN_CRAFTED_MAGIC physics => crafted draw(view-only) => PixiJS 8 transparent overlay`

A bridge receives final world positions, colors, display radii, element IDs, and angles. It cannot mutate the agent objects. No rendering API is ever called from field physics, combat, mana, recipe saving, or rune code.

### Current boundaries

- PixiJS 8.10.0 handles **active crafted swarm visuals and fading agents**.
- Approximately 10% get richer full Sprites (with large behemoth agents prioritized); remaining visuals use three procedural texture groups per element in ParticleContainers. This is a rendering heuristic, never a simulation limit.
- Phaser still draws the floor, player, enemies, projectiles, region gates, gameplay feedback, some crafted trails and focused accents, rings/healing/impact overlays, native sprites, and HUD. These can be migrated in later independent steps.
- The Pixi overlay is transparent, pointer-events:none, camera-matched using the actual Phaser camera inverse and Phaser canvas bounds, and follows phone FIT/ENVELOP crop.
- The game's existing canonical per-cast 200 **agent birth** limit is untouched. The renderer has no global cast cap.
- No saved keys, input mappings, spell recipe formats, mana, Essence, runes, damage, enemy logic, physics bodies, or world coordinates changed.

### Fallback

- The game menu contains a **RENDER** control to switch between new Pixi visuals and original Phaser crafted visuals without touching gameplay.
- The URL `?renderer=legacy` starts the identical branch in original renderer mode.
- If PixiJS fails to download, initialize, or draw, only the optional overlay is disabled. The game continues drawing the original crafted pass at the next frame.
- The existing `?renderer=canvas` Phaser diagnostic remains functional; no change was made to how the Phaser game is created.
- The main branch remains on the pre-migration version.

### Verification before considering release to main

1. On an iPhone in **landscape**, load the new preview, wait for the menu to say Pixi ON, and check that the wizard, terrain and crafted swarm align while moving and aiming.
2. Hold the left-thumb joystick while casting with the other thumb. Verify no duplicate casts, lost gestures, altered aim, or incorrect camera positioning.
3. Compare `?renderer=legacy` and Pixi for Fire / Frost / Lightning / Water / Arcane and mixed-element sources, Behemoth/Convergence, and long fading agent trails.
4. Verify hits, Archivist combat, healing effects, mana charging, object collisions, and region transitions still behave exactly as before.
5. Switch renderers mid-combat via the game menu; FPS changes can be expected but no gameplay state should reset.
6. Test rotation FIT/ENVELOP scaling, test Pixi CDN unavailable fallback, and confirm saved spells/skins/audio are unaffected.
7. Run offline tests: `node magic-lab/pixi-swarm-bridge.tests.js` plus established Wandrune regressions.

This is **phase 1**, not a claim that all Phaser rendering has already been replaced. Subsequent rendering migrations must preserve rollback paths and independently test the actual game.
