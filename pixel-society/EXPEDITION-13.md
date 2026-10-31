# Pixel Society — Expedition 13: Foremen (v1.4)

## Request
Introduce a new pixel-agent occupation: **FOREMAN**.

## Behavior
Button makers appoint foremen from their own **ordinary, already recruited agents** once a crew has at least 16 members. Each group can eventually support up to three foremen, depending on its size and outstanding border work. They cannot self-appoint.

Foremen are lime-green pixels, distinguishable from gold button chiefs, cyan linkers, pink formatters, and yellow text makers. Each foreman can survey **only nearby pixels**. At a modest periodic interval it finds an unfinished part of its own group's border, issues a **temporary, attributed work order**, and may slightly increase the recipient's willingness to obey.

- A worker still assembles the border through the previous stochastic local construction rules; the foreman never paints the border directly.
- An unrecruited border candidate still requires contact with adjacent members of the group and can refuse an offer.
- A foreman earns *individual work credit* for a recruited worker or a genuinely repaired border event attributable to its own instruction.
- When nearby repairs are scarce and the button group needs linkers, a foreman can offer a local ordinary worker a change into a gap in an existing adjacent linker line. That change remains probabilistic and does not relocate an agent.
- Foremen do not override the chain identity, button makers' 99% completion threshold, LEAN/CLASS rewards, or specialist recruitment rules.
- The existing single-canvas interface uses the bottom-left **FORE / SOLO** button when JOBS mode is active (replacing the PATHS toggle only within JOBS). **Q** also toggles the experiment. When JOBS ends, PATHS returns.
- SOLO retires every current foreman to ordinary work and invalidates outstanding supervision orders. FORE allows button makers to appoint supervisors again.

## Measurement
`pixelSociety.jobReport().foreman` shows whether supervision is enabled, **orders**, **repair events**, **recruits**, and **link-gap assists**. Each group reports its assigned foremen and task contributions. The status strip adds **M** for foremen. `pixelSociety.jobAt(x,y)` identifies a foreman and the temporary supervising pixel for an instructed agent.

These are **events**, not counts of unique border locations. A location can deteriorate and be repaired repeatedly. The appointment scoring, local authority radius, and the reward formula are designed by the simulation, not evolved spontaneously.

## Local tests
- JavaScript syntax validated using Node.
- Chromium run with inline source on **390×844, 320×600, 844×390** viewports; no JavaScript page errors.
- On each viewport, after 810 simulation updates, 12 foremen across four companies had issued temporary work orders and earned credit for border repair events.
- Actual canvas clicks for FORE/SOLO **retired all foremen**, then restored appointments; checked in all three viewport layouts.

### Two matched-seed demonstrations (390×844)

| Seed | Updates | FORE border completion | SOLO border completion |
|---|---:|---:|---:|
| 2026 | 1000 | 62% | 43% |
| 2026 | 1550 | 83% | 79% |
| 42 | 1000 | 55% | 53% |
| 42 | 1550 | 81% | 81% |

For seed 2026 at 1,550 updates, FORE employed 537 linkers compared with 289 linkers in SOLO. The improvement in border assembly therefore **does not imply greater labor efficiency**. The 1,550-step comparison for a third planned seed did not complete within the test time budget, so it is not reported.

These few deterministic-seed examples are not a statistical claim, and different startup rules may consume the random number stream differently. Foremen also alter subsequent career and recruitment decisions, not solely border-painting speed.

## Open questions
- Would one foreman per crew outperform three?
- Does a high work-order volume saturate the workers and amplify redundant repairs?
- Can foremen develop different specializations for border construction and communication maintenance?
- Can ineffective foremen resign or be replaced based on their performance?
- Do better borders come at the expense of critical bridge-worker headcount and cross-group message reliability?

## Archive
- `index.html`: v1.4 Foremen
- `v1.3.html`: chain reaction baseline
- Earlier versions retained.

GitHub contents were committed. Public Vercel deployment was not independently verified.
