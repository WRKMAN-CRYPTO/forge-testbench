# Wandrune 081: Formation-Aware PixiJS 8 Rendering

**Status:** Isolated preview branch. Neither `main` nor Physics 038 is modified.

## Why

Physics 038 fixed a directional bias in sampled grayscale movement. A player-designed 200-agent narrow conal fire laser then revealed a separate visual problem: the Pixi adapter downscaled visual opacity to 86% for detailed and 62% for lightweight particles, and each procedural particle texture has translucent edges. Individually drawn streaks conveyed the trajectory but not the continuous luminous volume.

## The three A/B modes

- `original`: legacy Pixi 080 opacity and no connected geometry (reference treatment).
- `bright`: restores lightweight particle opacity, preserves the same sprites, textures, positions, motions and cast counts. No connected geometry.
- `formation`: same bright particles plus a conservative, additive spatial interpretation of coherent streams. It detects structural coherence from each cast's *already calculated* particle positions and heading angles. Three light bands follow the locally measured occupied width and are drawn behind the particles.

Cycle **VFX: ORIGINAL / BRIGHT / FORMATION** in the game menu, with the separate **RENDER** switch returning to Phaser. For initial URL comparison, `?vfx=original`, `?vfx=bright`, or `?vfx=formation` choose the initial treatment.

## Defensive design

- The separate `pixi-formation.js` module is pure, has no Phaser, Matter, or Pixi imports, and has no ability to modify agents.
- Detector groups by cast and element, requires >=24 relevant particles, sufficient spatial elongation, consistent travel direction and at least eight populated longitudinal bins. Absent or disconnected segments are never bridged with imaginary beams.
- No spells, runes, cone or laser categories are hardcoded into the geometry analysis.
- Formation graphics render **underneath** individual particles. No extra collision or spell behavior exists. The 200-per-cast simulation-agent rule, global cast freedom, elemental combinations, impact effects and play controls are unchanged.
- `PIXICORE` telemetry in the in-game menu reports look name, detected shapes and connected segments. **Zero detected** is a safe, intentional result for clouds, rings and unrecognized formations.
- Setting `?renderer=legacy` disables Pixi on startup. Pixi failures still fall back to Phaser's existing crafted draw.

## Testing

`node magic-lab/pixi-formation.tests.js` contains 24 deterministic assertions with mocked Pixi drawing. It checks beam/cone recognition, circle/cloud rejection, disconnected-cluster rejection, per-cast grouping, alpha improvement, the 200 particle count, original/bright/formation A/B, Phaser rollback and unchanged game-state positions.

### Recommended phone procedure

1. Use your narrow conal spell in the preview, choose **VFX: ORIGINAL**, and screenshot the normal translucent streaks.
2. Without changing the spell, switch **BRIGHT** and note whether flame particles are readable.
3. Switch **FORMATION** and look for a distinct hot interior with soft edges. In game menu → Lab Telemetry, verify `PIXICORE` shows >=1 detected shape if the geometry qualifies.
4. Try a circle, scattered swarm, seeker, Behemoth and mixed-element recipe: the detector must not invent a continuous beam where it doesn't exist.
5. Compare motion, hits, rune learning, mana, camera, FPS and switch back to original Phaser rendering. If the new ribbon feels too smooth, thick or disconnected, send a screenshot/video before any further changes.

**Limitations:** Formation inference uses the current frame only, so brief density fluctuations can cause a visible shape to appear or disappear. Headless tests verify math and API wiring, not real GPU performance or browser rendering. Don't merge to production until the phone playtest confirms no visual artifacts.
