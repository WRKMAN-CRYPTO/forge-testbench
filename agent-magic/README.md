# WRKMAN Agent·Magic v0.2 — Bound Light

Independent experimental spell-rendering lab. **Not connected to the roguelike.**

Four forms: Orb, Ward, Sigil, Summon. Five phases: Disturbance → Gathering → Formation → Resolution → Dissolution.

## What changed in v0.2
- **Light budget** slider (0–100%). Replaces additive `lighter` compositing with bounded `source-over` colors and a gentle backdrop glow.
- **Four structural roles**: core, shell, filament, and drifting fragments. The spell shape is still composed of moving hexagonal agents, not sprites.
- **Structure** slider independent of the original **Cohesion** and **Agent freedom** controls, letting a low-cohesion swarm keep a recognizable formation.
- **Real dissolution**: agents inherit outward velocities, scatter beyond the spell field, shrink, and lose opacity; they remain gone until Cast or Auto Cast.
- No timer-based surprise recasts; auto casting waits after dissolution and respects pause. Scroll-safe mobile layout and viewport resize preserves agent positions.
- Rendering stats now refresh about five times per second rather than rewriting the DOM on every animation frame.

## Stress tests
Test with 8,000 hexes, Solar palette, Cohesion 7%, Shimmer 0%, Intensity 0%, Agent freedom 0%, and alternate Light budget extremes. A screen full of near-white pixels should no longer result simply from agent overlap.

## Files
`index.html` is standalone and all JavaScript is inline for GitHub Pages. `magic.js` is an accompanying source copy for inspection.