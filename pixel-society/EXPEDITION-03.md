# Pixel Society — Expedition 03: After the Forgetting (v0.4)

## Question

When a colony has lost its original blueprint, can it organize into a *different* locally coherent structure, and will that structure react to input?

This is a small, deterministic-rules cellular agent simulation, **not** language-model or sentient agents.

## New controls

| Control | Action |
| --- | --- |
| **WILD** | Removes every agent's fragment of testimony *about the interior field*, including overlap held across the field boundary; initializes a few decentralized color preferences and activates local, memory-independent pattern formation |
| **BREAK** | Damages visible roles and forgets testimony |
| **HEAL** | Accelerates gossip/exchange but supplies no original pattern |
| **LIE** | Introduces a coordinated false claim into overlapping witnesses |
| **RULE** | Cycles COUNT, REPUTATION, CONFIDENCE testimony weighting |
| **PROBE** | Finds a sizable emergent color cluster and tests whether it reacts to touch |

Touch an emerged colored patch to test its response directly. Tap the status strip to switch to the observer's diagnostic view. The earlier rumor trial remains available on the **T** keyboard shortcut. **RESET** is available through the debug API or browser reload.

## Measurements and how to read them

The observer sees an original founding image for *diagnostics only*. There is no master blueprint consulted by agents' choices or reformation.

- **KNOWN:** fraction of field locations with **at least one** surviving testimony. This is *availability of information*, not correctness.
- **AGREE:** fraction of field locations with **at least three distinct source witnesses**, with 75% or more supporting one claim. Copied testimony is attributed to its original source to prevent a repeated rumor counting as independent eyewitnesses.
- **SPLIT:** fraction of locations with three or more distinct witnesses but no 75% agreement.
- **ORIGIN:** fraction of original field locations with self-held center memories that match the founder's reference. This can fall to zero under WILD even when a pattern is functioning.
- **MOTIFS:** number of contiguous, same-color groups of at least six agents.
- **PINGS:** successful responses to a probe or touch in a patch with a same-color local neighborhood.

The state classifier is intentionally coarse:
- **AMNESIA**: under 15% witness coverage.
- **FRAGMENTS**: 15–55% witness coverage.
- **CONFUSION**: above 10% contested locations (after 55% coverage).
- **FALSE UNITY**: in inherited mode, enough witnesses coherently agree on a claim different from the founding image.
- **DIVERGENCE**: in WILD, a supported new pattern diverges from the founding image but has not demonstrated responsive behavior.
- **NEW ORDER**: a divergent WILD pattern has reacted to a probe at least once.
- **CONSENSUS / RECOVERING**: enough well-supported agreements / mixed intermediate evidence.

Notice that consensus is never inferred from a zero-dispute count alone.

## Test results

Browser simulation tested with Chromium, no network dependencies, and three viewport shapes: **390 × 844**, **844 × 390**, and **320 × 600**.

For each viewport:
1. New colony started at 100% witness coverage, classified **CONSENSUS**.
2. Immediately after WILD, 0% coverage and **AMNESIA**.
3. After 240 simulation updates, new colored patches were present and coverage was above zero.
4. PROBE found a responsive patch, increased the successful-response counter, and the classifier reported **NEW ORDER**.
5. No browser JavaScript errors occurred.

These are smoke tests on one deterministic evolving colony per viewport, not statistical estimates of spontaneous invention. One extended mobile-size run also exercised BREAK and HEAL without JS errors.

## What has and hasn't emerged

**Has:** clustered form, partial independent testimony for emergent form, and reactivity of stable clusters, without the founding image directing formation.

**Has not:** independently invented a recognizable button, a useful human interface, or a goal. The response criterion (at least three same-color neighbors) is a programmer-specified fitness test, and PROBE is an outside observer. The fixed top-row controls and status strip are also preassigned.

**Important baseline:** The observer reference is not the only implicit source of structure. Agents inherit a *behavioral grammar* (local neighborhood, birth/crowding rules, four color preferences). Results depend on those designed rules.

## Version archive

- `index.html` — v0.4 (current)
- `v0.3.html` — trust & rumors
- `v0.2.html` — distributed neighborhood memories
- `v0.1.html` — guided repair
