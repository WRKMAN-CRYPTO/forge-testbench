# Pixel Society — Expedition 14: The Cost of Doing Business (v1.6)

## Question
The user's fast-running colony accumulated more than a thousand linker workers while button borders were stuck around 90–92% completion. Would requiring button chiefs to account for the **opportunity cost of specialists** increase construction progress, and what would that do to communication?

## New policy: COST vs SPREE
During **JOBS** mode, the fourth control in the bottom row toggles **COST** (default) and **SPREE** (unrestricted). The other three remain FORE/SOLO, LEAN/CLASS, and CHAIN/FREE (shortened to LINE/FREE on narrow displays). Keyboard **N** also toggles the new comparison mode. The current mode appears in the status row. Prior job systems, 99% per-button recruitment threshold, and 10x simulation clock are unchanged.

The new rule is a **local specialist budget per button company**, not a global salary pool. Every occupied pixel remains a real worker; an ordinary builder uses no *specialist* slots, whereas LINKER costs 3 slots, FORMATTER 3, TEXT 2, and FOREMAN 4. Button makers themselves use zero. An unfinished border sets aside part of that company's budget for ordinary border work, temporarily lowering how many specialists it can carry.

For each maker with perimeter length P, specialist capacity is `max(70, round(1.05P + 30))`. The builder reserve is `ceil(0.4 × missing border pixels)`. A promotion or new specialist hire may proceed only if it fits within capacity after the reserve. Ordinary workers may still be hired freely, subject to the existing physical adjacency and refusal rules. Thus this does **not** model the total cost of every employee; it models a company's finite capacity for specialist roles and the effect of setting aside budget for unfinished construction.

The existing personal career utility function also discourages excess linkers near the cap. This affects voluntary career changes. New chain growth, manager appointments, ordinary-specialist promotions, and rival-linker poaching all respect the recipient's specialist limit. Demoting an expensive specialist to ordinary builder frees slots. There is no teleportation, arbitrary forced mass dismissal, or instant repainting of borders. Switching SPREE off removes these new limits, preserving the previous recruitment tendencies in the same source.

The status shows EDGE completion and COST percentage. `pixelSociety.jobReport().accounting` reports enabled status, slots spent/capacity, reserved slots, available capacity, denied hiring actions, and capacity released by career changes. Each chief has its own ledger. `pixelSociety.accounting()` exposes the toggle programmatically.

## Local browser tests
JavaScript syntax checked with Node. Chromium touch tests verified the **COST/SPREE** button on actual canvas coordinates, in 390×844, 320×600, and 844×390 layouts, with no runtime JavaScript exceptions. JOBS, four maker crews, and message requests still functioned. The updated 10× requested tick clock remains enabled. Source runs without external dependencies.

### Matched-start comparison, 390×844, 1,000 logical updates
Freshly reseeded colonies for each condition, same deterministic seed within each pair. COST was left on from start; SPREE was toggled *before* starting evolution. All four button requests were attempted after the 1,000th update.

| Seed | Policy | Linkers | Border completion | Messages delivered / 4 |
| --- | --- | ---: | ---: | ---: |
| 2026 | COST | 169 | 62% | 1 |
| 2026 | SPREE | 302 | 54% | 3 |
| 42 | COST | 164 | 58% | 0 |
| 42 | SPREE | 359 | 54% | 4 |

On seed 2026 at the 1,000-update checkpoint, COST had **575 of 656 specialist slots occupied**, plus a separate **79-slot builder reserve**. New specialist hiring attempts had been denied thousands of times; those counters are repeated attempts, *not unique worker losses*. Under SPREE the company combined spent 977 nominal slots, exceeding its budget because the restriction was disabled.

**Interpretation:** the resource policy reduces linker expansion and modestly improves the button perimeter in these two examples, but cross-group messaging becomes less reliable. This is a real trade-off in the toy system, not a universally improved setting or a statistically supported average. Each four-message batch is correlated within one colony.

## Caught and corrected
The first prototype charged every ordinary worker against a strict total payroll. It throttled construction severely and produced ~15% border completion at 500 updates. We corrected this to a **specialist-only** capacity with ordinary worker recruitment unrestricted. That refinement is part of the released source.

## Limitations and next experiments
- The financial metaphor is schematic: no money, external economy, preferences about money, or learned budget arithmetic exists. Budget and job utilities are programmed; worker acceptance remains stochastic.
- A minimal working chain can be fragile. Having spare linkers can improve resilience when someone changes careers; **redundant** does not always mean **waste**.
- No rigorous reliability guarantee is included. The same seed under distinct policies consumes randomness differently once paths diverge.
- A good next experiment: count **independent alternative bridges** and award a small reserve for fault tolerance, then remove one highly used linker to test repair versus staffing cost.

## Files
- `index.html`: v1.6 The Cost of Doing Business
- `v1.5.html`: tenfold-tempo baseline
- Previous `v1.x.html` and `v0.x.html` archived versions remain.

GitHub source was committed. Public Vercel deployment has not been independently verified by these local browser checks.
