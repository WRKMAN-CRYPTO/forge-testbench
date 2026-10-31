# Pixel Society: Expedition 02 — The Trust Experiment (v0.3)

A single-canvas experiment in which each *logical* pixel is a small computational agent. Founders seed 3×3 overlapping memories once. The founding picture is then discarded from the agents' decision process; an **external observer reference** survives for measurement only. It is never consulted by agent memory exchange, repair, or trust rules.

## Controls

- **GROW**: propagate transient activity through the colony.
- **BREAK**: disrupt roles and erase many local memories.
- **HEAL**: accelerate neighbor communication without restoring a central blueprint.
- **LIE**: infect a subset of overlapping witnesses with a deliberately false claim.
- **RULE**: rotate COUNT (one witness, one vote), REPUTATION (local consensus-derived), and CONFIDENCE (weight by expressed certainty).
- **TEST**: introduce a rumor, observe it for 180 simulation updates (roughly six seconds at the target rate), and report a short verdict.
- Tap the bottom statistic strip for observer highlighting; hold in the colony to cause amnesia.

## Reproducible initial experiment

A controlled headless JavaScript test ran three fresh colonies from the **same starting seed and layout**, differing only in the trust rule. The rumor initially corrupted **203 center memories** within the observation region, creating **376 disputed center locations**. Results at **180 updates**:

| Rule | Wrong remembered centers | Disputed centers | Locally supported wrong centers |
| --- | ---: | ---: | ---: |
| COUNT | 204 | 374 | 105 |
| REPUTATION | 208 | 372 | 115 |
| CONFIDENCE | 211 | 374 | 117 |

The experiment also passed **16/16** programmatic assertions, including post-BREAK recovery, preserved observer separation, rumor-induced disagreement, and test completion.

**Interpretation:** Incorrect memories can survive and gain local support even without a centralized restorer. Under this one starting condition, confidence weighting and reputation weighting preserved slightly more erroneous support than equal voting. This is a **single-seed deterministic experiment**, not a statistical conclusion about the rules.

**Important limitations:**
- A "wrong" memory means *different from the founding interface*, not necessarily functionally harmful.
- The observer's founding reference is a diagnostic yardstick, not information available to any agent.
- The false-memory region was deliberately introduced; these aren't spontaneous hallucinations.
- The result shows persistence over 180 updates, **not** permanent stability or convergence.
- The web interface itself is still created once by explicit founder instructions. The agents are not yet inventing interface components from scratch.
- The programmatic simulation was exercised, but actual deployed browser rendering and Vercel release status were not independently confirmed.

## Version archive

- `index.html`: current v0.3
- `v0.2.html`: distributed witness memory
- `v0.1.html`: original guided colony
