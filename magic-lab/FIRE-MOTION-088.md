# Wandrune 088: Motion-Aligned Living Flames

**Implemented in the isolated rendering test bench.** This is an experimental VFX change only; production Wandrune's simulation, spell logic, runes, mana, combat, hitboxes, agent counts and save files were not changed.

## What was wrong

Pass 087 made small fire agents flame-shaped but left their tongues mostly upright regardless of travel. User identified that tails should point **opposite actual movement**, with stronger stretching at faster speeds, while dense fire masses must remain billowy.

## Implemented

- New `pixi-fire-motion.js` computes each existing visual fire agent's movement from its current/previous positions and scene timestamps. Tracks are keyed by `castIndex:agentIndex`, with a seed check, improbable teleport guard, backwards/long-time gap reset, 45-frame expiry and disable-reset to avoid stale history.
- The flame atlas is top-pointed (local negative Y); it rotates using `atan2(dy, dx) + PI/2`, so its **tip faces travel direction and hot root / tail trail behind**.
- Frame-rate-aware speed smoothing and shortest-arc angle interpolation avoid angular flips and jitter. Fast isolated fragments lengthen by up to 39% and narrow by up to 12%; slow/stopped agents ease back to their 087 idle flicker. Agent motion and recorded velocity are never modified.
- A cheap per-cast 28px spatial hash counts actual same-cast neighbors within 24px. Sparse agents fully express velocity; crowded fire interiors apply at most about 21% directional influence, keeping larger plasma from turning into an arrow swarm.
- The same Pixi Sprite and ParticleContainer objects are reused. No new per-agent sprites, texture generation, extra physics agents, or extra drawing layers. The prior three-plasma-mass enhancement budget is untouched.
- `MOTION: ON/OFF` button and `?fireMotion=0` enable immediate A/B comparison without changing ART, FLAMES, EMBERS, or gameplay. PIXICORE telemetry reports the number of directionally aligned flames.
- Old flame artwork can still be restored via `FLAMES: OFF`. Non-fire materials, including frost, keep their existing rendering.
- New visual tracker and cache reset cleanly during fallback and renderer shutdown.

## Tests

Twelve headless suites passed: 1,789 total assertions. Two new suites cover tail heading in all four directions, speed shaping, idle stabilization, angular wrap, cross-cast neighbor isolation, teleports, re-used agent IDs, history cleanup, 600 active visual agents across three 200-agent casts, A/B toggles, terminal alpha, and no per-frame agent sprite/particle allocation.

**Not yet proven:** realistic motion appearance and actual FPS on an iPhone. Check a few isolated fast-moving embers, a stationary flame, and 2-3 dense concurrent fire casts; switch MOTION OFF/ON while viewing the same recipe. Evaluate whether the tip direction and trailing body visibly agree with travel, without robotic darts or cluster flicker. Do not merge into the production game before the device trial passes.
