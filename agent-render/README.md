# WRKMAN Agent-Render v0.3 | Edge Awareness

A phone-first experiment in **rendering with living populations of colored hexagons**, not pre-drawn sprites. The independent procedural flower or imported image is the target. Agents sample its colors, move, split, and merge under a hard population budget.

## v0.3 changes

- **Edge-aware local sampling:** a center and two concentric six-point rings examine local color variation and sharp transitions, catching finer features than a single ring.
- **Edge priority slider:** trade off general color detail against sharp borders and lettering, adjustable while the renderer runs.
- **EDGES mode:** a visual diagnostic of local edge scores at the agents' current locations. This is *not* an actual image layer in the reconstruction.
- **Adaptive color fitting:** fine agents gently favor the reference pixel at their center on sharp edges instead of always averaging away those edges.
- **Population competition:** when full, a stable low-value sibling cluster can merge to free space for a stronger unresolved edge, subject to cooldowns.
- **Smaller-detail option:** a third split depth becomes possible for high budgets, with adjustable population up to 2,200 (heavier on phones).
- **Preserves the v0.2 Focus Engine** and **v0.2.1 scroll-safe resizing**.

## How to test

1. On mobile, open `index.html`, watch the flower arrive, then scroll down. It should **not refocus** unless you press Refocus, Rebirth, or enable Pulse.
2. Import an image containing lettering. Switch between AGENTS, TRUTH, COMPARE, and EDGES.
3. Increase **Edge priority** to emphasize boundaries; decrease it if you prefer softer gradients.
4. Increase **Agent budget** to 1,500–2,000 for finer text, provided your device stays responsive.
5. Use **Refocus** to watch the same image rebuild with the new settings. **Rebirth** starts from randomized roots.

## Honest limitations

This is still experimental. With only hundreds of solid-color hexagons, tiny letters will remain abstract. Edge preference can also overspend on strong frame borders. Fidelity is a budgeted tradeoff, not guaranteed pixel-for-pixel superiority on every image. High budgets cost more processing. The system does not paint the truth image under or over the agents in AGENTS mode.

## Files

`index.html` is standalone, no network or build step required. The controls operate entirely in-browser. Imported images are processed locally and not uploaded.