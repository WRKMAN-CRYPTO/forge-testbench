# Pixel Society — Expedition 10: Lean Linkers (v1.1)

## Hypothesis

Instead of rewarding linkers merely for expanding a communications network, reward workers for **making a real inter-group connection with less staffing overhead**. Do leaner bridges free up more workers for buttons, or do they produce fragile communication networks?

This is a hand-built computational labor market of independent logical-pixel agents. It is not AI consciousness, natural human labor economics, or a demonstrated general optimization algorithm.

## Why this experiment

In the user's 65-second recording of v1.0, linker headcount grew from roughly 470 to over 1,800 on a full-sized interactive colony. Border completion hovered around 93–95%, and messages increasingly connected groups. Recruiting more people was helping connectivity, but the company was becoming overwhelmingly a linker company.

## Design

The **JOBS** mode now includes a bottom-row **LEAN** control, replacing REST only while JOBS is running. Tap it to switch between **LEAN** rewards and **CLASS** (the original local labor-market incentives). After exiting JOBS, REST is available again. Other instruments remain intact.

Under both policies, a button maker can broadcast its message to employed linkers in its own group; a remote delivery requires an actual connected chain of **cardinally adjacent linker pixels**. Thus the same geometric criterion is used for delivery in both LEAN and CLASS. In CLASS, the existing relay animation rewards a sampled fraction of all reachable linkers, as in v1.0. In LEAN:

1. A periodic **quiet probe** every 90 simulation updates tests actual connectivity between each of the four button-maker organizations, *without counting it as a user-sent message*.
2. A breadth-first search reconstructs **a shortest reachable inter-group chain**, if one exists.
3. The efficiency score is `round(100 / (1 + hopCount/35 + redundantLinkers/16))`, bounded to 1–100. A firm's linkers not on its shortest bridge count as surplus. The shortest of possibly many routes is selected.
4. **Only linker pixels traversed by the measured bridge**, including the recipient end, get additional job-performance credit. No credit is paid merely for increasing the group size or being in a BFS flood.
5. A manager that recently succeeded temporarily lowers its **advertised number of linker jobs** to its own bridge's contributor count plus a reserve. The advertised target is a social signal, not a direct forced firing action.
6. Jobs remain individually chosen: agents can decline offers, change careers after the review period, or be poached at a physical contact boundary. Recently used bridge agents retain a temporary productivity advantage to avoid immediate mass resignation.
7. After 300 updates without a new bridge, that temporary protection ends and shortages can drive a renewed hiring wave. Connections can be lost.

The simulated agent still does not know the global shortest path. Path finding is an **outside diagnostic used to pay task-based rewards**, not a cognitive action the agents invented. This is a designed and deliberately imperfect organizational policy.

## Results: matched example

**Environment:** Chromium, 390×844, seed 2026, 2,300+ simulation updates in both modes. These are individual evolving colonies, not independent samples.

| Measure | LEAN | CLASS |
| --- | --- | --- |
| Linkers around update 2,300 | **45** | **405** |
| Linkers after roughly 2,450 updates | **201** | **405** |
| Manual button messages delivered at final checkpoint | **2 of 4** | **4 of 4** |
| Recorded automatic bridge events in LEAN at ~2,300 updates | **16** | N/A |
| Largest observed LEAN bridge efficiency in that run | **82 / 100** | N/A |

The LEAN workforce was much smaller in one moment, but recovered headcount rapidly afterward. This does not establish a permanent improvement, and fewer workers did not maintain the same delivery rate.

Earlier preliminary runs at ~1,800 updates showed the same tension: one seed's LEAN workforce shrank relative to CLASS, while remote deliveries were often less reliable. A quiet-probe score is not proof of robust end-to-end communication under changing topology.

**Interpretation:** a reward for resource efficiency can lead to episodes of consolidation, but it may also over-prune productive infrastructure. Labor allocation and network reliability are coupled; this version deliberately exposes that instability rather than scripting a guaranteed better outcome.

## Validation

- JavaScript syntax checked under Node.
- Chromium browser touch tests passed at **320×600**, **390×844**, and **844×390**. The touchable JOBS and LEAN buttons worked; all four text-makers were hired; messages and formatter commands still executed.
- No page JavaScript errors in the three tested layouts.
- Matched-start mode comparisons executed in the local browser.
- The `pixelSociety.jobReport()` object now exposes `lean.enabled`, probes, bridges, best efficiency, last measured hops, and credited-worker events. Each maker's report includes its current bridge state and recent protective interval.
- Programmatic tests used `pixelSociety.reseed(2026)`, `jobStart()`, `runSteps(n)`, and then manual `jobTap`. To compare the same initial random seed, toggle `lean()` *before* `jobStart()` on a separate freshly reseeded colony.
- The full source was committed and fetched for post-commit verification. These are local browser tests; the public Vercel deployment was **not** independently verified.

## Limitations and next questions

- The dynamic geometry means user clicks, different screen sizes, or different seeds change which bridges exist.
- The score treats all extra employees as overhead, but some of them provide **redundant routes** that make the network robust to breakage. A backup bridge may be valuable even if unused.
- Strong periodic consolidation can create hiring / firing oscillations. Try hysteresis, protected redundant paths, or a minimum reliability target.
- This prototype does not yet count total labor-hours or route latency. Linkers receive local work credit proportional to an observer-defined efficiency measure.
- Explore whether rewarding **two independent routes with a small workforce** outperforms rewarding only the cheapest route.
- A linker's job change can disconnect another company's route. This can create negative externalities that today's manager scores do not price in.

## Archive

- `index.html` — v1.1 Lean Linkers
- `v1.0.html` — original Labor Market
- `v0.9.html` and earlier — previous experiments
