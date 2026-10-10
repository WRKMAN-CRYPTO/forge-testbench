# WRKMAN Agent-Render v0.4 · 16K Stress Test

Mobile-first experimental adaptive hexagonal-agent renderer. No sprite sheets: agents independently reconstruct either a procedural flower or an imported image by sampling a separate reference scene.

## Launch

Open `index.html` directly in a browser. No build step, server, network connection, or dependencies. For GitHub Pages use `agent-render/index.html`.

## v0.4 changes

- Raise adjustable **Agent budget** from 2,200 to **16,000**.
- When budget is at least 6,000, unlock an additional generation of micro-hexagons, with radii below 1 CSS pixel.
- Population-aware simulation cadence: 30, 20, 15, or 12 updates/second depending on population.
- Stagger expensive scene sampling across cohorts at large populations (half, third or quarter of agents each update); preserve last sampled colors between updates.
- Cap high-density rendered redraws to avoid using every animation frame at 16K; FPS readout reflects actual redraw rate.
- Bound population growth per simulation step; accelerate births for large requested budgets.
- Cache the painter's layer order until the topology changes, instead of scanning the full agent set five times per draw.
- Keep v0.3 Edge priority, EDGES inspector, reconstruction focus sequence, image import, and scrolling protection.

## What to test

Import a high-resolution logo, set Detail hunger and Edge priority high, then raise Agent budget progressively to 16,000. Compare Agents and Truth. Watch measured FPS and device temperature. Switch back to a small budget if interactions begin to lag.

**16,000 is a cap, not a guarantee of 16,000 visible agents in every image.** The renderer splits where its local evidence warrants new detail. Expect frame rates to drop when tens of thousands of tiny shapes are drawn. Actual phone performance varies by device and browser.

## Verification (desktop Chromium mobile emulation)

- Imported lettering stress fixture reached **15,998** live agents at 100% detail/edge settings, without script errors.
- Rendering averaged about **15 FPS** at that density in emulation, which is not a claim about real iPhone performance.
- Reducing Agent budget to **220** retired excess agents and allowed browser rendering to return to approximately 60 FPS.
- Scrolling, viewport-height change, landscape rotation and held-image focus all preserved existing agents and focus state.

No scene or physics simulation depends on the rendering agents. The underlying scene stays separate.