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
