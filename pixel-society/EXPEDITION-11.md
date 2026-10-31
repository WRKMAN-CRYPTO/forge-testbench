# Pixel Society — Expedition 11: Button Reclamation (v1.2)

## Request
Allow button makers to steal linker workers until **their own button** reaches **99% completion**.

## Rules
- Each button-maker chief measures its own border, independent of the global completion average.
- Completion now requires **gold-colored border work by that chief's own group**. Cyan linkers no longer count as a finished border just by standing on its perimeter.
- Below 99%, a manager can offer a position to a **rival LINKER** encountered through the existing local frontier/contact rules, **even when the manager's normal linker quota is full**.
- Each offer may be rejected. A successful hire changes the pixel agent's employer. If the hired linker already occupies a missing border position, it is assigned ordinary construction work there; otherwise it remains a linker until any later career change. Pixel agents **do not teleport**.
- Chiefs can also reclaim their own linker agents from border positions and reassign them to building work; these are tracked separately from rival poaches.
- The border builder role becomes more attractive locally while completion is below 99%, reducing rapid returns to linker work.
- At 99% or above, all **special linker theft and border reclamation stop for that maker**. The check is based on exact completed perimeter pixels, not rounded display numbers. If the border later falls below 99%, the maker may recruit again.
- Regular voluntary career changes, existing message routing, and the LEAN / CLASS policy are retained. Outside of JOBS, the original experiments are unchanged.

## How to use
Tap **JOBS** and allow the 4 button chiefs to recruit. The status strip now shows **EDGE** (overall completion percentage) and **STEAL** (successful rival-linker poaches). The programmatic report `pixelSociety.jobReport()` exposes separate completion and steal/reclamation counters for each chief, as well as the number of offers made.

## Tests
- Node JS syntax validation passed.
- Chromium smoke tests at **390×844**, **320×600**, and **844×390**, 300 accelerated updates each, recorded **no JavaScript page errors**. Initial recruitment and status updates worked on all three layouts.
- Two distinct deterministic seeds, **2026** and **8675309**, were run for 2,500 accelerated updates each in a 390×844 viewport.
  - Seed 2026 ended with **87%** global border completion, **5** successful rival-linker steals and **8** offers.
  - Seed 8675309 ended with **89%** global border completion, **12** successful rival-linker steals and **26** offers.
  - Different starting conditions created different individual progress, with some chiefs above 95%, others still significantly behind.
- An isolated threshold-control test artificially set one maker's border to **100%** and verified that trying to steal a rival linker **did not issue an offer**. Damaging three perimeter cells reduced completion to **97.66%** and the test then accepted an offer. This proves the **gate**, not that a live colony will necessarily reach 99% by itself.
- All experiments are toy simulations; these are descriptive trials, not optimization or general performance guarantees.

## Known limitation
A stolen linker outside the chief's rectangle remains at the same logical pixel. Stealing does not directly paint the missing border or guarantee completion. Likewise, rival crews can still be damaged by losing relay specialists, and aggressive poaching could reduce message reliability. The next study should compare completion speed **and** cross-group delivery against the archived 1.1 baseline.

## Archives
- `index.html` — v1.2 Button Reclamation
- `v1.1.html` — previous Lean Linkers
- `v1.0.html` and earlier — prior stages, unchanged

GitHub publication verified. Public Vercel deployment was not independently checked in this test.
