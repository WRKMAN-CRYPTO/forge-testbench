# Pixel Society — Expedition 15: Underground Infrastructure (v1.7)

## Request
“Let's make linkers live under other agents.”

## Architecture
This revision adds a **second simulated occupancy layer at the same pixel coordinate**. The surface agent retains its ordinary job and visual role, while a distinct underground linker may independently occupy that coordinate. It is therefore no longer strictly one agent per logical pixel: there may be **two separate computational agents per coordinate**. The work still renders in one HTML canvas.

- **Surface:** button maker, normal builder, formatter, text maker, foreman, or an unassigned surface pixel. These are stored in the existing `occupation` and `clan` fields, which retain their previous UI roles and painting rules.
- **Underground:** linker or empty. Linkers are stored in independent `underClan`, `underGene`, `underTenure`, and `underUse` arrays. Hiring an underground linker never changes `occupation`, `clan`, or visible color of the surface agent directly above.
- **No remote jumps:** underground chains extend only through adjacent underground slots. Only collinear touching chains absorb one another. The existing four-neighbor message routing works on underground linkers, with a final hop to a surface worker in another button region.
- **Employment economics:** underground linkers still count toward their employer's linker tally and cost 3 specialist budget units each. Surface employees are accounted for separately; hiring a buried linker does not demote a surface employee.
- **Foremen and recruiters:** a foreman can fill a gap in an underground chain, while remaining a surface agent. Button makers can poach underground linkers at a physical point of contact while still below their 99% completion threshold; the transfer changes underground employment only.
- **Wipe:** formatter commands still erase surface agent testimony; linker job identity is a separate kind of persistent labor state and is not erased by this order, consistent with earlier formatter semantics.

## Controls
The existing field-header controls are now displayed as **WIP / ECO / SUB / JOB** to make room on compact screens:
- **WIP:** arm the formatter command
- **ECO:** toggle the local labor-market rules
- **SUB:** inspect the subsurface network, tap again to see the ordinary surface
- **JOB:** begin or stop the workforce experiment

Keyboard **Y** also toggles the underground view. The observation overlay colors buried linkers cyan/blue and dims slots without one. Rendering the underground view **does not move or create agents**. The rest of the interface and the 300-steps/s requested simulation rate are preserved.

The programmatic `pixelSociety.jobAt(x,y)` now reports both `job` (surface) and `underground` (an object with employer, genome, contribution history, and chain identity, or null). `pixelSociety.jobReport().underground` reports current underground headcount, number co-occupied with a recruited surface worker, hires, departures, transfers, and which view is active.

## Local tests
The standalone HTML passed `node --check` and local Chromium tests at **390×844**, **320×600**, and **844×390**, with no JavaScript page errors in the tested scenarios. All were freshly seeded with 2026, began JOBS, and executed 550 logical updates.

| Browser size | Underground linkers | Co-occupied with recruited surface agents | Active completed straight bridges | First button-message attempt |
| --- | ---: | ---: | ---: | --- |
| 390×844 | 134 | 66 | 2 | delivered |
| 320×600 | 125 | 63 | 1 | delivered |
| 844×390 | 105 | 68 | 2 | delivered |

These numbers are snapshots from deterministic local runs, not performance averages.

Actual touchscreen-equivalent taps on the SUB header worked on all three layouts: the inspector changed from surface to underground and back, while the live network and job state continued independently. A 390×844 extended local snapshot of 1,000 logical updates showed **138 buried linkers, 101 co-occupied** with a recruited surface worker, and 4 recruited text makers.

## Cautions
- This is a **true second data layer** but not 3D physics or literal biological organisms living underground.
- The linkers still have designed jobs, chain rules, fixed four-neighbor geometry, and reward functions.
- A large underground network is no longer inherently visible from the surface. SUB is an inspection view, not a new simulated worker activity.
- Because the roles are separate, the population and random-number stream differ from v1.6. Border completion and message throughput should be benchmarked separately rather than assumed better.
- Resource scarcity remains: stacking agents does not eliminate specialist budget cost.
- A previous v1.6 copy was archived as `v1.6.html`.
- The GitHub source is verified. The Vercel production deployment was not independently inspected.

## New hypotheses
1. Does removing competition for pixel display space let borders reach 99% faster?
2. Can hidden communication infrastructure survive surface restructuring?
3. Do underground chains grow unnecessarily because button makers can no longer visually see their size?
4. Will future cost policies need to price **subsurface occupancy** separately from the ordinary workforce?
