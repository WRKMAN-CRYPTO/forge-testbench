# Pixel Society — Expedition 04: Survival of the Useful (v0.5)

## Motivation

The user's recorded v0.4 run showed attractive, maze-like structures recovering after damage. But *visual organization* alone does not show that a structure solves any task. Here the agents must form a **connected same-color relay**, and we compare rewarded selection with unrewarded drift.

## Experiment

After **WILD** clears inherited field memories, agent-specific birth, mutation, survival, and local copying rules create colored structures. A **RELAY** signal begins at the left edge. Using 4-neighbor connectivity, it can move only between adjacent agents currently displaying the **same color**. The diagnostic observer scores the farthest horizontal reach; a transmission succeeds only if it reaches the far-right goal zone.

**SELECT** credits participating signal-carriers. Credit influences their survival and their chance of becoming parents to agents born in neighboring empty sites. Their color and genome can be inherited, with occasional bit mutations. Ongoing ecological turnover ensures new generations remain possible.

**DRIFT** receives the exact same relay tests without granting these fitness-based survival or inheritance advantages. Neutral neighborhood rules still generate patterns.

Controls:
- **WILD**: erase field memories and restart free pattern formation.
- **BREAK**: damage agent states and neighborhood knowledge.
- **HEAL**: accelerate local memory exchange.
- **TRAIN**: toggle an automatic relay test every 60 simulation updates (immediately tests once when enabled).
- **SELECT**: toggle between rewarded local selection and neutral drift.
- **RELAY**: run one signal test and animate the traversed path.
- Touching the field can still probe local response; long-press causes localized amnesia.
- Observer status shows current signal reach, mode, relay successes/attempts, and number of inherited mutations.

### What this does *not* mean

This is **not a sentient colony**, and no agent chooses a universal goal or invents the notion of useful communication. The developer specified the relay task and the local genetic rules. Success means completing this narrowly defined computational test.

Switching SELECT/DRIFT during a live run **does not** create a properly matched control, because the colony's morphology already reflects its earlier history. For a fairer comparison, we reset with the **same initial random seed** and run each mode separately. These two modes differ in more than rewards alone (inheritance, survival, and mutation are also enabled), so an outcome difference cannot be attributed to one mechanism in isolation.

## First paired-seed batch

A fresh Chromium canvas was created for each starting condition at **390 × 844** viewport. Each mode began from the same initialized seed and then ran 960 updates, with a trial immediately after WILD followed by a trial every 60 steps, producing **17 observations per run**.

| Seed | SELECT full links | DRIFT full links | SELECT mean reach | DRIFT mean reach |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0/17 | 0/17 | 68.0% | 67.9% |
| 42 | 0/17 | 15/17 | 55.0% | 89.6% |
| 2026 | 0/17 | 0/17 | 56.4% | 55.5% |
| 8675309 | 15/17 | 15/17 | 89.5% | 89.8% |
| 0x7ac58c3e | 13/17 | 0/17 | 85.2% | 44.1% |
| **Total/mean** | **28/85** | **30/85** | **70.8%** | **69.4%** |

**Finding:** local rewarded selection is **not uniformly superior** to neutral drift. On one seed it discovers a working relay while drift does not; on another seed the opposite happens. This is a *small, descriptive, multi-seed demonstration*, not proof of a statistical advantage for either policy.

Each run's later observations share the same evolving colony and are correlated, so 85 observations per mode are **not 85 independent trials**. Five seeds are too few for strong effect-size or significance claims.

## Tests and UI

- JavaScript syntax validation passed.
- Chromium smoke-tested at **390 × 844**, **844 × 390**, and **320 × 600**, covering WILD, BREAK, HEAL, TRAIN, RELAY, SELECT/DRIFT, and checking for JS errors.
- Landscape layout was adjusted so the field stays visibly above the status strip.
- For deterministic exploration, the exposed browser console interface includes `pixelSociety.reseed(n)`, `runSteps(n)`, `status`, and calls to `wild()`, `train()`, `relay()`, `select()`.
- The original founding reference remains inaccessible to the colony's decisions and is used only for external diagnostic measurements.

### Next hypotheses

1. Is there an exploration/exploitation trade-off? Could selecting too strongly suppress more promising networks?
2. Does selection favor a mostly monochrome field rather than an efficient sparse relay?
3. Can function survive **relocation of the receiver**, or have we selected a specialist for one testing arrangement?
4. Will memory and learned trust protect a signal network under repeated BREAK disruptions?

## Archive

- `index.html`: current v0.5
- `v0.4.html`: emergent structure
- `v0.3.html`: trust experiment
- `v0.2.html`: distributed witnesses
- `v0.1.html`: the guided first colony

Deployed host status was not independently established by the Chromium smoke tests; those tests ran local HTML.
