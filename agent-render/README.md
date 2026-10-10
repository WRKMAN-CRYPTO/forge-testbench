# WRKMAN Agent-Render v0.5 · Contour Seek

A mobile-first experimental hex-agent renderer. The underlying flower/photo remains independent: agents sample the scene, move, divide, merge, and paint the displayed image.

## Launch

Open `index.html` in a browser or use GitHub Pages under `agent-render/`. Works without libraries or servers after it loads. For imported photos, choose **IMPORT AN IMAGE**; the photo stays in browser memory and is not uploaded.

## New in v0.5

- **Contour seeking** control (0–100%) makes agents estimate local edge direction and search for better placements around that edge. Movement is still governed by **Agent freedom**. 0% freedom anchors their positions.
- Hex samplers estimate a *signed boundary normal* from paired opposite color/luminance probes at two radii. This distinguishes directed boundaries from symmetric texture.
- Boundary-following agents nudge toward the side whose color matches the agent's center and glide gently along the edge tangent. A soft home tether and sibling repulsion preserve coverage.
- Split clusters may rotate their offspring ring relative to the detected boundary, allowing different placement of micro-hexes around curved outlines.
- More center-weighted paint along strong edges limits gray color bleeding in lettering and gauge tick marks; turning Contour seeking down restores much of the previous painterly color fit.
- **FLOW** inspection view overlays sparse normal and tangent markers on the actual hexagons. Green strokes show the local tangent; peach strokes show the estimated normal.
- Retains Focus Engine, 16,000-agent ceiling, high-density cadence / staggered sampling, scroll-safe sizing, image import, hold, pulse, and comparison views.

## Suggested gauge test

Import a photo of a pressure gauge, set 100% Detail hunger, 75–100% Edge priority, Contour seeking around 65–80%, and Agent freedom around 30–50%. First test with 1,600–3,200 agents, then gradually increase to 16,000 if the phone handles it. Toggle AGENTS / TRUTH / COMPARE / FLOW. Try Contour seeking at 0% and 80% to evaluate whether it improves the specific image.

## Limits

- This is still an experimental painter, not vector tracing, text OCR, or a guarantee of legible fine numerals. There are no hidden pixel or sprite overlays in the AGENTS view.
- Orientation sampling works best on coherent edges; it may be weaker around highly textured regions, junctions, or tiny features below a hexagon's sampling radius.
- Very high agent budgets are CPU-intensive and may heat phones or reduce frame rates. Stop or lower the budget if performance suffers.
- Full scene sampling is retained for live flowers; static imported photos receive the same agent-based reconstruction as the procedural reference.

Everything drawn is still a hexagon agent; reference imagery only supplies sample colors and gradients.