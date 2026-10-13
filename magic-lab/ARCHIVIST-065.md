# Wandrune 065 | The Archivist's Board

**Design mandate:** dangerous before powerful. Improve strategy, not stats.

## What is new

### Tactical board forecasting
The Archivist now uses `archivist-board.js`, a fixed-budget two-ply projection layer. Before creating a spell it samples eight legal candidate spells and evaluates each against **five plausible future reactions**:

- stay / maintain observed momentum;
- strafe left;
- strafe right;
- advance;
- retreat.

It compares immediate physical projectiles against legal two-stage gambits (opening volley + 750ms delayed counter). The geometry follows the current Matter projectile starting offset (47 world units), projectile speeds (5.9 / 6.6 / 8), projectile count, and the four currently implemented patterns. Terrain obstacles enter the evaluation as crude obstruction estimates.

The score rewards threatening more **plausible** escape routes rather than aiming blindly at the current player position. A nominal outcome that threatens all five routes is discounted because the rough model can be overconfident. None of these evaluations peek at controller inputs, future moves, private rune grids, or real player plans. All tactics can still miss.

This remains a heuristic short-horizon planner, not a general game-tree search or a learned neural model.

### Does the attack really create pressure?
Every physical attack release records the observable player position and estimated velocity. Roughly 500ms later, the Archivist compares actual movement with extrapolated prior movement.

- **Changed:** a sufficient deviation from the predicted prior line or a substantial observed acceleration.
- **Unchanged:** the player continued moving approximately as predicted.

The HUD displays **CHANGED / OBSERVED**. This does not prove the shot *caused* the change. It is evidence of post-attack motion and can have false positives when movement curves naturally.

Pressure is attributed to the spell tactic that released the projectile, not merely to the entire encounter. In later selection, small tactic-specific scores reward observed movement changes and penalize attacks after which the player continued unperturbed. Actual physical projectile hits still carry more evidential weight.

### Bounded fading memory
`pressure: {forced, unforced, observed}` is added to the existing version-1 local-memory object; old saved memories remain compatible. Tactic-specific effects are reflected in the previously bounded six saved plans. The memory remains per-browser and does not track the player elsewhere.

### Readable telemetry
Under the normal boss cognition text:
`2-PLY · 3/5 LANES · 4/7 CHANGED`

This shows **predicted** routes that a planned attack could threaten and **observed** changes after previous released volleys. Do not treat the former as actual guaranteed hits or the latter as established causal effect.

## Balance constraints unchanged
- 1,650 boss health.
- Existing damage values, movement speeds and physics.
- 168ms normal charge, 270ms deceptive charge.
- Same 3–6 projectiles per spell, with gambits dividing a single allocation.
- Original attack cooldown and existing physical dodge limits.
- No immunity, teleportation, hidden target knowledge or scripted perfect checkmates.
- Existing enemies and player controls untouched.

## Verification
Run: `node magic-lab/archivist.tests.js`

**45 passing regression tests**, including five-lane two-ply evaluation, changing forecasts with observed velocity, geometry consistency with the real projectile emitter, legal counts/speeds, distinguishing changes from straight-line movement, backward compatibility, tactic-specific feedback, and no fake pressure samples when an attack was never released.

A separate **60-second / 1,200-step simulated arena loop** ran with the boss using planner-rated attacks, observed changing player routes, and 16 attacks without runtime exceptions. The maximum observed concurrent boss projectiles was six in that simulation, and the encounter's memory was saved after defeat.

### Mobile playtest
1. Enter Stargate address ✶ ☽ ◇ ✦ ⬡ ☼ (721360), then west portal.
2. Compare standing still, circling, and purposeful late reversals. Watch the BOARD telemetry change.
3. Try two or three straight-line dodges in the same direction, then switch.
4. Compare Arc Bolt and 200-agent Senbonku using the same player discipline.
5. Keep track of whether attacks genuinely force a dash or another change, versus the `CHANGED` proxy responding to movement that would have occurred anyway.
6. Defeat him and return to verify his existing memory and preference system still work.

**Limitations:** Simulated physics and movement are approximate in the planning layer. The player can mislead his model, and real iPhone difficulty, feel and frame performance still require direct testing.
