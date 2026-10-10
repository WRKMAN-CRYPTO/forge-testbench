# WRKMAN Agent-Render v0.2.1 · Scroll-safe Focus Engine

A phone-first experimental 2D renderer in one self-contained HTML file. Hexagonal rendering agents sample an independent procedural scene or an imported image. Larger agents provide coverage; smaller agents split to refine details, drift locally, and can merge back when appropriate.

Open `index.html` in a browser, or try:
https://wrkman-crypto.github.io/forge-testbench/agent-render/

## Focus controls

- **Refocus**: collapse the current swarm to the existing root hexes, dim coarse color estimates, and allow actual sampling and splitting to rebuild the image.
- **Rebirth**: reconstruct a new coarse population with randomized starting positions.
- **Settle**: accelerate the remainder of the current focus sequence; when already focused, hold or release the image.
- **Pulse**: after the current focus completes, wait about 13.5 seconds and repeat a gentler refocus. Toggle it off to stop looping.
- **Hold image when focused**: stop scene time and agent updates after the focus sequence reaches completion. Incompatible with Pulse.
- **Pause**: stop/restart animation manually. While held, the same button releases the hold.

Also includes adjustable detail threshold, population budget, freedom, wireframe, reference view, compare view, and file import. No network or runtime dependencies; local image import stays on the user's device.

## v0.2.1 mobile scroll fix

- The stage now uses `svh` (stable viewport height) rather than `dvh`. iOS Safari address-bar movements cannot repeatedly resize the scene.
- Actual geometry changes preserve the agent population, split lineage, RGB estimates, focus progress, and held/paused state. Only first startup initializes a new swarm.
- Vertical touch gestures can scroll the page. A tap or sideways gesture intentionally disturbs the swarm.

## Architectural boundary

This is a rendering experiment. The procedural flower or uploaded image exists as an independent sample source. Rendering agents do not control object simulation logic.

## Notes

- Coarse root agents are retained to prevent empty regions. Root count may be greater than an unusually low population budget on large screens.
- Focus progression is a scheduling heuristic, not an independently measured picture-quality score.
- The result is an adaptive painterly approximation, not a mathematically exact recursive hex tiling.