# Wandrune 085: Cohesion Stability Patch

**Branch:** `fix/wandrune-085-cohesion-stability`. Built on user-reviewed Pass D. Production is untouched.

## Report

At approximately 600 agents across multiple fire casts, the user reported that plasma enhancement was **flickering between blobs**, not that the entire game was losing FPS. The previous VFX pass recomputed the three largest groups independently on every frame and immediately dropped the fourth group. Close cluster sizes could trade ranking continuously, so whole plasma bodies flashed on/off.

## Fix: persistent visual identities, not physics changes

New pure, renderer-only module: `magic-lab/pixi-fire-stability.js`. It records a short-lived identity for each connected fire component, using originating `castIndex` plus overlapping `agentIndex` membership. Centroid continuity is a bounded fallback, not a hardcoded fireball pattern. Merges and splits preserve the identity of the strongest one-to-one match. The actual fire agent arrays are not mutated and no gameplay systems refer to these IDs.

**Stable three-slot selection.** Existing enhanced masses retain their slots through minor changes in population. A challenger must be at least **33% larger**, sustained for **170 ms**, and the incumbent must have held a slot for at least **230 ms** before replacement starts. The incumbent then **fades out** before its slot is assigned to another. No fourth enhanced mass is drawn during handover. All unenhanced agents still render their normal individual artwork without any global cap.

**Visual lifetime.** New plasma fades in and departing plasma fades out over approximately **180 ms**. A component that temporarily disappears retains its most recently measured geometry only during that short departure fade, without fabricating a new cast.

**Heat stability.** The amber and pale-white contours share the same existing density field. When an observed hot region briefly drops below a threshold, its last contour can linger for **110 ms**, then its opacity fades over approximately **190 ms** if the density stays low. Both base plasma and heat obey their owning mass's fade opacity. This is presentation hysteresis, not a change in agent temperature, damage or collision.

**Same budget.** Maximum three simultaneous enhanced fire masses, still approximately 3,500 field samples per frame; cached departure geometry requires no new field sampling. Existing Forge textures, camera coordinate registration, restored original wizard skin atlas, Hue Forge, Physics 038, cardinal runes, combat, spell instructions and saved recipes remain unchanged.

## A/B controls

The new **STABLE FIRE: ON/OFF** switch is enabled by default on this preview. `?fireStable=0` starts with the **previous stateless top-three renderer** for immediate comparison. The independent PLASMA EDGE, PLASMA BODY, HOT CORE, ART, VFX and RENDER switches remain available.

The FIRE STABILITY telemetry reports active enhancement **SLOTS**, visual **FADING OUT**, sustained **REPLACEMENTS**, and **HELD HEAT**. This helps distinguish actual changes in group membership from slow rendering.

## Automated verification

`node magic-lab/pixi-fire-stability.tests.js`: 240 deterministic assertions including four blob sizes fluctuating around the third-place threshold for 900ms with **zero swaps**, sustained stronger challenger handoff with no fourth slot, disappearing cluster fade, cross-cast identity, threshold-dip heat retention and eventual fade, and agent immutability.

All seven previous renderer suites also pass (Passes A-D, camera registration, formation path, material fidelity). **1,090 headless assertions** total. This is math/wiring verification only; it cannot guarantee real iPhone frame cadence or graphics fidelity.

## Real iPhone release gate

1. Open current preview. Check wizard artwork and selected dyes still load, and 200-agent fire cast still forms a hot plasma body.
2. Try 3-4 blobs competing for the three enhancement slots, ideally with 600+ agents active. **STABLE FIRE ON** should prevent the whole hot enhancement jumping back and forth across different masses.
3. While blobs separate or one disappears, their visual material should gradually fade. Short threshold fluctuations should not cause amber/pale regions to blink.
4. Toggle **STABLE FIRE OFF** without changing the recipe to compare against the old sudden selection and explain whether the flickering really came from slot stealing.
5. Watch actual FPS/feel, the FIRE STABILITY telemetry, and the archived body vs hot toggle. The hot-core and shell shapes must remain on the agents as the camera moves.
6. If regression appears, immediately toggle stability OFF, switch to original Phaser rendering, or return to the prior Pass D preview. Do not merge to production until phone validation.

**Next:** Only after stable plasma is confirmed should Pass E add small living flame-edge turbulence.
