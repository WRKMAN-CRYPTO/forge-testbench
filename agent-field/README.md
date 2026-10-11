# WRKMAN Agent·Field v0.3 | Leaf Material

A standalone, mobile-first 32×32 grayscale behavior-map interpreter for freely moving hexagonal rendering agents. The spell field is a 1,024-cell instruction surface, not a sprite animation. The roguelike and Agent·Magic are not modified.

## What is new in v0.3

- **Hex surface** selector: FLAT or LEAF, with LEAF selected initially. Existing palette choices still work.
- **Leaf material** has a shaded body, a midrib, small angled veins, and subtle speckling. Larger hexes follow agent movement orientation. Tiny hexes are rendered with their texture detail naturally reduced by scale.
- **Shared raster textures** are cached by palette, progression shade, and minor pattern variant; no per-agent gradient creation or clipping each frame. An enlarged material preview makes the tiny textures inspectable on phones.
- **Saved format stays `WRKMAN_AGENT_FIELD_V1`.** A new optional `settings.texture` property persists through SAVE LOCALLY, EXPORT JSON, and import. Legacy saves with no texture setting remain valid.
- Agents continue to leave the viewport without wrapping. Offscreen physics, FF00FF free-space behavior, all four palettes, five map generators, and field editing are retained.

## Live

https://wrkman-crypto.github.io/forge-testbench/agent-field/?v=0.3

## Local tests

- JavaScript syntax validated with Node.js.
- Headless Chromium mobile-viewport smoke test: leaf default, preview, switching flat/leaf, all 6,000 agents, palette changes, save/import round trip, magenta-gap sampling, offscreen sampling, zero page JS errors.
- The local Chromium FPS measurement is not a reliable prediction of physical iPhone performance. Compare LEAF and FLAT on the same device and map to gauge material overhead.

## Notes

A grayscale cell can be a value from 0 to 255; -1 is the JSON encoding of the exact `#FF00FF` no-guidance key color. The behavior map remains separate from the rendered material. Materials never paint magenta onto the visible swarm unless a deliberately chosen appearance requests it.