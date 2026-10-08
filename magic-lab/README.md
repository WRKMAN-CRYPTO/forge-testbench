# WRKMAN Magic Physics Laboratory 001

A tiny playable spell-interaction sandbox powered by **Phaser 3.90.0** and **Matter.js**. Created as the first experiment toward a PC + mobile online co-op action roguelike.

## Open it
If GitHub Pages is enabled for the repository's `main` branch, visit:
https://wrkman-crypto.github.io/forge-testbench/magic-lab/

Or serve this folder from any static HTTP server. The first load needs an internet connection to fetch Phaser 3.90 from Cloudflare CDN.

## Controls

| PC | Phone / tablet |
| --- | --- |
| WASD / arrow keys: move | Left thumbstick: move |
| Mouse: aim; click: cast | Tap the arena: cast toward a position |
| 1, 2, 3, 4: select spell | Tap spell buttons: choose + cast |
| E: add a crate | + OBJECT |
| R: reset lab | RESET |
| Space: dash | DASH button |

Tap HOW TO for instructions.

## Phone handheld layout (build 002)

- **Landscape only for phones.** Portrait displays a turn-sideways notice. On iPhone, turn off Portrait Orientation Lock if rotation is blocked; normal Safari pages cannot reliably force device orientation.
- Hold the phone sideways like a Game Boy Advance: virtual movement stick left, 2x2 spell pad right. Buttons cast while the left thumb keeps moving.
- The stage claims almost all remaining landscape height. DASH and + OBJECT stay near the bottom, and the info/reset controls are at the top.
- On PC, the original keyboard and mouse controls and full layout remain available.
- For the cleanest handheld experience, add the page to your phone Home Screen.

## Multitouch fix (build 003)

- Independent touch identifiers now control the joystick, so holding the left thumb does not reserve inputs from the right thumb.
- On touch devices, spells and DASH activate on the press event instead of waiting for a synthesized click.
- Touching the canvas while steering also aims and casts. Desktop mouse/keyboard behavior is preserved.
- Test on an actual phone: hold the left joystick, drag to move, and repeatedly tap Arc Bolt, Gravity, and DASH with the right thumb without letting go. Then tap open arena space while holding the stick.
- There is no confirmed live-device verification yet. GitHub Pages may cache old content; use `?v=003` when testing.

## Deliberate spell activation (build 004)

**Selecting a different spell never casts it.** The spell button only equips that slot.

| Equipped spell | Press its button again | Tap the arena |
| --- | --- | --- |
| Arc Bolt | Quick-fire along current aim (defaults to dummy without recent manual aim) | Aim precisely and fire |
| Gravity Well | Wait for target placement (no automatic well) | Place at the tapped coordinates |
| Kinetic Pulse | Cast an outward impulse **centered on the player** | Cast at the player |
| Frost Field | Cast a slowing field **centered on the player** | Cast at the player |

The game shows a compact status hint for the selected spell. On PC, keyboard 1–4 still equips spells and mouse clicks still cast; only the pointer position affects targeted and aimed abilities. On phone, direct arena taps choose targeted coordinates while another finger can keep moving.

Quick checks:
1. From Arc Bolt, tap GRAVITY. Confirm no well appears until you touch the arena.
2. Hold the joystick while selecting Frost. Confirm switching doesn't cast. Tap Frost again: the field originates where you're standing.
3. Switch to Pulse, cast near crates, and verify the outward force originates at the wizard.
4. Equip Gravity again and tap a location beside a crate. Verify the well center is at that exact place, within the chamber walls.

## Safari rotation regression (build 005)

Mobile test: start the lab in landscape, rotate to portrait, then back to landscape, without refreshing the page. The entire original fixed-size arena should fit inside the stage on both landscape appearances, and all spell/canvas touch targets should line up after rotating back. Repeat two or three times, including with Safari's browser toolbar visible.

Why this exists: Phaser 3.90.0 can reuse outdated container dimensions after rotation (Phaser issue #7213, fixed on the upstream master branch after 3.90). Build 005 explicitly calls `game.scale.getParentBounds()` before `refresh()` and `updateBounds()`, after the parent layout settles. It listens to orientation, browser/window/visualViewport resize, and the stage container ResizeObserver. The game world remains 960x600, with FIT scaling and no camera zoom change.

## Living targets + combustion (build 006)

This remains a **solo local prototype**, not the final roguelike and not multiplayer. GitHub Pages serves the client; no Colyseus server or cloud persistence has been wired.

### New physical enemies

- **Charger**: a dense, heavy enemy that pursues, telegraphs its attack, commits to a directional dash, and recovers afterward. It is harder to move with gravity than lighter enemies, and high-speed impacts cause collision damage.
- **Ember Wisp**: a lighter enemy that keeps its distance and releases slow, physical ember bolts. Wells, frost and other matter interactions affect them. A sufficiently redirected ember bolt can hit its own caster after a brief spawn grace period.
- Enemy health, player health, enemies remaining, and kills appear in the HUD.
- The original dummy and crates remain for repeatable physics tests. Use **RESET** to replay the encounter.

### Six-spell loadout

1. **Arc Bolt**: precise projectile, physical collisions and enemy damage.
2. **Gravity Well**: tap location; pulls enemies, crates, and both kinds of projectile.
3. **Kinetic Pulse**: self-centered force impulse.
4. **Frost Field**: self-centered area that damps velocity.
5. **Flame Field**: tap location; periodic area damage plus lingering Burn.
6. **Detonation**: tap location; immediate radial damage and impulse, so burning enemies become moving hazards.

Selecting a different spell equips without casting. Tapping an already-equipped Bolt/Pulse/Frost quick-casts; targeted Gravity/Flame/Detonation require an arena tap. Keyboard 1–6 selects on desktop, mouse click positions casts. Movement, dash, and tap-to-aim remain simultaneous on iPhone.

### Cinderheart relic (ON by default)

- **✹ CINDERHEART ON/OFF** enables a small explosion when Burn expires or a burning enemy dies.
- A Cinderheart explosion can ignite a nearby enemy at **60%** of its parent's ignition strength, but not below **15%**.
- At most **5** descendant depths; each enemy detonates no more than once for the same chain; explosive work is limited to **8 events per update**, with a queue cap of **64**.
- Fast enemy-on-enemy impacts deal kinetic damage and can transmit attenuated Burn as well.
- Burn effects and chain information are runtime-only. This is not yet an item-inventory or persistent Spell Designer integration.

### Suggested playtest sequence

1. Hold movement and swap among all six spells: selection must not auto-fire.
2. Redirect a charging enemy with a Gravity Well; confirm its wind-up and strong momentum remain readable.
3. Bend a Wisp's ember bolt with gravity and use Frost to slow it.
4. Place Flame Field under two or more enemies. Detonate from the side to launch burning bodies into other enemies.
5. With Cinderheart ON, wait for Burn to expire: watch chained smaller explosions. Toggle OFF and repeat to compare.
6. Clear the chamber and press RESET. Rotate portrait/landscape and confirm the arena framing remains stable.

### Technical boundary

Combat logic is separated into `combat.js` and invokes the existing Matter world via `WRKMAN_COMBAT`. Render effects are lightweight procedural graphics. No external enemy art was introduced, and no matchmaking or accounts exist yet.


## Kinetic collisions + impact feedback (build 007)

Your playtest confirmed the effects and Cinderheart DPS were working, but the small secondary explosions did not feel forceful enough. This pass preserves the same elemental rules and improves physical interactions and impact readability.

**What's new**
- **Matter contact normals** determine whether two bodies actually slam together. Fast sideways scrapes do not cause impact damage.
- **Mass sharing** changes the damage outcome: a fast heavy Charger striking a light Wisp causes more damage to the Wisp than to the Charger. Charging units also resist explosive displacement more than Wisps.
- **Body-to-body and wall collisions** deal kinetic damage above a speed threshold, with a per-pair cooldown. Burning enemies can transmit attenuated Burn when they slam into other enemies.
- **Stagger** briefly pauses enemy decision-making on sufficiently hard hits, without freezing their physical momentum.
- **Readable impacts**: bright short shock lines, contact sparks, expanding blast cores, shockwave circles, and modest screen shake. Rendering effects are capped for mobile performance.
- **Cinderheart** still propagates with decreasing ignition energy and bounded chain budgets; it now has stronger visual and kinetic presence while preserving the 60% energy-transfer rule.

**How to test**
1. RESET to revive the 2 Chargers and 2 Wisps. Let a Charger begin charging and try pulling it off-course with Gravity Well, preferably toward a Wisp.
2. Use Flame Field on a group, then cast Detonation to throw one burning enemy into another. Watch for impact sparks, stagger, and Burn transfer.
3. Blast a light Wisp and then a heavy Charger at comparable distances. The Wisp should launch farther.
4. Redirect an enemy into a stone wall; high-speed wall contact should give its own impact flash.
5. Toggle CINDERHEART ON and OFF and compare the delayed blasts.
6. Rotate landscape → portrait → landscape, then hold movement while selecting and casting spells to check for any control regressions.

The simulation still uses local-only gameplay. Runtime logic tests are not a substitute for a phone playtest.


## Physics systems
* Arc Bolt is a Matter circle with actual velocity and collisions.
* Gravity Well applies the same distance-based attraction to any dynamic Matter body within range (including bolts).
* Kinetic Pulse pushes dynamic bodies outward with impulses.
* Frost Field changes velocity of dynamic bodies within an area.
* Movable crates and an impact-registering dummy respond to these effects.
* Gravity deflections and dummy impacts are counted in the top HUD.
* Field power persists locally; COPY BUILD copies a **lab recipe**, not a production-ready Spell Designer ability.

## Prototype boundary
This version is **solo and local only**. No Colyseus server, online co-op, account system, shared spellbook, or imported Spell Designer schema is connected yet. The live room server will need hosting outside GitHub Pages. GitHub Pages can serve the client, not the authoritative WebSocket server.

## Next experiment
1. Separate deterministic physics rules into an engine module that can run in Node.
2. Build a Colyseus authoritative two-player test room.
3. Add position interpolation/client prediction and latency testing between PC and phone.
4. Add spell schema imports, unique authorship, and shared spellbook persistence.
5. Expand to enemies, procedural rooms, and real combat.

## Design note
The first test is whether a projectile curves in a gravity field **without** a hardcoded Gravity+Bolt combo. Observe, tune, repeat.

_W • Clock in. Build something._
