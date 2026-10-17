# Wandrune 085: Fire Cohesion Pass D — Hot Core

**Status:** Independent preview branch `feature/wandrune-085-fire-hot-core`, based on the user-reviewed Pass C build. Not merged into production.

## Intent
A coherent group of fire agents already has an organic perimeter (Pass B) and a translucent red-orange/amber plasma body (Pass C). Pass D adds heat-driven visual layering **only where the existing agents actually concentrate**. No spell or physics logic changes.

## Implementation
- `pixi-fire-perimeter.js` now reuses the **same Gaussian density grid** to trace two deeper nested isovalues: **2.7** for warm yellow-amber hot regions and **4.8** for rarer pale-yellow hot spots. No extra agent simulation, no secondary Gaussian field pass. A max-density scan skips hot contour tracing for sparse groups; 2–3 agent groups do not gain an artificial hot core.
- `pixi-swarm-bridge.js` adds an independent additive-light `fireHotGraphics` layer between the translucent plasma body and the original Forge material sprites. Amber `#FFC65B` and pale `#FFF2BE` fills use low alpha, supplemented by restrained contour glows. They may split into multiple natural islands if the density does, and preserve hollow rings using nested contour/graphics cutouts.
- **HOT CORE: ON/OFF** is independent from **PLASMA BODY** and **PLASMA EDGE**. Set `?fireHot=0` to disable from startup. Original Pass B/C A/B comparisons remain available without resetting the spell.
- Existing **FIRE GROUPS** debug still works, as do the artist's original wizard skins, Hue Forge, Physics 038, camera registration, Forge art, formation rendering, and Phaser fallback.
- Mobile visual budgets remain **3 enhanced clusters** and approximately **3,500 grid sample points per frame**; all other agents and casts still render normally. Pass D shares those existing grid samples. The number of contour passes increases for dense groups, and phone performance must be tested before production release.
- `HOT CORE` telemetry shows AMBER contours, PALE contours, and hot fill count. All colors/contours are presentation-only, without gameplay meaning or damage changes.

## Test results
`node magic-lab/pixi-fire-hot.tests.js`: **43 assertions**, including near pair without a hot core, hot interior smaller than material body, pale smaller than amber, immutability of all 200 agent records, ring hollow preservation, cross-cast separation, grid budgets, independent live toggles and Phaser fallback.

Previous regressions also pass: Pass C (44), Pass B (47), Pass A (42), camera registration (19), formation (29), material art (626): **850 assertions in seven mocked suites**. These validate math and code wiring, not visual appeal or actual iPhone GPU performance.

## iPhone acceptance test
1. Launch preview in landscape; confirm the original wizard skin and Hue Forge still work.
2. Cast the 200-agent fire laser/cone. Compare **HOT CORE OFF** and **ON** while keeping Plasma Body/Edge enabled. Dense concentrations should become warmer and more luminous, not uniformly white.
3. Test a loosely dispersed swarm and a tiny pair: neither should develop an undeserved pale-hot concentration.
4. Cast a fire ring and make sure its hole remains hollow even when bright.
5. Check movement and layering against the Archivist and camera. Hot shapes must stay registered to the spell.
6. Watch frame cadence and the plasma-edge timing readout. The hot density pass costs extra contour scans; reject or optimize it if phone controls become less responsive.
7. If bad, toggle **HOT CORE OFF**; original Pass C look is immediately available. No gameplay rollback needed.

**Pass E (unstable living flame edges) stays unstarted until the player approves Pass D.**
