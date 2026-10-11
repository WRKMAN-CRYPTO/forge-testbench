# WRKMAN Arcane Lab 037 | One Field Physics

## Purpose
Agent·Field's v0.4 movement equations now live in the shared, dependency-free **`field-physics.js`** at the repository root. The editor, Stone Range, in-game Spell Forge preview and roguelike call the same `Motion.stepAgent` / `Motion.stepSwarm` functions. The grayscale/magenta map stays portable (32 × 32, `WRKMAN_AGENT_FIELD_V1`).

## Shared physical laws
- Out-of-bounds and magenta samples offer **no new guidance**. No invisible field boundary.
- Bilinear grayscale interpolation excludes magenta cells and renormalizes valid weights.
- Finite-difference downhill gradients, progress-dependent swirl and oscillation, acceleration, momentum-based drag and speed caps use the original Agent·Field v0.4 equations.
- Agents keep their identity and **continue drifting offscreen indefinitely**. No automatic bounce, wrap, clamp or probabilistic respawn.
- `Motion.startingCells` and `Motion.spawn` use the original high-value spawn threshold (highest grayscale minus 50) and velocity initialization.
- The shared module takes an explicit `dt` in seconds, `width` and `height` virtual dimensions, and cumulative simulation time in seconds.

## Consumers
- **Agent·Field v0.5 (editor):** `stepSwarm`, using actual canvas width and height, preserving the v0.4 editor's existing pixel-speed behavior.
- **Stone Range:** `stepAgent` at virtual 360×500 geometry, with the pre-existing animated travel frame and rock-collision model kept separate.
- **Spell Forge preview:** `stepSwarm` at 360×500, **140 agents** for phone performance. Manual **RESEED PREVIEW** starts new agents; no silent recycling.
- **Roguelike Build 037:** `stepSwarm` at 360×500, capped at 130–360 agents, with the previous implicit respawn removed. The aura/projectile/placed delivery anchors and projection, enemy/pillar collision handling, damage rules and player-centered healing link remain distinct game-layer concerns. The on-screen HUD now shows how many field agents are out of bounds.

Because the editor's physical canvas dimensions can differ from 360×500 and the game renders the field in a square world-space frame, visible *aspect ratios* can still differ. Numerical trajectories are identical for equal field data, settings, virtual geometry, time steps and random initial agents. Delivery motion is separate, deliberately.

**Practical impact:** older effects that depended on the roguelike's recycling will thin out as their particles escape; that is faithful to the laboratory. Persistent emitters can be an explicit, optional spell-design feature later, rather than a hidden alteration of particle physics.

## Backward compatibility
- Existing Forge library and active Bound Field recipe storage keys are unchanged.
- Existing `settings.delivery` and link settings survive without migration; older imports without delivery default to Aura.
- Agent·Field's field SAVE / LOAD, JSON exports, and Stone Range tabs remain available.
- Existing Spellbook, Phaser/Matter combat, character appearance, Stargate regions, and world travel are unchanged.

## Verification
- All updated JavaScript parse checks passed.
- **53,760 agent-frame comparisons** tested the shared core against the original v0.4 equations across four fields (including magenta islands and blank space), A/A+B modes, two viewport geometries, and varying frame durations. **Maximum numerical difference: 0**.
- **420 simulated game frames** across Aura, Projectile and Placed Field matched the standalone shared core trajectories, with offscreen identity persistence verified.
- Existing collision and healing checks are still required in end-to-end iPhone playtesting; this verification is not a measured iOS frame-rate claim.

_W / Clock In. Build Something._
