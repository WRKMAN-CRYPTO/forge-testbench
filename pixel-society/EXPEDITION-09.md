# Pixel Society — Expedition 09: The Labor Market (v1.0)

## Question

What happens when pixel agents can decide which jobs are worth doing, move between occupations, or accept offers from neighboring rival button makers?

Version 0.9 had unrestricted linker-chain recruitment, and in the user's screen recordings the linkers became much more numerous than the agents forming buttons. Version 1.0 tests a tiny **local labor market** as an alternative. This is a rule-based toy simulation, not autonomous LLMs or sentient workers.

## Rules

Every logical pixel in the field has its own job, employer (clan), obedience, inherited genome/temperament, **job tenure**, and **observed work score**. The employer's pixel manager advertises a staffing plan reflecting its own crew size, messaging outcomes, and formatting demand. Individuals periodically review the jobs they could do, considering:

- **Individual aptitude:** deterministic, inherited gene/temperament preferences for ordinary construction, linking, formatting, and text.
- **Local demand:** a shortfall increases the value of that occupation; excess specialists decrease it.
- **Recent contribution:** successful transmissions reward participating linkers; fulfilled formatting orders reward formatters; border and glyph work reward ordinary construction agents.
- **Local peer influence:** neighbors doing a job can make it more attractive.
- **Stability:** agents have a tenure/cooldown and some loyalty to their present employer. They sometimes refuse offers.
- **Poaching:** an agent must be in physical cardinal-neighbor contact with a different crew's linker. An employer with linker vacancies can make an offer; the worker compares it with their current work and may refuse. Accepted offers change employer and role.

**Button makers** remain actual leader pixels, not a global governing algorithm. **Text makers can only be appointed by their own button maker**; agents cannot self-appoint to TEXT. **Formatters** still erase actual neighborhood memory only after an explicit WIPE order. Some people remain ordinary border workers; **LINKER** overstaffing is discouraged.

No simulated wages, money, skills training, freeform AI language, or true negotiation are present. The job-choice scores are designed equations.

## How to run

1. Tap **JOBS** in the colony's top strip.
2. Let the button makers recruit people and watch class proportions evolve.
3. Tap **ECON** to alternate between the new labor-market rules (**on**, the default) and the original unrestricted job assignment rules (**off**).
4. Tap within a partially formed button to send a message. Sending requires a linker, and crossing groups requires an adjacent actual linker chain.
5. Tap **WIPE** followed by a button to order its formatter to erase a memory patch.

The status strip tracks the four occupations, career switches (**SW**), worker transfers to rival employers (**PO**), button border assembly (**EDGE**), text staffing, sent/delivered messages, and formatting.

For reproducible comparisons, use the browser console:
`pixelSociety.reseed(2026)`, then `pixelSociety.jobStart()`, and `pixelSociety.runSteps(1000)`. To compare ECON off, call `pixelSociety.jobMarket()` **before** `jobStart()` on a newly reseeded colony. Calling ECON midway through the run demonstrates a policy change but is **not** a matched-start comparison. Detailed results: `pixelSociety.jobReport()` and `pixelSociety.jobAt(x,y)`.

## Smoke tests

Node JavaScript syntax validation passed. Local Chromium ran with touch emulation at **320×600**, **390×844**, and **844×390**, confirming that the onscreen JOBS and ECON controls toggle properly, text makers are hired, a button can send a message, and no JavaScript page errors occur.

### Matched-start observations, seed 2026, 1000 updates

| Browser size | ECON linker count | Original linker count | ECON career changes | ECON poaches |
|---|---:|---:|---:|---:|
| 390×844 | 270 | 370 | 303 | 8 |
| 844×390 | 233 | 340 | 377 | 17 |

Both approaches had formed four text makers. Border completion remained imperfect: 32% (ECON) vs 36% (original) on 390×844, and 47% (ECON) vs 46% (original) on 844×390. At this checkpoint, all four message requests in the ECON condition stayed local; two of four original requests crossed groups on portrait, four of four on landscape. **Reducing specialist crowding can delay long-distance connection formation.**

### Extended single-run observation, seed 2026, 390×844, ECON enabled

Over 1,600+ simulation updates, the market recorded **22 poaches** and formed **two successful cross-group deliveries among 16 requests**, the final four requests occurring after groups had grown and made physical contact. Other requests remained local. An earlier contact check with seed 2026 showed no poaches before groups touched.

These are **descriptive examples only**, not estimates of general performance. Screens and starting seeds affect topology. Sequential messages and career decisions share one evolving colony, so observations are not independent. Automated simulation speedups and interactive play can differ.

## What we learned

1. Jobs can change based on individual variation, recent usefulness, and a local employer's staffing shortages.
2. Workforces can remain mixed; text makers stay specifically recruited by button chiefs.
3. Employer competition requires actual physical contact and sometimes produces transfers.
4. The original unrestricted linker economy forms bridges earlier on these tests, but uses more linker agents.
5. Fewer linkers are not automatically a better outcome. User-facing button completeness and cross-group communications must be evaluated together.

## Constraints

- The button makers still start in fixed rectangles with labels and have programmed grammar for borders and 5×7 glyphs.
- ECON decisions use designed utility functions; no agent formulates its own objective or a human concept of a career.
- Message paths are simulated by a BFS diagnostic over local adjacency; transmission still depends on actual LINKER occupations.
- Immediate career switching does not change the original 0.8 PATHS, TRACE, plastic connections, or LEARN/REST demos outside JOBS mode.
- Only local Chromium was tested; public Vercel publication is not established by these tests.

## Next experiment ideas

- Give button chiefs a limited recruitment budget, so every new linker means sacrificing something else.
- Make economic feedback local by introducing apprenticeship agents that carry vacancy bulletin messages.
- Test defection of a **highly effective bridge linker** and measure the damage to both employers.
- Let two button chiefs dispute borders or exchange labor by mutual agreement.

## Archive

- `index.html`: v1.0 labor market
- `v0.9.html`: original job-class system
- `v0.8.html`, `v0.7.html`, and earlier archives: preserved previous experiments
