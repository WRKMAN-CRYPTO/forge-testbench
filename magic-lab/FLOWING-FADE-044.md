# WRKMAN Arcane Lab 044 | Flowing Fade

## Change
Agent lifespans remain independently adjustable per saved spell (0.5–30.0 seconds; 5.5 seconds default). Natural expiration now makes each hex **harmless but not stationary**. For its last 800 milliseconds it keeps its original position, velocity, progress, seed, and grayscale/magenta instructions, gradually fading while continuing to travel.

This removes the visible "freeze then dim" jump from Build 043.

## Design
- On expiration, `expireAgents()` removes an agent from live spell physics, contact, healing, and the 6,000 live-agent cap, so a spell with no live agents closes immediately.
- The selected visible hexes are *transferred as original agent objects* into a bounded, render-only fade batch. No new spawn, artificial steering, position reset, or pre-programmed fade trajectory.
- Each ghost batch retains its spell's field and settings, its existing simulation clock, and a lightweight world-space projection transform. It advances with `Motion.stepAgent()`, the unchanged canonical Agent·Field movement function, every frame during its 800 ms fade.
- World Emission and Placed Field maintain their cast anchors; Aura's visual anchor continues following the wizard during the fade. The orientation of leaf particles updates to their new world-space velocity.
- Opacity still eases toward zero and temporary agents are cleaned up after 800 ms. Fading agents are never passed into `Impacts.process()`, never heal, and never occupy spell slots or the live population budget.
- The Forge's independent particle preview uses the same `Motion.stepSwarm()` on its sampled fading agents, rather than freezing their positions.
- Rendering budgets and the global temporary fade-snapshot cap remain in place for mobile performance.

## Verification
- 41 initial regression checks across Aura, World Emission, and Placed Field passed, including exact continuity of original velocity/position under the canonical equation on the expiration frame, continued world-space movement during fade, updated Aura anchor, reduced mid-fade opacity, immediate release of live casting capacity, and complete cleanup at the fade deadline.
- Original Agent·Field movement module and per-frame swept collision module are unchanged.
- Full Phaser/iPhone runtime feel and frame rate require device testing.

## Try it
Equip a familiar Bankai swirl at 2.0 seconds of lifespan. Cast it, then watch the petals **continue turning and drifting** during their 0.8-second fade. Recast immediately while the earlier visual remnants are still disappearing.

_W / Clock In. Build Something._
