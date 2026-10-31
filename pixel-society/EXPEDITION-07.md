# Pixel Society — Expedition 07: The Memory of a Path (v0.8)

## Question

When an existing pixel-agent colony has strengthened routes through repetition, what happens to those routes during inactivity? Does retraining revisit the same edges, and does restored *wire strength* also restore *successful long-distance delivery*?

This is a simulated, hand-designed local plasticity rule. It is not a biological brain, genuine neuronal activity, or evidence of sentience.

## New controls

The mobile-first single-canvas interface keeps the v0.7 controls and adds a status-area row:

- **PATHS / AGENT**: toggle an observer view of local edge strengths (violet = weak; blue = medium; cyan-white = strong). Each rendered logical pixel still belongs to one simulated pixel agent. This view recolors agent pixels based on incident edge strengths, rather than drawing a conventional HTML overlay.
- **LEARN**: freeze morphology, disable automatic structural training, enable plasticity, and send 24 consecutive stochastic pulses. Capture a reference *edge-usage fingerprint*: an edge traversed at least 3 times during the training batch.
- **REST**: decay all present edge strengths for 64 updates, without launching new pulses. Show fading and compute retained strength of the trained fingerprint.
- **LEARN** again: send another 24 pulses on the **same frozen morphology**. Compare how often the relay delivered successfully, recovered connection strength, and Jaccard overlap of heavily used edges with the first batch.

To begin: **WILD → allow growth or TRAIN → LEARN → REST → LEARN**. Additional TRACE, PLAST, PULSE, RELAY, and older features remain available. The new experiment uses its own frozen protocol so automatic TRAIN does not contaminate the comparison. Active phases temporarily block the most disruptive controls; WILD resets the experiment.

## Metrics

- **WIRES**: average nonzero edge strength divided by 255, as a percentage. This includes all active connections, not just the trained path.
- **RETAIN**: average *current* strength on the original reference fingerprint, divided by its strength after first training. Values above 100% are possible after subsequent training.
- **ROUTE**: Jaccard overlap between first-batch and second-batch heavily-used edges (the overlap divided by the union). This is a description of route **usage**, not evidence of a shortest-path solution.
- **SENT A B**: count of far-edge successes in the first and second 24-pulse batches respectively.
- **MEMORY** and **STEP**: phase and progress.

The first-batch fingerprint and summary statistics are retained by an **external observer only**, never shared with the agent state or consulted in transmission decisions. Pulse transmissions are independently randomized and locally reinforce successful adjacent edges. The reference image for the original interface is also not used by the network.

**Rest uses a new explicit exponential-decay operation**: present edge strengths are multiplied by 0.978 each rest step with a 48/255 floor. This differs from v0.7's per-pulse disuse decay; here silence genuinely weakens connections even when no pulses occur. This is an experimentally imposed model of forgetting, not an emergent discovery.

## Controlled browser run

Local Chromium rendering and programming checks on three screen sizes, deterministic seed 2026. Colonies evolved for 650 simulation updates before being frozen, and then completed LEARN (24 pulses) → REST (64 decay updates) → LEARN (24 pulses). No morphological changes occurred during the sequence.

| Viewport | Trained fingerprint edges | Retained after REST | Retained after second LEARN | Used-edge overlap | Delivery first → second |
| --- | ---: | ---: | ---: | ---: | ---: |
| 390×844 | 1,448 | 24% | 99% | 95% | 24/24 → 19/24 |
| 320×600 | 1,655 | 25% | 88% | 95% | 24/24 → 8/24 |
| 844×390 | 1,880 | 25% | 82% | 94% | 0/24 → 0/24 |

An absent full-width route cannot be created by changing only edge strength. The landscape colony illustrates this: it regained some connection strength and showed similar usage, but did not deliver across the whole field.

**Observation:** similar usage fingerprints can recur after training, and connection strength can recover while functional delivery remains below the first batch. These three cases differ in viewport topology, and repeated pulses within a network are not independent samples. This is a *toy demonstration* and not evidence of a general learning law.

## Validation

- JavaScript syntax checked with Node.
- All three layouts passed Chromium browser simulation with no JavaScript errors.
- Touch-equivalent clicks on PATHS, LEARN, REST, LEARN verified correct stage transitions in all three viewport shapes.
- The generation counter remained unchanged throughout frozen phases.
- First-batch reference was captured before decay; second-batch overlap was computed only after relearning.
- Original v0.7 preserved as `v0.7.html`.

## Next questions

1. Can rest cause alternate routes to become dominant instead of reactivating the old route?
2. Can two competing endpoints be trained so the colony retains both patterns?
3. Could equal total connection strength but different allocation produce different delivery rates?
4. Is a more conservative decay schedule enough to improve functional retention, or does it simply reduce adaptation?
5. Can local *replay* during rest protect selected edges without outside stimulation?

## Files

- `index.html`: v0.8 The Memory of a Path
- `v0.7.html`: Living Connections
- Earlier `v0.x.html` archives remain unchanged.

Deployment code has been committed to GitHub; a separate public Vercel deployment verification has not been completed.
