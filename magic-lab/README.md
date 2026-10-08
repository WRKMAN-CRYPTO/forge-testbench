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
