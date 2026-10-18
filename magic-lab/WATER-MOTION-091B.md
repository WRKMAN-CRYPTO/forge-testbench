# Wandrune Pass 091b: Water Heading Correction + Motion Stretch/Smear

**Status:** Implemented on the isolated VFX test bench branch `fix/wandrune-085-nonblocking-fire` only. Do not modify production Wandrune without on-device approval.

## Why

The 091 iPhone capture showed water droplets whose rounded tails appeared to lead their travel. The user confirmed that the existing 32×32 spell map's **DOWN means FORWARD** world-emission behavior is intended. Existing `crafted-magic.js` correctly projects drawing-space velocity into player-facing world-space and passes `record.angle = atan2(worldVy, worldVx)` to Pixi. The simulation/world transform must remain unchanged.

## Implemented rendering-only

- **Visual 180° correction:** `pixi-water-vfx.js` rotates drop poses with `record.angle - PI/2` instead of `record.angle + PI/2`. The visual point should now lead and its rounded volume trail. The original 091 droplet texture is retained.
- **Speed responsive stretch:** A renderer-only per-agent position/time tracker (keyed by `castIndex:agentIndex` plus agent seed) measures world-space travel. Smooth interpolation prevents abrupt elongation. At high speed, drop height increases by up to 52% and width narrows by up to 18%. When slowing/stopping, shape relaxes. Teleports, stale frames and recast identity resets cannot create very long streaks.
- **Short, tapered motion smear:** The original water trail effect (`WATER STREAMS`) is preserved untouched; separate `WATER MOTION` draws at most 72 additional **short** two-stroke wake marks, behind measured water velocity, using one already-existing water Graphics layer. No extra agents, no particle texture allocations, no collision or spell modifications, no trails joined between separate agents or casts. Wakes are suppressed for slow or invisible/faded records. They end at the droplet and fade behind it.
- **Three independent A/B switches:** `WATER DROPS` still toggles the original canonical material versus the droplet art; `WATER STREAMS` enables longer real path ribbons; `WATER MOTION` enables short smear + speed stretch (with `?waterMotion=0` to compare motion off). The 180° visual correction stays in effect on the droplet when WATER MOTION is switched off. 
- Fire flame direction, plasma group rendering, frost/ice, lightning, cameras, agent counts, actual spell velocities, and launch controls remain unchanged.

## Verification

**16/16 headless test suites passed, 2,002 total assertions.** Water test has 60 assertions including rendering 200 mixed-element agents, speed stretch/narrowing, true 180° corrected water orientation, negative travel-tail positions, 600 synthetic moving water records within the 72-smear cap, stop relaxation, teleports, cast seed reset, toggling WATER MOTION while keeping WATER STREAMS active, recovery without a false first-frame streak, original water fallback, correct fades, batching, zero added sprites/textures per frame, and unchanged source records.

The remaining gate is actual iPhone observation: test a solo droplet or a radial 200-agent spray, then compare WATER MOTION ON/OFF. Confirm **point leads, short smear follows**, stretches grow with speed and shrink when stopped, while touches and FPS remain comfortable. None of these headless tests certify native mobile GPU appearance/performance.
