# Wandrune 058 · Rune Six: ⟡ CONVERGENCE

**Definition:** Selected agents learn to regroup with other rune-marked agents of their own element when they have no active Seeker target.

This is the **sixth** rune (ID `6`) in the existing 32 × 32 `runes` layer. IDs 0–5 remain unchanged.

## Rules

- Convergence is learned only at a painted ⟡ rune pixel, either **on birth** (rune overlapped with the chosen source pixel) or by **swept crossing**.
- Agents remember it for the duration of their life. Unmarked agents do not regroup. That is how painters control the *fraction* of a 200- or 6,000-agent spell that participates; painted coverage is not an exact numeric quota.
- **Hunting has priority.** When an agent has a currently active Seeker rune *and* an eligible nearby enemy, it seeks the enemy. Convergence does not redirect it.
- When not actively hunting, rune-marked agents of the same element within **the same cast** steer toward their common center, slowing their regrouping inside a 36-world-unit gathering zone. They do not teleport.
- Fire finds Fire; Frost finds Frost; Lightning finds Lightning; Water finds Water. Neutral only finds Neutral. Unmarked agents cannot lure marked agents.
- Convergence adds no mass, new bodies, damage, speed cap exceptions, or duration extensions. The current underlying 32 × 32 field remains authoritative, and Convergence adds only capped lateral steering.
- Behemoth bodies inherit learned Convergence if either merging body carried it. Fracture children inherit their parent's marked status; represented mass is conserved. Convergence itself **never merges bodies**.
- Idle marked agent counts appear in Spell Forge preview and the live cast HUD. The preview highlights actively regrouping agents in pale mint.

## How to craft a hunting blizzard

1. Open ☰ → SPELL FORGE. On the **SOURCE** layer, paint Frost emitters in only the locations where you want ice to be born.
2. On the **RUNE** layer, paint **⌖ SEEKER** along the route all hunters should cross. This establishes the original pursuit.
3. Place **⟡ CONVERGENCE** on a subset of Frost spawn pixels, or on downstream paths crossed by only some agents. That subset learns the new regrouping behavior.
4. Use preview at 200 / 600 / 6,000 agents and watch **⟡ MARKED / REGROUPING**. Keep the chosen coverage when you save the spell.
5. When enemies disappear or Seeker's 2-second activation expires, marked ice agents gradually gather with their kin. They disperse to hunt again when a new Seeker target is available. Behemoth is optional and separate.

## Architecture & tests

- `swarm-runes.js`: registry ID 6; rune memory on birth / swept crossing; priority Seeker control; O(n + E × active Seekers) elemental centroid regrouping, no all-pairs neighbor loops; inherited status on mass merge / Fracture.
- `spell-forge.js`: seven rune/erase buttons, 32 × 32 painter, preview marker, marked/regrouping counts.
- `crafted-magic.js`: observational Convergence telemetry only.
- `index.html`: script version bust to Build 058; HUD/guide text.
- `swarm-runes.tests.js`: 12 tests including six-rune validation, selective acquisition, high-speed crossing, no cross-element attraction, Seeker precedence, dead/lost target, merge/fracture inheritance, and 6,000-agent body conservation.

Run locally: `node magic-lab/swarm-runes.tests.js`.

The tests exercise the rune interpreter in isolation. A manual iPhone arena smoke test is still recommended because actual gameplay/visual behavior depends on the active field recipe and enemy placement.