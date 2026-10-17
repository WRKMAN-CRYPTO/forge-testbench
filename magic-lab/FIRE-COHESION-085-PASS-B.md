# Wandrune 085: Fire Cohesion, Pass B — Soft Plasma Perimeter

**Status:** Isolated Vercel preview on `feature/wandrune-085-fire-perimeter`. This is the next visual-only pass after the user verified Pass A clustering and the wizard-skin recovery. Nothing is merged into production.

## Actual change

Fire agents already contribute original Forge artwork and behave according to Physics 038. When **two or more visible nearby fire agents** form a connected Pass A group, Pass B computes a smoothed spatial influence field from their already-existing `x,y,r,alpha` records and traces its outer iso-contour. Three soft orange/amber strokes overlap on that **shared boundary** behind the original agent glyphs. A lone fire agent remains unchanged. The contour is intentionally **not** the rigid convex debug hull and is **not** a guessed centerline connecting distant heads.

**No plasma body fill, hot density core, fluid behavior, additional simulated particles, edge turbulence, new spells, altered mana/collisions/impacts/runes, or altered save formats.** Body, core, and edge animation are separately gated Passes C–E.

## Architecture

- `pixi-fire-clusters.js` (Pass A) retains its existing 32px spatial-hash / union-find grouping and exposes a copy of each group's read-only member references. The original classification and links are unchanged.
- New `pixi-fire-perimeter.js` samples a bounded low-resolution 2D Gaussian influence grid and uses marching squares to generate smooth world-coordinate contours, preserving multiple islands and holes instead of drawing arbitrary bridges across gaps. Input arrays are never mutated.
- Gaussian contributions are splatted to only the nearby field grid nodes; a precomputed 512-entry falloff table avoids `Math.exp` on every sample.
- Mobile budgets: **roughly 1,100 field cells per cluster**; at most **three enhanced fire clusters per frame** and **3,500 sampled cells** for the additional visual shell. Only the shell is budgeted. There is no global agent/cast limitation and all original particle glyphs continue rendering.
- The new Pixi `Graphics` shell is behind the original full/particle sprites and above existing formation history accents; the three bands are translucent **strokes only** and do not fill a solid orange mass.
- The previously corrected Pixi/Phaser camera registration is reused; all contour coordinates are world-space, from the same agent records.
- The render bridge computes Pass A groups **once per frame** and shares that result with the optional FIRE GROUPS debug and PLASMA EDGE rendering.
- If sampling fails, the optional shell is disabled without interrupting spell simulation or the normal original renderer fallback.
- `skinBackup`, 20-skin wardrobe, Hues, and explicit RETRY ART path from the preceding verified patch remain unchanged.

## Comparison controls

- **PLASMA EDGE: ON/OFF** is a new independent cosmetic menu button. It defaults **ON** in this preview so the new effect is visible without extra setup. `?fireShell=0` starts without it.
- **FIRE GROUPS: ON/OFF** remains available to compare Pass A rigid debug cluster outlines with Pass B's organic, rounded boundary. Start with `?fireDebug=1` to display both.
- Original **ART: FORGE**, **VFX: FORMATION**, **RENDER: PHASER** fallback, skin selections and Hue Forge are untouched.
- Lab telemetry **PLASMA EDGE** reports number of enhanced groups, contour paths, sampled cells and visual CPU time in milliseconds.

## Verification

- `node magic-lab/pixi-fire-perimeter.tests.js`: **47 assertions**, including nearby pair → one closed contour, solo ember → no contour, 200-agent cone → continuous outer shell, cast-isolated shells, ring rendering, fluid grouping budgets, input immutability and live ON/OFF/Phaser rollback.
- Four existing suites also pass: Pass A grouping (42), camera registration (19), historical formation path (29), Forge-material fidelity (626). **763 headless assertions total**, mocked GPU, not proof of real iPhone FPS.
- The script still loads Physics 038 and the bundled original skin-backup module. They were not edited.

## iPhone acceptance test

1. Launch the newest preview, check the 20-skin wardrobe still works, then cast the **200-agent conal fire laser**.
2. With **PLASMA EDGE: ON**, the glow should form a softly bounded contiguous shape around neighboring fire agents, in exactly the same world position, without creating a second offset spell.
3. Switch **PLASMA EDGE: OFF**, holding the same camera/spell, to judge if the perimeter really adds readable physical presence.
4. Toggle **FIRE GROUPS** to verify that the computed shell tracks the connected components and follows their motion. Single agents should remain as original individual flames.
5. Repeat with a few small pairs, a scattered spray, two simultaneous fire casts and a dense swarm. If it looks too smooth, thin or wide, grab a short clip.
6. Watch FPS, apparent delay, performance/time telemetry, mobile rotation, skin and spell persistence, Archivist dodges. If the new layer costs too much, turn it off; normal effects remain.
7. **Do not merge** or proceed to Pass C until the player confirms visual clarity and phone performance.

**The goal is to reveal relationships that already exist between agents, never tell an agent how to behave.**
