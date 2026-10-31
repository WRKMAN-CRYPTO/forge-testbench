# Pixel Society — Expedition 05: Frozen Topology (v0.6)

## Research question

The original RELAY animation appeared to move over, under, and around neighboring structures, despite running on a strictly 2D pixel grid. Are its visual layers explained by **graph distance** and disconnected paths rather than a third spatial dimension?

## TRACE protocol

1. Let the colony develop a network. **WILD**, then **TRAIN** or leave the colony running.
2. Tap the new **TRACE** control above the main buttons (or press **7** / **D**).
3. The entire colony's behavior is paused. Training is suspended, and no agent states or inherited rules are updated while frozen.
4. An observer picks a **single source** from a wide connected color component. Alternatively, tap a visible agent in the field to select the source explicitly and replay the trace.
5. Run **breadth-first search (BFS)** through four-adjacent agents **of the same visible color**. Nodes outside that connected component cannot receive the signal.
6. Animate one frontier. Color each visited agent by **shortest-path graph distance from the source**, rather than by XY distance: blue near source, teal intermediate, gold/pink farther along. Disconnected or unreached agents stay dim.
7. When the frontier finishes, the color-coded network remains visible until the user taps another source or TRACE again to resume evolution.

The status strip displays **DEPTH** (maximum BFS hop count), **NODES** (reachable agents), **LAYER** (current animated hop), and **DETOUR** (maximum graph hop count divided by the straight-line distance to that most distant-by-hop agent). DETOUR is a descriptive ratio, **not** a third-dimensional measurement.

The original RELAY and TRAIN behavior remains available and untouched. TRACE is a diagnostic visualization, not a new agent ability; graph-distance data never influences local agent decision-making or fitness.

## Observations and tests

- JavaScript syntax check passed.
- Local Chromium tests passed at **390 × 844**, **844 × 390**, and **320 × 600**, with no runtime JS exceptions.
- In all three viewports, testing confirmed that the source has **0 hops**, frozen generation counts do not advance even if programmatic steps are requested, the trace reaches its final layer, and the simulation resumes after TRACE is exited.
- Actual mouse/touch-equivalent interaction checks confirmed the visible TRACE button toggles the mode and clicking in the colony chooses/replays a single source on all three layouts.
- In one seeded portrait example after 720 evolution updates, a connected network contained ~1,225 nodes, extended up to **96 hops** from the source, and had a detour ratio around **1.6×**. The experiment varies by initial condition, viewport, and ongoing evolution.

### Interpretation

Agents that are visually close need not be close **along the same-color network**. Tracing a single component separates delayed arrival along a long path from independent waves launched into other components.

A 2D graph does not possess physical height by virtue of this coloring. The appearance of over-under movement comes from network connectivity, animation timing, and human depth perception.

### Caveats

- The route is computed using an outside observer's BFS, not message passing performed by the simulated agents themselves.
- Graph distances are calculated from a frozen snapshot; this does not model a signal's delay while topology changes.
- The original multi-source RELAY animation may overlap several waves, but the new TRACE deliberately selects exactly one source.
- Auto-selection favors wide connected regions and does not guarantee the globally most convoluted route.
- These checks used local Chromium HTML rendering; the public Vercel deployment was not independently verified.

## Files

- `index.html`: v0.6 TRACE
- `v0.5.html`: original signal ecology / SELECTION vs DRIFT
- `v0.4.html`: amnesia and spontaneous patterns
- `v0.3.html`: trust, rumors, false consensus
- `v0.2.html`: distributed witness network
- `v0.1.html`: original guided colony
