# WRKMAN Arcane Lab 040 | Precision Spell Forge

The Forge's original 320 × 320 canvas drew all 32 × 32 cells at once. On an iPhone, a cell was typically under 9 CSS pixels wide. Painting a specific pixel with a fingertip was needlessly difficult.

## New controls
- **Zoom:** + / − steps through 1×, 2×, 4× and 8×. Pinching supports continuous zoom from 1× to 8×, anchored to the gesture midpoint. The 32×32 data is never resampled.
- **MOVE:** switch between drag-to-paint and drag-to-pan, avoiding unintended strokes.
- **Minimap:** always shows the entire instruction field. The aqua outline marks the visible region. Tap elsewhere to recenter the zoomed view.
- **Pixel selection:** a gold outline highlights the selected cell, with a text readout of its absolute (x,y) and grayscale or magenta value.
- **Arrows + STAMP CELL:** nudge the selected coordinate by exactly one original cell in any direction, then paint that cell with the selected brush, independently of finger placement. The view follows the selection near map edges.
- **Keyboard / mouse:** arrow keys select, Enter/Space stamp, + and − zoom, mouse wheel zooms at the pointer position.
- **Pinch safety:** if a second finger arrives during a painting stroke, the uncommitted stroke is rolled back, including its undo checkpoint. A pinch cannot introduce an accidental pixel.
- **Existing tools:** white, gray, black, magenta, brush radius, gradient line, Undo, recipes, Save & Equip, and JSON import/export remain supported.

## Architecture
`field-viewport.js` provides pure viewport coordinate math. `field-precision-ui.js` owns paint gestures, zoom, minimap and cell selection. `spell-forge.js` owns the spell library and the **original 1,024 cell values**. The 037 physics engine and 039 solid-impacts module are unchanged. Saved library key and exported format remain unchanged.

## Verification
- Coordinate round trips across all visible cells at 1×, 2×, 4× and 8× passed.
- Clamped panning, edge navigation, pinch zoom and zoom stepping were tested.
- Simulated pointer interactions passed for: paint one exact cell, nudge and stamp, roll back first-finger marks when a second finger begins a pinch, move without painting, reset zoom, and overview cell selection.
- JS syntax and GitHub module dependencies verified.
- Real iPhone touch feel and landscape layout still need user playtesting.

## Suggested playtest
1. Open **☰ → SPELL FORGE** and duplicate an existing spell so the original stays safe.
2. Zoom to **4×**, then **8×**. Try painting a single cell with your fingertip.
3. Tap **MOVE**, drag to another corner, then tap MOVE again to paint.
4. Tap the minimap to recenter, select a cell using the arrow buttons, and tap **STAMP CELL**.
5. Test **UNDO**, a two-finger pinch, and **SAVE & EQUIP**. Cast the result and confirm the spell behaves normally.

_W / Clock In. Build Something._
