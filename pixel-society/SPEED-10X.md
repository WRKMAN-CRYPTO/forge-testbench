# Pixel Society 1.5 — Tenfold Tempo

## Change
Increased the **requested wall-clock simulation rate from 30 to 300 logical updates per second** (10× multiplier). This changes how quickly the original agent rules advance, not how much simulated time a single update represents. It does **not** change the recruitment, cooperation, memory, foreman, plasticity, or linker-chain algorithms.

## Implementation
- Each animation frame adds `elapsedMilliseconds × 10` to the simulation-time accumulator; each full `1000 / 30` accumulated milliseconds executes one existing `update()`.
- Replaces the previous 3-update burst cap with 30 updates per animation frame.
- Introduces an **18 ms per-frame simulation work budget** and a capped accumulator to preserve responsiveness. On slower hardware, excess simulated time is dropped rather than trapping touch input behind an ever-growing update backlog. Consequently, **300 updates/s is a target, not a guaranteed sustained rate**.
- TRACE freezes the colony exactly as before. Animation of PULSE, TRACE, foreground UI, and LEARN/REST playback is still governed by elapsed real milliseconds.
- Exposes measured recent actual speed through `pixelSociety.status.simulator` with `multiplier`, `targetStepsPerSecond`, and `measuredStepsPerSecond`. The measured figure can fluctuate with display size and colony activity.
- Resetting on tab visibility change prevents a long catch-up burst after returning to the page.

## Browser checks
Local Chromium 390×844, 320×600, and 844×390:
- All three began running with the explicit 10× clock multiplier and reported a 300-steps/s target.
- After starting WILD and JOBS, generations advanced, foremen still appeared, and no page JavaScript exceptions were seen.
- TRACE kept generations frozen for a 500 ms observation; exiting TRACE resumed updates on all three layouts.
- Representative quiet-colony rates were about **282**, **300**, and **130** updates/s, respectively. Denser JOBS-mode work reduced sustained throughput further: on portrait hardware this was roughly **220–280** updates/s in the short tests; the landscape test ran slower. These are hardware/browser-dependent single-run observations, **not** proof of 300 updates/s on mobile devices.

## Archive
- `index.html`: v1.5 Tenfold Tempo
- `v1.4.html`: previous 30-step/s Foremen baseline
- Earlier versions preserved.

## Note
The GitHub release can be verified separately from any Vercel deployment. Local Chromium tests do not establish live Vercel readiness.
