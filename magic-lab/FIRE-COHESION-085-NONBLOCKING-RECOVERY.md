# Wandrune 085: Nonblocking Fire Stabilization (Correction)

User reported the first stability pass looked **worse**: barely any plasma masses remained. We should trust this observation. The first tracker retained three expensive contour slots while old blobs faded, let small old fragments monopolize slots, and introduced a long near-transparent fade-in.

## Reproduced second defect
With three independent dense 200-agent clouds (600 agents total), Pass D's approximate cell calculation requested slightly more than 1,100 actual grid nodes per group. After two groups the budget had enough nominal room for the third, but `buildOne()` produced more than its remaining allowance and silently skipped it. Reproduced outcome: **2 enhanced / 1 skipped** despite a three-slot 3,500-cell allowance.

## Fixes

- `pixi-fire-perimeter.js`: the actual `nx * ny` count is now brought under the requested field-sample limit after all rounding. Synthetic 600-agent 3-cloud test now yields **3 enhanced / 0 skipped, 3,168 samples of 3,500**.
- `pixi-fire-stability.js`: expensive field slots are now assigned to the **three strongest CURRENT** visual clusters, with a light 10% incumbent bias. No arbitrary 33% challenger hold, no 170ms challenger delay, no slot blocked by fading material.
- A newly selected group immediately renders at at least **82%** opacity and reaches full appearance quickly, instead of beginning at around 9%.
- Up to three short-lived departing contours can fade as **cached graphics only**, independent from the three fresh density-sampling slots. Those afterimages do not require expensive recalculation.
- Threshold persistence and brief amber/pale-hot fades remain. Original agent records, cast physics, collision, gameplay, and save data remain untouched.

## Rollback controls

The previous stability preview has been returned to **Pass D rendering by default**, so the overrestrictive version no longer appears unless explicitly requested. This new separate preview enables the corrected nonblocking version for evaluation. **STABLE FIRE: OFF** or `?fireStable=0` immediately restores the Pass D presentation.

## Tests and release gate

All existing renderer regressions pass, including material, formation, camera, Pass A through D and restored wardrobe script references. New 205-assertion tracker suite includes fluctuating four-way competition, immediate larger-newcomer selection, cached ghosts, heat tolerance, cast isolation and the **600-agent three-cloud exact-budget regression**. Eight suites total: **1,055 assertions**. These are headless tests; iPhone visual results must be evaluated.

No branch is merged to production. Hold Pass E until 600-agent clouds visibly remain full and stable on the phone.
