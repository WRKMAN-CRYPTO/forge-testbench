# WANDRUNE / ISOMETRIC WORLD BLUEPRINT
Version: 1 (design baseline, 2026-10-16)
Status: SPECIFICATION ONLY. No runtime, save schema, world generator, or combat code changed by this document.

> Don't learn the magic. Invent it.

## Goal and constraints

Build one believable world, not a disconnected companion game. Wandrune's authored swarm physics, existing wizard, mana system, elemental interactions, regional gate identity, controls, AI, and wildlife remain canonical.

Emotional goal: "mostly dangerous with pockets of safety and comfort. The safety feels like home." Exploration rewards curiosity, not obedience. The player's first home is secluded, with a nearby settlement. The world is mysterious, grounded, and substantial rather than a storybook map of tappable markers.

Inspirational lesson from Mega Man Legends: compact, interconnected, explorable geography with memorable everyday life above older, stranger spaces. Do not reproduce characters, assets, maps or lore.

The separate Build 081 Hearthlands page remains an exploratory discarded direction/reference. Do not port its movement engine, collision, art style or text-forward interaction verbatim into the core game. The cottage, settlement, wilderness, submerged history, and mystery are reusable concepts.

## Engine inventory verified 2026-10-16

- Primary game: `magic-lab/index.html`, Phaser 3.90 scene `Lab`, 960x600 logical view, mobile landscape controls, canvas attached to `#stage`.
- Player is presently a world-space vector `scene.player = {x,y,vx,vy}`. Camera follows `scene.cameraFocus` at zoom 0.8. Pointer conversion uses `scene.cameras.main.getWorldPoint`.
- Matter 2D handles world bodies and collisions. `WRKMAN_COMBAT` owns enemy bodies, hit resolution and many rendered combat objects.
- `WRKMAN_CRAFTED_MAGIC` is a physics-authored 32x32 swarm system. Its `worldPosition()` maps agent coordinates to canonical game x,y, and its draw path is presently flat screen-world graphics.
- `WRKMAN_REGIONS` version 1 maps stable six-glyph addresses to five connected sectors. Generator version 1 and existing address journal MUST remain undisturbed.
- `WRKMAN_WILDLIFE`, elemental VFX, mana, Archivist, skin/hue choices and recipe saves are independent pieces that must continue to work.
- The Archivist's old legacy magic already uses the same encounter space. Do not grant, remove, nerf, or alter player recipes to fit the world.

## Camera, coordinates and projection

Use a logical horizontal plane (x,y) in existing world units. Optional visual elevation z is a separate value, not a silent replacement for y or a Matter coordinate.

Draft isometric projection for normalized tile dimensions:
  screenX = isoOriginX + tileHalfWidth * (worldTileX - worldTileY)
  screenY = isoOriginY + tileHalfHeight * (worldTileX + worldTileY) - elevationPixels * z
  camera = projection of the player's ground position, with stable follow offset

Start with a 2:1 diamond where full tile width:height = 2:1. Choose tile scale from actual 960x600 phone landscape usability tests. Tile dimensions are view properties; physics remains in world units. Projection/inverse projection MUST be a tested pure module, e.g. `magic-lab/isometric-projection.js`, not scattered magic numbers in render loops.

For a ground-plane screen target (u,v) at known z=0:
  dx = (u / tileHalfWidth + v / tileHalfHeight) / 2
  dy = (v / tileHalfHeight - u / tileHalfWidth) / 2

Input: thumb / WASD direction remains screen-relative. Convert desired screen displacement through inverse projection into canonical normalized velocity BEFORE Matter/collision computation. Do not convert the existing 2D player position into fake screen-space physics coordinates. Touch-to-aim MUST invert the camera transform and the projected ground plane. Higher walkable surfaces require correct surface hit-testing (z-aware picking) rather than pretending every tap hits z=0. Physics collision/raycast and visual placement share the same canonical ground positions.

Camera:
- fixed angle (no rotation);
- soft/deadzone follow with no involuntary snap;
- no zoom UI in slice v1;
- show enough forward surroundings on iPhone landscape to read threats and route choices;
- keep agent trails and the wizard unobscured as much as possible;
- camera, screen crop and iOS device-pixel ratio must not alter simulation coordinates.

## Rendering structure

This is not a "diamond floor painted below flat Phaser sprites" feature. Visual projection must apply consistently to:
- terrain, props, structures, roofs, shadows, particles and lights;
- the wizard and equipped skin, enemies, NPCs, wildlife, hit effects and projectiles;
- authored swarm agents AFTER their physics positions are resolved;
- aimed locations, hit markers and interactive hotspots.

Canonical pipeline:
  INPUT (screen -> world) -> EXISTING SIMULATION (x,y + optional elevation state)
    -> PROJECTION (world -> screen, optional z) -> DEPTH-SORTED DRAW.

Implement a rendering adapter/layer rather than altering motion engines or each spell recipe. Existing drawing functions in `index.html`, `combat.js`, `crafted-magic.js` and `elements.js` cannot just be reused untouched in projected mode: they currently directly paint flat graphics. Pilot isolated adapters first, then systematically extend them. Preserve the top-down renderer as a regression/fallback during migration.

Rendering categories:
1. Ground: deterministic path/soil/stone tiles, material transitions, depressions.
2. Low props: rocks, low fences, roots, stairs and destructibles.
3. Midground actors: player, NPCs, wildlife and enemy bodies depth-sorted by grounded foot Y in screen space.
4. Tall structures: walls, trees, roofs and overhangs, clipped/faded when hiding player or vital threat.
5. Light/VFX and HUD: physical light footprints/projected spell materials in world space, HUD anchored to screen.

Visual occlusion design: roof fades when inside a house; near foreground tall props fade to reveal wizard and nearby dangers, not all foliage at once. Never hide a telegraph or a lethal enemy entirely behind a tree. Do not let a spell's visual draw budget change its simulation population.

Elevation is *visual only* at first. When real elevation is introduced, define explicit walkable platforms, stairs/bridges and floor-to-floor traversal rules. Do not make z collision free-floating or allow players to attack through solid floors because their 2D x,y coincide.

## Movement

- Screen-up moves diagonally through logical x,y per the inverse projection.
- Same input feel and approximate travel speed as current Wandrune, adjusted by playtest, not arbitrarily recast into another game.
- Diagonal normalization and collision slide must hold in the projected view.
- Walls, fences, cottage footprint and trees use canonical-world collision shapes (Matter static bodies or tested spatial blockers), not overlap with the visual footprint.
- Dash uses the same normalized canonical movement axis, not a visual-space teleport through walls. Gate transitions retain deterministic world addresses.
- Keyboard and two-thumb multitouch can run simultaneously; moving cannot eat the casting thumb.
- Tap casting and aimed spell placement target a WORLD point reconstructed from the projected camera and walkable surface.

## Spell integrity and readable collisions

Contract: a saved recipe produces the same agent count, velocities, runes, momentum, collisions, lifespan, damage and mana cost before/after projection, within existing deterministic constraints.

- The 32x32 field stays physically 2D. Its local cardinal directional runes still mean LOCAL NORTH/SOUTH/EAST/WEST as authored, not a distorted screen compass.
- World emissions continue to rotate local fields toward the actual world-space aim vector.
- Ground impacts/projectiles are projected as visible trajectories; visual z/lift is aesthetic unless the actual game rules define height.
- Casting never consumes an agent to draw a shadow or effect, and render budget is independent of physical population.
- The wall rune remains PRIVATE, INVISIBLE geometry in gameplay, visible in the Forge; isometric walls belonging to world architecture are different physical collision objects.
- Material-dependent puzzle logic queries actual quantities (heat, force, current, proximity, matter change), never spell names such as 'Fireball'.
- Verify one-agent Arc Bolt speed, swarms of 200, mana economy, barrier collisions, enemy dodge and offscreen VFX against top-down baseline.

## World layout: pilot slice, continuous rather than four card-like scenes

A single navigable slice with a clear physical silhouette and landmarks:

                    NORTH / OLD RIDGE
                      [sealed stair]
                           |
                root trail / bent stone
                           |
  WEST / COTTAGE -- [THORNWOOD ROAD] -- EAST / BRIARWICK EDGE
       workshop         danger                  2-3 inhabitants
       warm window      creature paths          lamps / voices
       neglected garden glades                  bakery + smithy
       strange floor    side discoveries        dry millwheel

This diagram describes adjacency, NOT final map geometry or screen orientation.

Start at cottage's front threshold. A player can go inside, see a compact workshop, walk into the danger strip, reach the village edge, and notice the old stair without any quest marker. A gate can exist nearby but should not replace walkable physical geography. Preserve the current six-glyph region navigation as a separate broader-travel system.

Home: solitary, modest and lived-in. Lighting, ambient sound and an actual return route make it recognizable. Safe by gameplay rule, not just text. Workshop supports current Spell Forge entry in future integrated build. The unusual warm soil and incomplete symbol hint at an unresolved earlier resident, do not explain immediately.

Thornwood: visibly dangerous, with real AI-driven resident creatures and at least one genuine threat. Short lines of sight, large recognizable rocks/trees, optional fork, torch or safe clearing. Threats provide readable warning and actual avoidance/collision. NOT fake nerve-only damage with decorative blobs.

Briarwick edge: start with **two interactable characters** and one ordinary functioning everyday activity, plus one optional mystery (bell or dry millwheel). Characters persist as world inhabitants; no dialogue box is required for every small clue. Safety is from social presence, light, recognizability, and absence of random hostile spawns in the center.

Old stair: one physically discoverable seam/entrance with a tangible visual clue; it does not need a completed dungeon yet. Do not reveal the answer about the cottage or the structure's purpose.

## Interaction philosophy

- Proximity and looking, not scattered hovering "EXAMINE" markers, direct attention.
- Near objects can offer a small contextual action prompt; no UI checklist of undiscovered objects.
- Investigating should have a visible or mechanical result, even small (dust moves, warmth pulses, machinery clicks, sound changes, NPC remembers).
- NPCs should communicate even when player does not talk to them: move, work, look toward approaching footsteps, react to spell disturbances.
- Some details are ordinary. A rustling bush can be a harmless creature. Mystery feels meaningful only if not every oddity becomes a campaign unlock.
- Journal logs evidence the player actually encountered, not hidden objectives or authored answers. Retain the save behavior from Build 081 only as an inspiration; do not silently overwrite or merge unrelated schema.

## Safety / danger / comfort

Home and center of settlement have no spontaneous hostiles. Safe ground has useful amenities and calm audio. The road is dangerous but not a nonstop enemy wave: the level's pressure rises where sightlines shorten and daylight recedes. Return routes are discoverable, no arbitrary invisible teleport.

Comfort should be experienced: familiar firelight, a ticking workshop, the smith working when you return, and a window in the distance. The system needs at least one credible return journey before it needs more map area.

## Technical milestones and verification gates

### Stage A: PROJECTION HARNESS (before new content)
- Pure reversible iso forward/inverse module + unit tests for center, corners, negative coords, camera offsets, arbitrary scale and tap-to-world.
- A temporary isolated iso render mode featuring wizard, one crate, one tree, one moving wildlife creature and one 1-agent emitted Arc Bolt.
- Original mode remains available; no changes to Forge saves, mana balance, combat damage or gate generator.

Acceptance: screen-up moves up; touch-to-cast hits the target; the solo bolt reaches the same canonical position/frame; no visual offset when the camera moves; iPhone landscape displays unobscured controls.

### Stage B: PHYSICAL LOCATION
- Render one cottage with occluding roof, path, trees, ground variation and constrained footprints.
- Player cannot ghost through walls or doors. Automatic visual fade as appropriate.
- Give an actual firelight/shelter difference.

Acceptance: physically walk around and into the cottage with satisfying depth and no collision contradiction.

### Stage C: FIRST LOOP
- Add dangerous forest corridor (one enemy + ambient wildlife + optional diversion), one settlement edge and a return route.
- Two reactive NPCs + one craft/work animation + one unsettling clue.
- Keep one route across the geography, not a hard reload between arbitrary arenas.

Acceptance: leave home, see danger, investigate, return home, and feel meaningful relief, on iPhone at target stable rendering performance.

### Stage D: SWARM/ENVIRONMENT
- Project all combat and VFX adapters, validate swarms/elemental events.
- One environmental reaction-based mystery trigger (not spell-name gating).
- Preserve the six-glyph route system and old encountered regions, with a new integration plan if necessary.

Acceptance: custom fire/heat, force or water spell interacts by material behavior; identical recipe physics in both render modes.

## Out of scope for the first playable iso slice

No quests, loot economy, town-building, huge procedural continent, weather cycle, day/night survival meters, NPC voice acting, save format migration, new spells, ability nerfs, asset-store dependency, camera rotation or multiplayer.

## Stop rules

Do NOT scale the prototype until:
1. moving feels like Wandrune;
2. the projected wizard and Arc Bolt look correct in the same shot;
3. physics collision matches visuals;
4. a first return to the cottage feels like coming home;
5. the world provokes curiosity without UI arrows.

A prettier map that fails any of these is a failed slice, not a reason to add more decorations.
