# WRKMAN ARCANE LAB 051 | Glassrunner

**Build:** 051
**Where:** the original laboratory and one per non-sanctuary arena in every Stargate region. Sector 0 remains a safe sanctuary.

## Why Glassrunner exists
Test counterplay to player-authored **homing swarms**, especially Seeker + Behemoth. Do not grant AI knowledge of spells or grant artificial invulnerability. The creature watches what agents **actually do** in world space.

## Behavior
- **PROWL:** stalks/strafe-orbits the wizard, broadly holding a medium range instead of charging straight in.
- **TRACKING:** an approaching projectile has been detected. It estimates its trajectory via relative world-space velocity and projected closest approach over the next 0.85 seconds.
- **SIDESTEP!:** a 155-ms visual warning with a cyan direction streak. Does not move instantly; ordinary hits still land.
- **DODGE:** executes a physical lateral Matter velocity burst. Can overshoot a short-range threat or dodge one projectile into another.
- **RECOVER:** briefly slows before it can evade again; no immunity.
- **STAGGER:** frost or kinetic stagger interrupts a windup and delays the next dodge.

Glassrunner starts with two sidesteps, restores one roughly every 2.8 seconds after depletion, and is additionally constrained by a 1+ second recovery period. A new hostile Glassrunner has a brief initial grace period before evasions can begin. It is fragile compared with Gravelhorn (125 HP, 19-radius collision).

## Physics and cost
- A mind that is separate from Phaser: `glassrunner-mind.js`.
- Detection draws from living `scene.craftedShots` and `scene.craftedAura` agents. It transforms their 360×500 local field positions and velocities to world coordinates. Prediction is based on physical trajectories, not the words `seeker`, `homing`, or on the player's equipped spell.
- At most ~340 sampled agents **per active cast per 95-ms decision**, keeping phone work bounded even with a full 6,000-agent cast.
- Behemoth's **actual stored mass and collision radius** are evaluated through the runtime-loaded shared rune module. There is no separate large-projectile exception.
- Dodge selection compares left vs right relative to projectile direction, penalizing wall bounds, static props and closeness to the wizard.
- Movement comes exclusively from `Matter.Body.setVelocity` for the actual dodge and `Matter.Body.applyForce` for ordinary pursuit.
- Ordinary crafted hits and elemental reactions still damage it during dodge. Frost stagger interrupts a pending leap rather than secretly delaying an invincible dodge animation. Damaging it reverses strafe tendency, without granting immunity.
- Existing Charger, Wisp, Mossling and Gravelhorn behaviors remain intact.

## Practical manual playtest
1. Open `https://wrkman-crypto.github.io/forge-testbench/magic-lab/?v=051` and start in the original laboratory.
2. Look for the **slender cyan crystal lizard** toward the eastern side. It has a named state above its head.
3. Equip the **homing fire spell** you authored. Try one giant Behemoth first; then small and medium seeking fireballs.
4. Look for **SIDESTEP! → DODGE → RECOVER**.
5. Test a spread arriving from multiple directions and try frost: it should still collide or be staggered under normal physical rules.
6. Dial a Stargate and travel to any **hostile** arena: one Glassrunner joins the other residents. The sanctuary has none.

## Validation
- Pure decision tests: incoming vs receding vs missed trajectory, finite charges, windup, single launch, recover, and obstacle-side selection.
- Integration with mocked Phaser/Matter: Glassrunner constructed; detects an incoming actual mass-12 swarm; performs physically represented sideways leap; takes damage during evade; old Wisp still spawns.
- Render tests: Glassrunner graphics and visual label functions execute.
- Level placement: exactly one Glassrunner in test hostile sector, none in sanctuary.
- Late-loaded Runes integration: even when Combat is evaluated *before* Runes, a physical mass-200 projectile is sensed with its correct oversized radius.
- Frost stagger interrupts and resets the leap schedule; no-false-dodge testing without incoming shots.
- Browser game's inline scripts compile. Browser-live user test is still needed.

## Next-pass questions (based on player observations)
- Is the dodge too slow against small fast seekers or too generous against massive ones?
- Should it duck behind cover, rather than always choose lateral motion?
- Does its recovery tell remain visible against a 200-agent spell?
