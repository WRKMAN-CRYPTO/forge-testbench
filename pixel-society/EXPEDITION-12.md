# Pixel Society — Expedition 12: Chain Reaction (v1.3)

## User's proposed rule
Reward linkers that form **long straight chains**. If a growing chain physically contacts a shorter chain, the longer chain absorbs the shorter and gains its actual members. Growth stops when a chain physically connects two buttons.

## What changed
- **CHAIN** is on by default in JOBS mode. The bottom-right **CHAIN / FREE** toggle (keyboard **X**) switches between physically constrained chain growth and the original unrestricted linker frontier. Existing **LEAN / CLASS**, ECON, button border reclamation, jobs, text makers, formatters, messaging, TRACE, and plastic wires remain.
- Each active linker receives a separate chain identity and a horizontal or vertical orientation. Its employer remains distinct from that chain identity. A chain advances only by recruiting an immediately adjacent pixel at one of its two collinear endpoints.
- A new recruit can refuse; a worker employed by a rival group cannot be overwritten by growth. On the chain's own border, employees can still render a gold border while employed as linkers.
- **Absorption:** Two distinct chains merge only when they actually meet end-to-end on the **same row or column**, with matching orientations. The longer takes the shorter's real member list. Perpendicular encounters and disconnected pixels do not count; a one-pixel addition counts as growth, not a two-plus-worker merger. The merged length is the number of physically continuous member pixels, not a virtual score.
- Longer chains earn more personal job-use credit, giving individual linkers an incentive to maintain a successful straight chain. Crews that are demonstrably connected receive extra credit. This is a designed reward function, not independently invented economic behavior.
- A chain is **connected** when its real linker members touch actual employees inside **two different button-maker regions**. Non-linker employees at the destination are allowed to receive the final hop; they cannot forward messages as linkers. Both the regular button-message test and the LEAN diagnostic use this physical recipient rule.
- Connected chains stop extending. If the route is cut by a career change, its survivors are eligible to regrow. Chain affiliation never teleports or forcibly changes an agent's employer.
- A small cyan/blue glow highlights recruited straight chains. Completed chain spans take on a warmer glow.
- The bottom status strip shows longest observed chain length, mergers of chains with at least two members, and the number of connection events. `pixelSociety.jobReport().chain` exposes ongoing statistics, including **activeBridges** (currently intact, rather than historical connections).

## Testing
JavaScript syntax checked with Node. Chromium touch tests passed for three viewport dimensions, including actual taps of the CHAIN/FREE toggle twice, 1,000 accelerated simulation steps, and four button-message requests. No page JavaScript exceptions.

Deterministic seed 2026, CHAIN on:

| Viewport | Longest observed straight chain | Mergers (2+ absorbed) | Current active bridges | Successful button message tests |
|---|---:|---:|---:|---:|
| 390 × 844 | 40 pixels | 931 | 4 | 4/4 |
| 320 × 600 | 23 pixels | 546 | 2 | 4/4 |
| 844 × 390 | 39 pixels | 577 | 2 | 4/4 |

One earlier 1,600-step paired observation in the 390 × 844 layout, seed 2026, found global gold-border completion of **80% with CHAIN** versus **68% in the archived v1.2**. This is *not* a controlled one-rule-only A/B comparison because v1.3 also adjusts gold-border rendering and button endpoint behavior.

## Interpretation and cautions
- A chain's merger counter is **cumulative** and can rise rapidly as workers change occupations, split runs, and merge again. It is *not* the number of permanent independent organizations. The active bridge count is more useful for current connectivity.
- Long chains do not automatically imply reliable communication: the test still needs adjacent actual linker workers and a button-region receiver. A chain may also break during career changes.
- The chain growth policy and reward rules are explicitly designed. These are simple interacting agent state machines, not sentient agents or a general learned optimization algorithm.
- Different screen proportions change the relative distance between button makers. A short vertical bridge may be easier than a long horizontal one.
- The trace/path/wire controls outside JOBS continue to use their prior definitions and are not reinterpreted as chain identities.

## Files
- `index.html` — current 1.3 Chain Reaction
- `v1.2.html` — previous button reclamation behavior
- `v1.1.html` and earlier archives preserved
- Public Vercel deployment was not independently tested; GitHub source was updated and verified.
