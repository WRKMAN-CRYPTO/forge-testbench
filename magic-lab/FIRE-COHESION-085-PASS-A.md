# Wandrune 085: Fire Cohesion, Pass A

**Status:** Separate GitHub/Vercel preview branch `feature/wandrune-085-fire-clusters`. Fire plasma is **NOT yet drawn**. This pass measures and visualizes only whether nearby fire agents belong to the same coherent connected component.

## Principle

Wandrune physics, runes, spell instructions, combat, mass, collision bodies and saves remain unchanged. The Pixi rendering bridge reads the same already-calculated `x,y,r,alpha,element,castIndex` records. Each fire agent contributes to a visual grouping. Neither the grouping nor debug display sends anything back to simulation.

## Pure clustering module

`magic-lab/pixi-fire-clusters.js` exposes `findClusters(records, options)`.

- Only active fire (`element===1`) with finite world positions and `alpha>0.05` participate.
- Each originating cast is clustered **separately**, even if two fire spells occupy identical world coordinates. This avoids accidentally merging unrelated cast identities in the debug pass; a future renderer can decide how to composite their visible light.
- Visible/near-visible candidates are selected through Phaser's current camera world-space bounds (with 36px padding).
- Spatial hashing uses 32 world-pixel cells. Pair tests inspect only nearby cells, avoiding cross-cast all-to-all distance scanning.
- Agents are connected if their separation is within a size-aware neighborhood radius (normally 18-26 world px), up to 26px in the first test.
- Union-find identifies components; recorded edges are a deterministic spanning forest, not every pairwise connection.
- Singletons remain ordinary original agent glyphs. Groups of two have a debug link; groups of three or more get a convex debug hull. Hulls are **only diagnostics**, not a committed fire shape.
- All clusters are analyzed; only the 18 largest have geometry drawn. Connection debug strokes are capped so the debug tool itself doesn't become the game's performance bottleneck.
- The detector has no global cast or agent cap.

## How to test on iPhone

Open the branch preview at `/magic-lab/?fireDebug=1` in landscape.

In the game menu, **FIRE GROUPS: ON/OFF** toggles the diagnostic without restarting or changing any spells. When enabled:
- Each connected fire group gets a colored outline, a centroid dot, and a sample of real neighbor connections.
- The **FIRE GROUPS** telemetry reports `N GROUPS / M MAX / S SOLO / E LINKS`.
- Nearby lone embers should remain ungrouped.
- One tight 200-agent fire cone should ordinarily register one large group; if it fragments, we need its exact link gaps before attempting plasma fill.
- Two distinct casts can overlap visibly but remain separate groups, so one spell's behavior never reclassifies another in Pass A.
- `?fireDebug=0` or the OFF button restores **exactly** the prior Forge/Formation material rendering without extra cluster work.

## Successful synthetic checks

- A generated 200-agent conal beam: 1 component, 199 spanning-tree links.
- Two coincident 200-agent casts: 2 separate components, 398 total links.
- 20 isolated embers: no groups, 20 solo glyphs.
- 12 casts x 200 agents: all 2,400 candidates analyzed with zero artificial global cap.
- Isolated agents, mixed elements, faded agents and offscreen candidates handled.
- `node magic-lab/pixi-fire-clusters.tests.js`: 42 headless assertions and 3 mock render frames, including disabled/enabled/fallback controls.
- Existing 083 camera registration, 082 formation trail alignment and 084 material-fidelity suites continue passing.

## Not yet implemented

This pass does NOT add glow, blobs, shells, heat core, fire plasma noise or new agent count. It must first demonstrate that the actual authored spell's clustering yields the right boundaries on a real iPhone. Pass B can then grow a **soft plasma perimeter** from the detected components, without turning unrelated connections into rigid polygons.

**Do not merge to production before user validation.**
