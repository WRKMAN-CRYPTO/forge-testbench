# Arcane Lab 039 | Solid Agent Impacts

## Why this build
The former 038 contact layer checked positions once every 100ms, applied a per-target cooldown, and **never consumed the contacting agent**. Agents therefore appeared to pass through enemies and rocks. The new game-layer `field-impacts.js` makes collision physical while leaving Agent·Field's canonical movement equations untouched.

## Rules
- At each game frame, cache each hex's *previous* field position; run the original `Motion.stepSwarm`, then check its swept world trajectory against scene solids.
- For moving enemies and rubble, also compare each body's previous and current center. A swept relative circle collision catches fast crossings that end outside the target.
- The **earliest** contacted surface consumes the agent. Agents do not bounce, respawn, pierce, or hit another object after impact in this pass. A hit reduces the living agent count.
- Targets: living enemies, solid breakable pillars, movable loose stone debris, and physical crates / training dummy. Only enemies and breakable pillars take damage in this pass. Loose debris and props absorb hits but do not themselves take programmed spell damage.
- Every touching hex is consumed even when target damage is capped. Damage is aggregated **once per target per frame** (up to 28 enemy damage, 30 pillar damage); the physical impact count is not throttled or capped. This avoids one damage API call per hex.
- Contact produces tiny short-lived impact rings, capped to three sample visuals per target each frame and 96 active per cast. No per-agent Matter bodies or permanent emitter effects.
- Moving Aura casts compare both old and new aura centers. World Emission's cast origin stays fixed. Placed Field remains stationary.
- The HUD now shows `LIVE` surviving hexes and cumulative `IMPACTS` (consumed hexes), alongside drawn and offscreen counts.
- Up to three World Emissions with Aura / Placed Field coexist within the existing 6,000 **live agent** ceiling. Consumed agents release capacity for future casts. Expiration and region reset still clear casts normally.
- Linked Minor Heal still fires every 3s while the parent cast remains active, even if all of its hexes have been consumed; its timer is separate from contact physics.

## Performance
The collision layer uses 96-world-unit spatial bins and compact numeric keys. It only computes circle intersections for candidate objects intersecting an agent's swept grid cells. The high-level movement engine and full configured simulation population are unchanged.

Testing in a non-device JavaScript runtime:
- Swept crossing, stationary overlap, near miss and moving-target crossing passed.
- Enemy, pillar, debris and crate hit-consumption tests passed.
- Damage routes passed (debris and crates absorb, but do not take combat damage).
- Standalone JavaScript syntax checks passed.
- A synthetic environment with 8 enemies, 4 pillars, and 36 debris objects ran for 60 frames with 1,200 and 6,000 initially spawned agents. This is a **stress test, not a measured iPhone frame rate**; 6,000 remains experimental and can be demanding.

## Playtest
1. Open Arcane Lab 039, equip a **World Emission** spell.
2. Start with **1,200 simulated agents** and 1,200 rendered.
3. Paint a tight white spawn band at the top and a gray-to-black path below, save and equip.
4. Aim straight through an enemy, a stone pillar, then loose rubble. Agents should **disappear on first contact** and briefly flash at impact.
5. Inspect the top HUD: `IMPACTS` should increase while `LIVE` decreases.
6. Test Aura against a charging enemy, including a moving encounter, and confirm healing still centers on the caster.

## Future variations
Piercing, ricochets, bounce, absorption, elemental reactions, and scripted emitters should become explicitly craftable behaviors instead of being implicit physics exceptions. The collision kernel is separate from the shared 32×32 movement code for that reason.

_W / Clock In. Build Something._
