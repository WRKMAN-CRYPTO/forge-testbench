# WRKMAN Arcane Lab 038 | World Emission

## Goal
Stop making a canned moving projectile that carries a painted particle field from point A to point B. Give spell authors the **exact canonical Agent·Field movement engine inside the game world** so that painting instructions creates the behavior, rather than choosing a prefab behavior.

## Three delivery modes
- **Aura:** a field anchored to the moving wizard (14s).
- **World Emission:** an independent cast from the wizard (22s). Each agent gets its own world position and physical history; the field frame stays at its launch origin. There is **no moving box, target homing, midpoint interpolation, teleport, wrap, respawn, or redirected individual velocity**.
- **Placed Field:** a field anchored where the player taps (9s).

Previous saved Build 036 recipes with `settings.delivery="projectile"` automatically normalize to `"world"`. The existing 32×32 JSON format, field values, palette, material, swirl, momentum, mode, and local storage keys are unchanged.

## How World Emission maps your instructions into the world
1. Find all highest-value white/grayscale starting cells using the canonical start-cell calculation.
2. Use the **center of those starting cells** as the casting origin. Your painted pattern is not forced to spawn at the center of the grid.
3. Place that origin a little ahead of the wizard and orient the map so **positive Y (DOWN in the 32×32 editor) means FORWARD along the player's aim**. Horizontal instruction motion maps perpendicular to aim.
4. Simulate each independent `Motion.spawn()` and `Motion.stepSwarm()` agent with the same 360×500 reference dimensions as Agent·Field's Stone Range.
5. Convert its unmutilated `x,y` field coordinates into immutable world-frame positions. Agents that escape magenta/offscreen areas remain present and continue along their own momentum.

This **does not add artificial forward acceleration**. A recipe that heads right, curls back, drifts, or refuses to travel will do exactly that. Paint top-to-bottom instructions to encourage forward emission. A ring may start with particles spread around the casting point; this is a consequence of the saved pattern, not a preset.

## Full simulation, separate rendering
- The game now simulates **the exact requested population**, 200, 600, 1,200, 2,400, or 6,000 particles. No hidden 130–360 cap remains.
- `settings.renderLimit` sets an independent visibility budget (600, 1,200, 2,400, or 6,000). All particles still participate in movement and contact checks, even if not all are drawn.
- Agents have short history trails, with flat hex and oriented leaf renderings. **Rendering is improved, but not pixel-identical** to Agent·Field's cached Canvas2D leaf sprites.
- The live HUD shows concurrent casts, simulated agents, particles actually drawn, and offscreen agents.
- On-screen rendering culls particles outside the camera's current world view.
- The Forge preview has 360×500 reference geometry and its own optional 140–6,000 simulation budget; at very high preview populations it draws a subset.

## Concurrency and gameplay
- Up to **three independent World Emission** casts may coexist; Aura or Placed Field may coexist with them.
- Maximum **6,000 total active simulated agents** at once, across all crafted casts, to protect mobile performance. If this limit is reached, casting is rejected explicitly rather than deleting or replacing existing particles.
- Each World Emission lasts 22 seconds before cleanly expiring. It does not spawn more agents after the initial cast. A future programmable emitter can be a separate mechanism.
- The game's damage and contact model remains an outer layer. All simulated agents are eligible for checks, which are throttled to about 10 Hz per cast to avoid one Matter body per hex.
- Independent linked Minor Heal still pulses at the **moving caster**, regardless of where the emitted agents fly.
- Switching regions or resetting clears all active crafted spells but does not delete saved recipes.
- **Known limitation:** performance for 2,400 or 6,000 live particles needs direct iPhone playtesting; scene-composition costs are device-dependent. High visible-agent budgets and multiple casts can be expensive.

## Testing and fidelity
- Build 037 already compared **53,760 agent-frames** with the original Agent·Field equations with zero numerical difference. Build 038 continues to invoke that same unchanged physics module.
- Pure module tests for Build 038 cover: old-projectile migration, full 6,000-agent simulation, separate render budgets, stationary independent world origins, agent trajectory parity, up to three world casts, coexistence with Aura, 6,000 total cap, caster-centered healing, and cleanup on expiry.
- Verify actual game controls, rendering, and frame rate on an iPhone before claiming performance parity.

**Suggested first test:** paint a thin white band at the *top* of the field, shade it toward black below, and leave the rest magenta. Select World Emission, 1,200 simulated and 1,200 visible, then cast while aiming right. Compare the spreading stream to Agent·Field at the same field settings.

_W / Clock In. Build Something._
