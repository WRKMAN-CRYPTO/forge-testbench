# Wandrune 083: Pixi / Phaser Camera Registration

**Branch:** `fix/wandrune-pixi-camera-registration`. No merges to `main` or Physics 038.

## Reported symptom

The user verified that the original Phaser renderer displays a single correct swarm, whereas enabling the optional PixiJS layer makes the effect appear in a second, displaced position. Repeated adjustments to the formation glow could not solve this because the underlying Pixi camera/canvas registration must be corrected first.

## Two concrete technical risks discovered

1. `magic-lab/index.html` used an absolutely positioned Pixi canvas appended inside `#stage` but `#stage` was **not** itself a positioned element. This means the closest positioned ancestor could be the surrounding `#stageWrap`, making the overlay's DOM positioning depend on an ancestor's geometry rather than the stage's coordinate origin.
2. Pixi's `app.render()` occurred in Phaser `Scene.update()` while the moving/following camera recalculates scroll and its transform in `Camera.preRender()` during the **later render phase**. The Pixi transform could sample a camera state that did not correspond to the frame actually rendered by Phaser. Phaser's Scene `RENDER` event occurs after scene rendering.

## Patch

- Set `#stage{position:relative}` so the overlay canvas has the intended CSS positioning ancestor.
- Collect each crafted-agent visual record during the ordinary update, but delay Pixi's flush and camera alignment until the scene's **RENDER** event, after Phaser's camera has finalized its follow, bounds and zoom for that frame.
- Clean up the render listener when the scene shuts down.
- Keep the existing VFX Original / Bright / Formation toggle and original Phaser fallback.
- Add opt-in `?pixiAlign=1` registration diagnostic: Phaser draws a MAGENTA crosshair on the player's world coordinate, Pixi draws a CYAN crosshair at the same coordinate. A readout shows measured `getBoundingClientRect()` CSS displacement of the two canvases in pixels as well as current camera zoom and scroll. The marker is not included in normal gameplay.
- Avoid changes to spell physics, trails, combat, cardinal runes, mana, crafting/save state, or simulation-agent counts.

## Tests

`node magic-lab/pixi-camera.tests.js` covers the positioned stage, post-render registration hook, same-frame camera zoom/scroll transform, actual canvas DOM registration measurements at the 12th frame, paired world registration point, unchanged pointer-events and safe fallback. Existing `node magic-lab/pixi-formation.tests.js` continues testing trail alignment and the three visual styles.

**Limitations:** JS mocks and successful deployment cannot prove how Phaser/Pixi overlays line up on a real iPhone. The real user session is the release gate.

## iPhone check

1. Open the latest camera-registered preview with `?pixiAlign=1`.
2. The wizard's world-coordinate test point appears as overlapping magenta (Phaser) and cyan (Pixi) crosses. Move around and pan the camera; the crosshairs should stay together. Confirm the canvas readout stays around `Δ x:0 y:0`.
3. Cast the same conal 200-agent laser in Formation mode, then switch to Bright. There should be one correctly placed swarm, not two.
4. Switch to Phaser and back to verify the old look remains available.
5. If the crosses do NOT overlap even though CSS Δ is zero, capture a screenshot with camera scroll values. That isolates the world-camera transform from the canvas position.
6. Re-test with Phaser's camera shake/region changes, and rotate the phone once.
