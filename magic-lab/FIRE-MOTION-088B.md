# Wandrune 088b: Motion Heading Lock (Corrective VFX)

**State:** Implemented on the isolated `forge-testbench` branch `fix/wandrune-085-nonblocking-fire`. Not merged into production Wandrune.

## iPhone observation

The Pass 088 capture showed living flame sprites remaining substantially upright, swaying as they traveled rather than visually trailing. The existing motion tracker multiplied the heading angle by a speed-and-density influence as part of a blend back toward idle. Even credible movement could yield only a weak lean, especially in dense casts. The sprite's authored hot base is at the bottom and its pointed tip at the top; the screen-space directional basis `atan2(dy, dx) + PI/2` is correct for a top-pointing Pixi sprite. The failure was largely **insufficient heading authority**, not a requirement to rotate the original art 180 degrees.

## Actual changes

- In `pixi-fire-motion.js`, use the existing world-coordinate `r.trail` history as primary direction evidence. A trail point coincident with the agent, invalid, or more than 90 world units away is ignored. When the newest movement clearly opposes an older trail, the current displacement takes precedence so abrupt reversals do not point flames backwards.
- The motion angle is the **primary rotation target**. Once speed is credible (roughly 38 world units/second), moving fire locks onto its direction rather than averaging that angle with upright idle rotation. Wobble contributes only about 3.5% of the original small 087 visual angle at full lock.
- Rotation interpolation now uses a faster approximately 12ms response at confident speed and 42ms at low speed. It retains shortest-arc interpolation, keeping sudden direction changes smooth without excessive lag.
- Density affects stretch and width, but **does not weaken the heading lock**. Sparse fragments still lengthen, while dense masses remain compact instead of filling with elongated arrows.
- New identity and teleport/history handling remains intact, including cast/agent-index tracking, seed identity, stale-data pruning, zero-alpha fades, and game-to-Phaser safe fallback.
- `index.html` loads `pixi-fire-motion.js?v=088b-lock` so mobile Safari fetches the corrected module, not the previous cached Pass 088 script. The existing **MOTION: ON/OFF** button remains the immediate live A/B comparison against Pass 087 idle flames.

## Test record

Thirteen headless suites: **1,805 passing assertions**. These cover original fire cluster/perimeter/body/hot/stability, material atlas restoration, formation, camera, 200-agent bridge, original flame silhouettes, motion tracking, three concurrent 200-agent cast integration, and the new 16-assertion trail-lock regression for current direction, first-frame alignment, reversal, jitter, crowded directional integrity, stationary easing and input immutability.

Headless tests do **not** establish actual iPhone appearance, GPU frame times, or perfect animation quality. The on-device acceptance gate remains open.

## Phone evaluation

Cast a long-moving line/cone and watch the individual flames at the outer edge. Their **tips should visibly point along motion, with hot roots/tails behind them**, even when the line runs diagonally. A strong reversal should settle onto the new direction quickly, and idle flames should return to a small flicker without snapping. Use **MOTION: OFF/ON** with the same spell to compare; try a 200-agent cast and multiple concurrent casts. Report if flame bodies still point the wrong way rather than merely wobbling.

## Safeguards

No changes to Wandrune physics, inputs, hitboxes, collisions, mana, runes, spell behavior, authoritative agent simulation, 200-per-cast cap, saves, or production. Only the rendering tracker and preview cache key changed.
