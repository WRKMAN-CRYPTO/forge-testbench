# Pixel Society — Expedition 06: Living Connections (v0.7)

## Question
Can local, activity-dependent reinforcement make a frozen pixel network transmit signals more reliably, and can that happen without changing its 2D physical arrangement?

## New controls
- **TRACE**: freezes agent morphogenesis and shows shortest hop distances from one chosen source, as in v0.6
- **PLAST**: toggles plasticity. PLASTIC learns from successful local edge transmissions; STATIC retains fixed edge strengths
- **PULSE**: stimulates a single source and propagates a *probabilistic* signal through cardinally adjacent agents of the same color
- **TRAIN**: in WILD mode, runs the original structural RELAY and the new probabilistic PULSE together once immediately, then every 60 simulation steps

Suggested demonstration: **WILD → TRAIN → TRACE → PULSE repeatedly**. The snapshot is frozen, but synapses can still change. Tapping PLAST switches to STATIC mode for comparison; switching mode after learning does **not** reset the already-trained strengths. Use fresh `reseed(n)` resets for a fairer comparison.

## Mechanism
Each undirected horizontal or vertical same-color neighbor pair carries an 8-bit connection strength. New edges start at a modest randomized strength (72–122). Each PULSE has one selected source on a left-edge connected component. The observer simulates transmission through each neighboring edge using probability `1 - exp(-strength/32)`. This results in realistic-looking but wholly synthetic transmission failures, not any physical electrical activity.

When PLASTIC is enabled, successfully traversed edges gain 14 strength units (up to 255); every fourth pulse, other extant edges lose one unit (to a minimum of 1). Edges immediately disappear when the neighboring agent colors no longer match. In STATIC mode neither reinforcement nor fading occurs.

The *agents* do not know the far-edge destination. The field's original reference picture is never consulted to train synapses. An external experimenter chooses a consistent pulse source and records reach, delivered pulses, population-average connection strength, and connection use.

A PULSE animates only successful transmissions as a moving signal. During TRACE, the field remains frozen even when PULSE is invoked repeatedly.

## Initial paired-seed experiments

Local Chromium browser, portrait 390 × 844, **650 evolution updates** from the given seed, then freeze, then **50 PULSE trials** with the same initial morphology. STATIC and PLASTIC runs were reset separately with the identical initial seed before each condition. There was no evolving morphology during the 50 pulses.

| Seed | STATIC deliveries / 50 | PLASTIC deliveries / 50 | STATIC mean reach | PLASTIC mean reach |
| --- | ---: | ---: | ---: | ---: |
| 8675309 | 0 | 0 | 39.5% | 56.0% |
| 42 | 0 | 0 | 32.8% | 35.8% |
| 2026 | 16 | 47 | 38.1% | 94.0% |

For seed **2026**, the population-wide mean edge strength rose from approximately **38%** to **54%** under PLASTIC, while the STATIC condition stayed near **38%**. The learned pathway's reliability, not the underlying frozen agent layout, accounts for this change **within the designed simulation rules**.

**Limits:** only three seed conditions tested; trials within each frozen colony are correlated; network connectivity differs across seeds; a static physical path is a necessary prerequisite to full delivery; and these learning rules were hand-designed. There is no evidence here of cognitive processes, sentience, biological neuronal behavior, or general-purpose learning.

The initial stochastic sampling streams differ after each condition begins to influence traversal, so these are matched initial conditions, not pairwise-identical pulse trajectories. In seed 2026 the initial network connected to the right edge; in the other two cases strengthening could improve reach without inventing a complete new geometric route.

## Validation
- JavaScript syntax checked with Node.
- Chromium single-canvas smoke tests at 390 × 844, 844 × 390, and 320 × 600.
- Tests exercised WILD, evolution, PULSE, TRACE frozen steps, PULSE during a frozen trace, switching to STATIC, and subsequent pulses.
- Three viewports showed no page JavaScript exceptions; responsive landscape and portrait controls.
- No Vercel-public URL inspection in these local tests.

## Archive
- `index.html`: v0.7 Living Connections
- `v0.6.html`: frozen topology
- Earlier versions in their own `v0.x.html` files

## Next questions
- Does pruning unused edges eventually reduce robustness?
- Can a colony learn multiple alternative paths instead of reinforcing only the familiar route?
- Does moving the input or receiver reveal brittle specialization?
- Can we compare equal-strength total wire budgets to distinguish training from simply adding more transmission capacity?
