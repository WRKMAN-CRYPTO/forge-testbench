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


## Impact & momentum pass (build 008)

Field feedback on 007: hits felt like the wizard teleported and Detonation barely pushed heavy Chargers. Both issues came from the movement model, not the visual effects.

**Changes**
- **Player knockback is time-integrated**, rather than directly editing position by 23 world units on hit. Charger collisions impart a strong initial velocity which decays smoothly over subsequent frames; normal input is briefly dampened but not disabled, and the player remains within world boundaries. Hit invulnerability still applies.
- **Readable player recoil**: a stronger shake, directional afterimage, a short hit-color flash, and an impact ring. The wizard doesn't snap to a new position except for the existing explicit respawn at zero HP.
- **Detonation physically redirects bodies** using one immediate Matter velocity impulse, instead of a weak single-frame `applyForce`. Heavy Chargers are given lower knockback than lightweight Wisps, but are visibly displaced even when moving toward the explosion.
- **Explosion interrupts enemy steering for a short stagger** so their inertia continues carrying them instead of AI acceleration immediately canceling the launch. Chain depth, ignition decay and bounded FX from previous builds are unchanged.
- **Gravity Well center fix**: if a body is at exactly the blast center, a deterministic per-body direction is used instead of a zero outward vector. Even tightly clustered enemies launch apart.

**On-device checks**
1. Let a Charger hit you while standing still, then while holding the joystick. Your wizard should travel *over time* with visible feedback instead of moving one frame by a fixed distance.
2. Cast Detonation near a Charger, then near a Wisp at approximately the same distance. Charger should recoil significantly; Wisp should fly farther.
3. Try detonating in front of a Charger mid-charge: the incoming momentum should be redirected outward.
4. Hit enemies into walls or one another and observe collision damage and ignition transfer.
5. Verify Cinderheart ON/OFF, six-spell targeting, RESET, landscape rotation, multitouch movement, and dash.

Source checks and instrumented synthetic physics tests passed; phone gameplay and subjective weight still need actual playtesting.

## Fracture physics + environmental weapons (build 009)

This build turns the arena itself into a combat resource. **No new spell buttons** or save/network dependencies are introduced.

- **Three solid stone pillars** occupy the chamber. The wizard cannot walk through intact pillars, and they resist moving physics bodies.
- A fast charging enemy, moving object, Arc Bolt, or Detonation can chip or fracture a pillar. Structural damage is shown as cracks. A direct centered Detonation will shatter a healthy pillar in the lab balance settings.
- Breaking stone removes its static Matter collider and creates **one heavy central fragment and six smaller rubble pieces**, each with its own Matter body, velocity, drag, restitution, and collision response. Fragments can damage enemies through the kinetic-impact system.
- **Four loose stones** exist at the start of the encounter so you can pull rocks with Gravity Well before breaking anything.
- **Gravity Well, Frost Field, Kinetic Pulse, and Detonation** affect loose debris via the same physics processing as crates, enemies, and projectiles.
- Flying rubble moving fast enough can hurt the wizard too. Intact pillars block the kinematic player; a knockback into a column can damage its structure.
- Debris is capped to **36 active objects** and expires after **18 seconds**. All Matter bodies are removed by RESET or when expired. No permanent level destruction is saved.

### Quick physics field test

1. Try walking into an intact pillar. It should stop the wizard.
2. Target a pillar with Arc Bolt and inspect the cracks, then Detonate to fracture it.
3. Place a Gravity Well near the fragments: watch the heavy core and lighter stones pull into the field.
4. Detonate beside the debris and try launching it into a Wisp or Charger. Collision damage should depend on mass and speed.
5. Let a Charger rush into the next intact pillar and fracture it.
6. Watch out for flying shrapnel yourself. RESET restores all three pillars, four loose rocks, enemies and the training objects.
7. Confirm that Burn chains, Cinderheart toggling, six spells, multitouch, and portrait-to-landscape recovery remain working.

The logic tests are synthetic. Real iPhone performance, layout, and the feel of destruction still require hands-on gameplay feedback.

## Wizard wardrobe: 20 selectable skins (build 010)

The generated concept sheet's **twenty designs** are individually extracted and packed in
[the transparent WebP sprite atlas](./skins/wizard-skins-20.webp). Frame numbering follows the
original sheet's grid exactly: **01–05** first row, **06–10** second row,
**11–15** third row, and **16–20** fourth row. Every frame is 56 × 68 pixels
in a 5 × 4 image (280 × 272). This is a static concept-skin pass, **not a
walking animation or direction-aware sprite set**.

### How to review on phone or PC

- Open the game and tap **SKINS 01/20** in the header.
- Tap any numbered character to equip it. The previous/next arrows move through all twenty; you can also use the keyboard's left and right arrows while the wardrobe is open.
- Tap the **☆** on a character card (or the large **☆ KEEPER** control for the selected look) to mark or unmark it. A **★** indicates a keeper.
- Tap **BACK TO LAB** to resume gameplay. The arena pauses while the wardrobe is open; no combat can occur behind it.
- The last selected character number and starred keeper numbers persist in browser `localStorage` on the current device. No wallet, account, or cross-device synchronization is involved.
- The existing **COPY BUILD** command now includes `wizardSkin` and `keeperSkins`, making it easy to send feedback identifying favorites.

### Technical details

- Phaser 3 loads `skins/wizard-skins-20.webp` as a 5 × 4 spritesheet; the wizard is a separate image sprite drawn above the existing graphics.
- Changing `frame` changes **appearance only**. Movement, dash, aiming, collisions, the player's kinematic coordinates, and spell damage are unmodified.
- If the texture fails to load, the previous vector-drawn laboratory wizard remains as a fallback.
- The visual skin is not yet a complete directional sprite or character animation. Chosen candidates can later be redrawn for walk, dash, recoil, cast, and multiplayer readability.
- **Spell-Language remains dormant and unconnected.**

## Build 030 • 25% wider camera view

Player request: zoom the following camera out approximately 25% to see more combat arena at once, without enlarging or changing the underlying physics world.

- **Phaser camera zoom: `0.8`**. With the unchanged logical view of 960×600, the camera sees roughly **1200×750 world units** at once, i.e., 25% more width and height and about 56% more area. It renders characters and objects at 80% of their previous display size.
- Phaser's own `setZoom(.8)` is used, **not** CSS canvas scaling or a change to `Phaser.Scale.ENVELOP`, because touch/click targeting relies on `camera.getWorldPoint` after the camera pans or zooms.
- Tightens deadzone from 180×48 to **144×38** logical pixels, keeping early horizontal and vertical chase responsive as the camera zoom changes. Follow interpolation stays unchanged at **X .20 / Y .34**.
- Existing world bounds, Matter bodies, spell positions, six-rune 90° wheel, Dash, HUD, saved Hue Forge palettes and Spellbook loadout are not modified.
- Tested with actual game/combat/material modules and a saved dyed wizard-06 profile in simulated phone ENVELOP and desktop FIT setups. Both spawned 22 physical actors, started and rendered `LAB RUN:A`, asserted `zoom=.8` and deadzone values, and confirmed mouse and phone touch aim after camera scroll used zoom-adjusted world-space coordinates.
- Deterministic suites: **52 spell-wheel tests passed** and **29 elemental tests passed**.

**Field test:** open `magic-lab/?v=030` in landscape, approach a Charger and check that you can see more of the enemy movement and arena in all directions. Use Spark or Gravity at a distant target after moving the camera; verify casts follow finger position, and test fast up/down movement to judge chase responsiveness. Actual Safari render feel remains to be confirmed on-device.

## Build 029 • Corner spell orb + 90° quarter-fan

Mobile field feedback: the full 360° spell wheel occupied too much combat area. The desired layout is a **bottom-right CAST orb**, six equipped spells in a 90° sector opening up/left, with **DASH just left of the orb and never obscured**, even during selection.

- Moved the orb's real CSS position, not just the wheel dock: the 238×238 dock is bottom/right 6px (plus CSS safe areas); the 68px orb is inset 14px from the dock bottom/right, leaving the orb center 48px from either dock edge.
- Converted each equipped rune from centered ring coordinates to **two arcs of three** relative to the **actual orb center**, not the former center of the dock. Inner radius 112px, outer radius 165px; angles -90°, -120° and -150° occupy the upper-left quarter of the orb. The two bands keep a minimum center spacing of 53px for the 44px buttons.
- The expanded wheel shows a light **quarter-sector background** instead of a full circle. The small readout stays available to screen readers but no longer draws another piece of chrome over the fan.
- Dash is a fixed 68×58px button left of the orb (130px CSS right inset and 21px bottom inset, both with safe areas), at a vertical position that avoids all six slot targets even when a rune scales to 1.12×. Its z-index remains above the wheel. Touch gestures released in the Dash lane cancel without firing or selecting a rune.
- The `spell-loadout.js` module and inlined fallback now share the same six `pos()` coordinates and quarter-sector `gesture()` rules. Invalid saved data still falls back to the same six equipped spells, and the **spell-loadout localStorage key is unchanged**, preserving player choices.
- Standard gesture flow is untouched: tap orb to quick-cast; hold/slide up/left and release to select; place targeted spells via arena tap; pressing Dash still calls existing `scene.dash()`. Scene physics, material reactions, Spellbook, dyed skins, camera, touch-to-world aiming, and HUD remain unchanged.
- Validation: **52 passing spell-wheel/unit tests** (including fan shape, six directions, minimum spacing, non-overlap with Dash, cancel zones, saved loadout compatibility); **29 elemental tests**. Simulated phone/desktop startup with the real game modules both render `LAB RUN:A`, spawn 22 objects, successfully activate Dash and the outer fan Spark slot, cancel an attempted Dash-lane selection, and open Spellbook.

**Field test:** open `magic-lab/?v=029` in phone landscape, move with your left thumb, press the bottom-right orb with your right thumb, slide up/left to a rune and release. Test the inner and outer leftmost runes, then Dash immediately left of the orb. There should be no Dash obstruction when the quarter-fan is expanded. Confirm skins/hues and Spellbook still work. These are deterministic tests, not a substitute for real iOS Safari feel.

## Build 028 • Game-first HUD (mobile-inspired cleanup)

Inspired by two handheld dungeon games: preserve a **large, readable world** and keep the on-screen input controls recognizable via quiet cyan/gold accents, without adopting the other game's green palette. Build 028 is an **interface-only redesign**, not a combat or camera change.

### Play view
- Replaced the oversized WRKMAN tool header with a **compact translucent top-left health HUD** featuring a red heart, a live percentage health bar, nearby enemy count and current material phase.
- The upper-right is now **one ☰ menu button**. The original top buttons and scattered debug pills no longer block the battlefield. The game still fills the phone viewport in landscape.
- The lower-left joystick is modestly smaller and more transparent, keeping comfortable touch hit targets. The right-side Dash and six-slot spell wheel remain near the bottom-right, with soft cyan and warm gold instead of bright green.
- Cast hint text remains available, but appears only when a **targeted spell is armed**, unless full hints are enabled in Settings. The center stays uncluttered.

### ☰ Menu
- Contains **SPELLBOOK, SKINS, HUES, HOW TO PLAY, COPY BUILD and RESET ARENA**, retaining the original element IDs and features.
- **Display settings** include persistent `CAST HINTS: ON/OFF` and `CONTROLS: SOFT/BOLD`. Stored under `wrkman-arcane-lab028-ui-settings-v1`, separately from legacy Field Power, saved spells, skin keepers and robe dyes; `fresh=1` remains non-destructive.
- **LAB TELEMETRY** expands on demand for developer metrics: KOs, dummy HP, deflections, impacts, pillars, lab frame status, saved profile status and solo/local mode.
- Menu opening pauses enemies and neutralizes joystick input. Closing via ☰, tapping outside or Escape resumes. Selecting SPELLBOOK / SKINS / HUES transfers that pause to the corresponding fullscreen dialog without prematurely unpausing enemies. HOW TO resumes when the player taps ENTER THE LAB. COPY BUILD keeps menu open so clipboard feedback is visible; RESET closes and resumes immediately.

### Architecture/testing
- Existing `Combat.heads` still writes `playerHP` and `enemies` because those IDs now live in the new HUD. A lightweight UI-only sync updates `healthFill` from the current combat HP every four game ticks and resets to full health on RESET.
- No edits to `combat.js`, `elements.js`, `spell-loadout.js`, Hue Forge, sprite art, follow-camera constants, material physics, spell physics or saved values.
- JS parse, DOM ID/reference and saved-hue boot order checked.
- Full simulated scene startup with real combat/material/hue/loadout modules, using both an existing dyed skin 06 and a fresh profile: **22 actors initialized, LAB RUN:A**, HUD health meter correctly reflected 65% during combat, menu opened/closed safely, all three nested dialogs handed off pause/resume, HOW TO resumed, RESET worked, Dash and spell orb remained active, display preferences persisted only in the saved profile.
- Existing **34 spell-wheel** and **29 elemental** deterministic tests remain green.
- Real iPhone Safari appearance and reachability still need field feedback; this is a game-first visual pass, not an image or an animation update.

Field test: open `magic-lab/?v=028` in landscape. The top of the play view should show only health at left and ☰ at right. Start a fight, check the live health bar and disappearing KOs/diagnostics. Open ☰, try Spellbook, Hues, Settings, Reset, and return to battle. Confirm hints appear on aimed Flame/Spark, and that joystick + Dash + wheel still work together. If the HUD overlaps a browser notch, report device orientation/safe area.

## Build 027 • Bottom-right Dash + Wheel, experimental strip removed

Requested phone UI cleanup:

- Removed the entire **Field Power / Cinderheart / + OBJECT bottom strip** and its three DOM controls (plus their control event handlers). The experiment/gameplay modules remain intact.
- **Field Power:** preserves the player's previously saved numeric power value as a hidden, clamped tuning value, with fallback 5. The visible slider is gone; existing Gravity behavior is unchanged for that saved setting.
- **Cinderheart:** stays enabled by default, as in the existing Combat reset logic; removing its toggle does not remove the Burn chains.
- **+ OBJECT:** removed from the phone/desktop interface. Desktop keyboard `E` remains for experimental object spawning and the arena retains its props.
- **DASH:** now lives beside the six-slot wheel as a large, accessible button, at the same vertical center and just **to the left**. It still calls the existing `scene.dash()`, including simultaneous movement on phone.
- **WHEEL:** anchored to the bottom-right of the arena with phone safe-area insets instead of 52% from the top. All six radial options open inward; the collapsed instruction readout is hidden to reduce obstruction, but appears above the wheel when it opens. The phone active wheel is 216×216, and Dash 74×64.
- The `log` remains as a non-visible live status element for existing JS announcements. All previous HUES/SKINS, Spellbook, camera-aware aiming, six-slot loadout storage, and 2-second Frost behavior are unchanged.

### Verification

- Tested actual game inline script initialization against the combat/material/hue/loadout modules with stored dyed wizard 06, for **phone ENVELOP and desktop FIT**. Both spawned 22 actors, rendered `LAB RUN:A`, invoked Dash via its click binding, selected Flame using a held radial gesture, and opened/closed Spellbook cleanly.
- The **34 wheel/loadout tests** and **29 elemental material tests** still pass.
- Geometric checks for 900×390, 740×360, and 850×393 (with right/bottom safe-area offsets) verify a visible, reachable wheel, ≥11.5 logical pixels clearance between Dash and expanded left rune, and ≥9.5 logical pixels clearance below the lowest rune. This is calculated layout geometry, not a substitute for real iPhone Safari testing.
- Field check: open `magic-lab/?v=027` in landscape, confirm no bottom strip remains, use left joystick + Dash together, hold orb + slide to the left-most rune, and check that the lowest rune remains visible above the browser/home indicator. Verify Spellbook and dyed wizard still work.

## Build 026 • Six-Rune radial wheel + separate Spellbook

Player request: replace the old permanently visible six-button 3×2 cluster with a thumb-friendly wheel, allowing **at most six equipped spells** from an expandable known spell library. Keep Build 025's full-bleed follow camera, normal physics, Hue Forge and dyes.

### New phone/game UI
- **Wheel hub** resides near the right-hand thumb at the mid-right of the arena. It remains visible as a compact circular button showing the currently selected spell glyph.
- **Tap orb:** casts quick spells (Arc Bolt, Frost, Pulse) once. Targeted spells (Gravity, Flame, Boom, Spark) become **armed**, then you tap the arena for exact world-space placement, including after camera scroll.
- **Hold-and-slide:** press the hub to reveal six runes around it. Drag toward a rune and release to select without casting. Release within 40px of the hub to cast, or release far outside the ring to cancel. The document-level touch handler owns one exact touch identifier, so a simultaneous left-thumb joystick touch doesn't cancel the gesture. Mouse dragging uses a separate pointer identifier; keyboard users can activate the focused orb with Enter/Space.
- **SPELLBOOK:** top menu button opens a combat-paused editor showing the six active slots and the full seven-spell known library. Tap a numbered slot, then a spell. Unequipped spells replace the chosen slot; choosing an already-equipped spell **swaps** the two. The player can restore the starting six. Status text reports whether changes were saved.
- **Starting six:** Arc Bolt / Gravity / Frost / Flame / Detonation / Spark. **Kinetic Pulse** starts unequipped but is immediately available in SPELLBOOK. The seven spell implementations remain in the code, and no spell is deleted.
- Keyboard **1–6** chooses the configured rune slots. The **B** shortcut opens the Spellbook, Escape closes it. The original six chunky right-side spell buttons and detached footer Spark button are removed.
- **COPY BUILD** now exports the six equipped runes, ordered, and the seven-spell library separately (format version 2).
- **Saved state:** spell wheel stores only the validated six-spell ID array at `wrkman-arcane-lab026-spell-loadout-v1`. It never overwrites robe, skin, or keeper data. Bad or duplicate saves fall back to defaults. Existing `fresh=1` profile mode isolates the new loadout as well. If the loadout module fails to download, a small no-storage default fallback keeps the combat game usable.

### Test evidence
- **Spell Wheel 026: 34 tests passed**: validates six unique slots, allowed library, swapping, invalid storage, private-storage fallbacks, six radial hit regions, tap-to-cast and cancel zones.
- **Elemental World 021: 29 tests passed**: existing elemental mechanics remain green.
- Full simulated scene startup with the real combat and elemental modules and stored dyed wizard **06** spawned 22 actors, rendered `LAB RUN:A`, and exercised actual DOM touch and mouse gestures: orb casts Arc Bolt once; sliding selects Frost without casting; Spellbook pauses enemies, replaces Frost with Pulse, saves a six-slot loadout; dragging selects Spark; tapping the arena after simulated camera scroll still emits an electrical sphere at the correct **world** coordinates.
- Desktop/phone rendering and ergonomic gesture comfort still need real device validation. Do not claim these simulations establish iOS Safari touch feel.

### Suggested device test
Visit `magic-lab/?v=026` in landscape. Enter the lab. Tap the orb for Arc Bolt. Hold and slide north or southwest, release to change the rune, then tap orb again. Try selecting Flame or Spark and tapping a distant cloud with the moving camera. Open SPELLBOOK, select a slot, swap in Pulse, close, and reopen to verify the saved assignment. Lastly verify SKINS/HUES still show dyed wizard 06 and controls work while holding the joystick with a separate finger.

## Build 025 • Faster vertical camera chase

Field feedback: even with the earlier camera chase, landscape phone users could approach enemies from above or below with too little warning. The horizontal follow felt acceptable; adjust only vertical tracking.

- **Deadzone:** 180×120 → **180×48** logical pixels (X unchanged). Within a 960×600 logical camera, Y follow starts after about 24px of up/down movement from the center zone instead of 60px.
- **Lerp:** X/Y = 0.20/0.20 → **0.20/0.34**. Vertical camera displacement catches up more promptly but remains smoothly interpolated.
- **Untouched:** camera world bounds, player physics, spell aiming/casting, phone full-bleed layout, six original spell slots, reset, Hue Forge and Frost duration.
- JS parse, DOM identifier, world-coordinate touch conversion, and saved-hue boot-order checks passed; the elemental test suite remains **Elemental World 021: 29 tests passed**.
- Device test: move straight north or south near enemies, then reverse. The player should remain farther from the top/bottom viewport edges. Real iPhone rendering and follow comfort require field feedback.

## Build 024 • Earlier camera tracking

Field feedback: Build 023 follows the wizard, but the view begins chasing too late, when the character is getting close to the screen edge.

- Reduced the camera deadzone from **500×350** to **180×120** logical pixels within the unchanged 960×600 view. The wizard can move a short distance near the center before panning begins; the camera now starts chasing long before a screen edge.
- Increased follow interpolation from **0.11** to **0.20** on both axes, improving catch-up without snapping instantly.
- No changes to the expanded arena, physics, spells, mobile six-button arrangement, saved dye looks, touch-to-world conversion, or RESET behavior.
- Validation: game script syntax/DOM checks passed; original 29 elemental material tests still pass. Real phone camera feel remains to be confirmed.

Try `magic-lab/?v=024` and check if the wizard stays comfortably inside the screen during long runs, reversing direction, and quick dashes.

## Build 023 • Follow camera and expanded explorable arena

**Design objective:** retain the Build 022 full-bleed phone view but stop treating the physical arena as a single fixed screen. Keep the existing six thumb controls and Spark button for now; the six-equipped-spell loadout design is the separate next phase.

### What changed
- **Logical viewport remains 960×600.** The traversable physics world is now x=-800..1760, y=-520..1120, with a decorative backdrop covering x=-860..1820, y=-580..1180.
- **Smooth follow camera** uses Phaser Camera.startFollow on a stable point-like target, with 500×350 screen-space deadzone and X/Y lerp of .11. The wizard can move a little without camera shake. Leaving the deadzone causes the camera to scroll. The target remains stable across resets even though the player state object gets recreated.
- **True world coordinates:** mobile direct DOM capture first maps the touch from the cover-cropped canvas bounding box into Phaser viewport pixels, then calls `camera.getWorldPoint(sx,sy)`. Phaser mouse pointer movement and presses are likewise converted using `getWorldPoint(p.x,p.y)`. This prevents placing Gravity, Flame, Boom, Spark or aiming a Bolt in the wrong place after scrolling.
- **All spatial boundaries updated** in the main scene, combat helper (including collision nudges, rubble spawning and flame targeting), and elemental material helper (cloud drift, new cloud locations and dry spark placement). Physics walls are expanded; no invisible walls remain at the old 960×600 chamber edge.
- **Larger drawn floor** consists of a continuous bounded grid, connected floor routes, and five distinguishable experiment pads: the familiar center plus new west/east/north/south pads. Six additional movable crates provide things to experiment with outside the starting encounter. Initial enemies remain in their familiar original locations.
- **RESET** restores the starting player coordinates and original camera framing; repeated play does not accumulate actors, steam or saved camera state.
- **Unchanged:** two-second Frost balance, 580ms freeze stagger, elemental reactions, Arc Bolt, mobile buttons, saved robes/keepers, Dual-Mask Mage, dormant Spell-Language, and desktop control mappings.

### Important limitations
This adds a **following camera and one larger connected sandbox**, not new enemy waves, quest progression, map streaming, a minimap, camera zoom controls, or revised six-slot loadouts. The player's sprite still uses its static outfit artwork. All world graphics are static and deterministic; no extra heavy tilemaps were added.

### Testing
- Simulated scene startup with the **real combat/material modules and a saved dyed wizard 06** passed in both phone ENVELOP and desktop FIT renderer configurations.
- Both modes initialized **22 physical actors** (original 16 + six extra crates), rendered `LAB RUN:A`, moved the player beyond the original chamber, and verified the camera target followed the new player coordinates.
- With a simulated camera scroll of x=510/y=-70, clicking and tapping on logical canvas position 120/300 both resolved to world coordinate **630/230**. Camera reset returned to scroll 0 and the original spawn.
- 16 additional spatial/compatibility checks passed, including large-world material effects outside the old arena, spatial bounds agreement, mobile casting, original six buttons, and saved hue startup order.
- Existing material physics suite: **Elemental World 021: 29 tests passed**.

**Field test:** `magic-lab/?v=023`. Move west or east past the original chamber rings; watch the floor slide under the character. Cast Gravity or Flame at an object in a distant pad to check world-accurate taps. Reverse direction to see the camera pan back smoothly. RESET should show the starting chamber. Repeat on landscape Safari; actual iPhone rendering still needs user verification.

## Build 022 • Full-bleed landscape gameplay (phone UI pass 1)

**Purpose:** stop using a header, HUD and bottom toolbar as rigid reserved screen strips. On a landscape phone, the **game stage now fills the entire available viewport** (100vw × 100dvh) and all current controls are transparent overlays. The desktop layout remains the original FIT view, and portrait phone sessions retain the rotate cue.

### Layout change

- Arena stage and stage wrapper fill the phone viewport edge to edge, with no frame, bezel, margins or rounded stage corners. Phone Phaser scale uses `ENVELOP` rather than stretching its 960×600 simulation: outer arena borders can be cropped on wide screens, but physical dimensions and input scaling remain consistent. Desktop Phaser continues using `FIT`.
- WRKMAN brand/menu actions are in a small transparent top overlay. Health, foes, KOs, phase and lab debug info float beneath the top controls. The existing joystick overlays the lower-left arena above the safe area. The existing six-spell 3×2 temporary touch grid, Spark and the current bottom controls still overlay the arena.
- HUD and toolbar wrappers allow touch events through to the game canvas except on actual controls. Canvas touch aiming still maps touch positions using the canvas's actual screen rectangle, so ENVELOP scaling does not distort aiming.
- Resize/orientation handling remains on the Phaser scale manager, and the existing Chrome saved-hue startup fix remains in place.
- No changes to elemental physics, Frost's two-second duration, combat, wizard appearance, local storage or player save data.

**Note:** On-screen browser chrome (URL/navigation controls) is outside the HTML page; the arena fills the *available web viewport*. Standalone Home Screen/PWA display may offer more usable screen than a browser tab.

**Test:** open `magic-lab/?v=022` on a landscape iPhone. Confirm the arena extends behind the HUD and temporary spell controls to all four viewport edges, the joystick still steers with a second finger casting, taps land accurately, and SKINS/HUES menus still work. Because the canvas is intentionally cover-fitted, outer top/bottom decorative world edges may be cropped. Recheck on rotation. Desktop should remain visually unchanged.

**Next decision (intentionally not part of this build):** redesign mobile spell selection and equip/loadout UI, with a six-equipped-spell cap. Keep the actual available spell library separate from held combat slots.

Automated smoke checks ran startup + first graphics frame using the real combat engine and a previously dyed wizard profile in both `ENVELOP` phone and `FIT` desktop cases; each initialized 16 actors and reported `LAB RUN:A`. Real Safari/Opera device rendering still requires user testing.

## Build 021 • Frost duration fine-tuning

Player testing confirmed a successful Frost → Flame → Steam → Lightning sphere chain, but the **1.35-second** field from Build 020 felt too short. Build 021 extends **only the Frost Field's active chill to 2.0 seconds**.

The **580ms single freeze-stun**, per-target **4-second restun lockout**, nonstacking field behavior, moderate ice slowdown, natural thaw, and all steam/lightning interactions remain unchanged. No change to character art, Hue Forge, Arc Bolt, or Spell-Language.

The 29 deterministic elemental tests still pass after updating field-duration test fixtures. Use `magic-lab/?v=021` to evaluate combat timing.

## Build 020 • Frost control balance

Field feedback: one Frost cast held the enemy chamber too long, allowing Arc Bolt to eliminate everything with little opposition. Two systems compounded the problem: the field was **3.4 seconds** long, and the material engine refreshed `staggerUntil` every frame that an enemy had ice. Remaining ice could therefore suspend AI long after the visible field disappeared.

**Targeted balance changes:**

- The self-centered Frost Field now chills for **1.35 seconds**, down from 3.4s. Recasting relocates the existing patch instead of stacking multiple long-lived fields.
- Each enemy receives **one short 580ms freeze-stun** upon sufficient icing, not perpetual stagger extension. The same enemy can't be stun-locked by rapid recasts due to a roughly four-second per-target refractory window.
- Stored ice causes **moderate physical slowdown** after stagger expires, while the enemy AI is allowed to resume decisions, lunges, and spells.
- Ambient warmth now raises material temperatures promptly once the Frost field ends; ice thaws naturally without requiring Flame. Flame still speeds melting and can create vapor and wet electrical conduction.
- No changes to Arc Bolt, enemy HP, cast controls, the Dual-Mask Mage, saved dye profiles, or dormant Spell-Language.

**Check the feel:** Approach an enemy; cast Frost once and watch it recover. Repeat Frost quickly and verify that the second cast doesn't indefinitely stun it. Then try Frost → Flame → Steam → Spark: the elemental chain should still work, but its timing matters more now. Run `node magic-lab/elements.tests.js` for **29 material tests**, including finite stagger, natural thawing, repeat-cast immunity, and a working steam chain.

## Build 019 • Emergent elemental material physics

**Status: Live laboratory experiment, solo play.** Inspired by the proposed **Frozen Enemy → Flame → Steam → Lightning** interaction. This is *not* a hardcoded spell recipe. The elemental system independently models local body temperature, water content, frozen water, thermal vapor release, moving steam parcels, and electrical conduction through vapor volumes.

### What's playable

- **Frost Field (4):** The existing self-centered frost field now subtracts heat and deposits condensable moisture onto nearby enemies, props, and rubble. As materials cool, liquid water becomes physical ice. Ice temporarily damps body movement and enemy AI without teleporting them.
- **Flame Field (5):** The same damaging Burn field adds heat, melting stored ice back to liquid and, when hot enough, evaporating it into the arena. Naturally moist material can also evaporate *without prior freezing*. Truly dry material cannot create steam just because you cast Flame.
- **Steam clouds:** Each released volume has a position, temperature, mass, finite lifetime, drift, buoyancy and radius. Nearby volumes can merge; clouds are capped at 14 for mobile performance. Hot clouds inflict limited periodic scald damage.
- **Gravity Well (2):** Attracts moving vapor clouds, changing their trajectory rather than hardcoding a `gravity + steam` spell recipe.
- **Detonation (6) and Cinderheart chains:** Existing explosions push nearby steam away through a small, optional impulse hook in `combat.js`. The explosion's original damage and chain mechanics are left unchanged.
- **Spark (7):** A new small footer button **⚡ 7 SPARK**. Tap it to equip, then tap the arena to discharge. In dry air it creates a small localized spark. If the tap intersects a moisture-bearing vapor cloud, discharge expands into an electrical sphere that can hurt enemies; overlapping damp clouds conduct in a bounded wave. Enemies are hit at most once per discharge.
- **PHASE HUD:** `DRY`, `ICE n`, or `VAPOR n` reports what the elemental layer is tracking. Vapor is rendered as drifting pale clouds; stored ice has frost crystals; discharges have radial electric shock arcs.

The existing 6 large thumb-spell buttons stay in their original 3×2 grid on landscape phones; Spark lives beside DASH in the footer. Key **7** selects Spark on desktop. Material state is automatically cleared when the arena is reset, and no material state is stored in a user's account or linked to collectible hues.

### Test a reaction deliberately

1. Start a new encounter. Approach a Charger or a loose object and cast **FROST (4)** close enough to cover it, allowing around 2 seconds of chill.
2. Cast **FLAME (5)** where the frozen target stands. Wait for liquid to evaporate into moving vapor clouds.
3. Cast **GRAVITY (2)** near the steam or **BOOM (6)** to observe clouds being pulled or shoved.
4. Press **⚡ 7 SPARK** to select, then tap **inside the visible steam**. The discharge sphere should be larger and more effective than an isolated dry spark.
5. Try Flame without Frost. Moisture-rich objects can still make steam. Compare with steam produced from a frozen target.
6. Check that SKINS/HUES still work, your saved outfits survive, and Spell-Language is still dormant.

### Constraints and model integrity

This is a deliberately **stylized** 2D material-transport model, not real computational fluid dynamics or a laboratory-calibrated simulator. It treats heat, liquid water, and ice as conserved-ish local finite state, but energy and water are abstract units. It does *not* yet simulate ambient rain, rivers, wood combustion, real electrical conductivity through metal, or persistent world climate. It never checks for the names or order of spells cast.

- Module `elements.js` runs independently of `combat.js`; if it fails to load, core spells and the arena still run. The tiny optional blast hook is guarded to prevent material code from breaking damage handling.
- Maximum 14 vapor parcels, 14 arc flashes, and 80 tracked bodies per step.
- Reusable tests in `elements.tests.js`: **23 passing deterministic checks** for freeze/melt/steam, hot dry materials, spark conduction and amplification, finite lifetimes, momentum transfer, and reset.
- An integration smoke test using the **actual combat module**, saved dyed 06 profile and game scene confirmed 16 actors, `LAB RUN:A`, ice formation, two vapor clouds and an electrically discharged sphere, without a startup exception.
- No change to Hue Forge's saved storage keys or the Dual-Mask Mage. **Spell-Language remains dormant.**

## Build 018 • Chrome saved-hue startup bug, resolved

### Reproduced failure

Normal Chrome showed the current build but could freeze before the arena rendered. Incognito and Opera GX worked, while clearing only cached files in Chrome did not. A locally simulated normal-Chrome profile with **saved dye palettes for wizard 03, 06, and 16** reproduced an uncaught `ReferenceError: Cannot access 'huePreviewCache' before initialization`.

The cause was a JavaScript temporal-dead-zone bug: wardrobe construction calls `refreshSkinUI()` before `const huePreviewCache = new Map()` was initialized. `tintedPreview()` returns immediately when a skin has no saved dye, so the bug stayed hidden for fresh Incognito profiles. With any saved dyes, it tried accessing the uninitialized cache and halted page startup.

### Repair

- The preview cache is now created **before** the first wardrobe refresh.
- `Build 018` retains the existing saved palettes, keeper marks, original sprite and Dual-Mask Mage files, and combat engine.
- A non-destructive `&fresh=1` diagnostic mode temporarily ignores site-specific saved data and uses only an in-memory store. It **does not read, modify, or erase normal Chrome's original palette/keeper data**. When the tab is closed/reloaded, the temporary selections vanish. The game shows `DATA FRESH TEST` instead of `DATA SAVED`.
- Run regular mode at `magic-lab/?v=018`. The control test is `magic-lab/?v=018&fresh=1`.
- This is a **real code defect**, not evidence that Chrome is generally faulty. Clearing the browser's cache or site data isn't necessary for this fix.

### Regression verification

A synthetic runtime booted the **actual Phaser scene + original combat module** in two configurations:
1. Stored selected wizard 16, saved palette hues for 03/06/16, four keeper entries, and field power 10. Result: 16 actors spawned, `LAB RUN:A`, original palette state read and retained until explicitly changed.
2. `fresh=1` on the same simulated browser profile. Result: default wizard 01 and field power 5, 16 actors spawned, `LAB RUN:A`, **zero persistent storage reads/writes**, even after changing the selected skin.

The smoke tests don't replace real Chrome rendering checks, but they directly exercise the failure reported from saved palettes.

## Build 016 • Diagnostic recovery (iOS in-app browser vs Safari)

Field observations: the frozen Build 012 reference showed a rendered floor and wizard but no active combat drawings; Build 015 showed `LAB BOOT` and an empty arena. The captures were made in the ChatGPT in-app browser, not standalone Safari. This is a **relevant environmental difference**, not proof of the cause.

An accelerated startup simulation reproduces a failure in Build 012: `Lab.create()` can execute before the later `skinGrid` constant initializes, raising `ReferenceError: Cannot access 'skinGrid' before initialization`. This makes the earlier 012 snapshot an art/layout baseline, **not a guaranteed startup-safe release**. Build 015 moved game construction after the controls, and Build 016 continues that fix.

Build 016 adds explicit diagnostics without altering combat physics, dye masks, or existing saved palettes:

- HUD state `SCENE`, `FLOOR`, `WORLD`, `READY`, `START`, or `RUN:A` records the last meaningful startup/render stage. `RUN:C` is the Canvas renderer test variant.
- If `Lab.create()` or the update/render frame throws, it shows `ERR:CREATE` or `ERR:FRAME`, with the exception's message in the in-game error banner. Global script exceptions show `ERR:SCRIPT`.
- A missing welcome modal gate is auto-recovered if the instructions are no longer visible but gameplay has not started.
- For browser-specific graphics issues, open `magic-lab/?v=016&renderer=canvas` to request Phaser's Canvas renderer instead of the normal `AUTO` selection. This A/B comparison helps isolate WebGL/context failures.
- The earlier real-combat synthetic scene test passed startup and its first drawing/update with 16 actors; an injected rendering exception produced `ERR:FRAME` and an on-screen error.
- When testing on an iPhone, first open the link in **standalone Safari** using the in-app viewer's compass/open-in-browser control. Compare before attributing rendering bugs solely to game code.

If the screen is blank: report the precise `LAB` label and, if present, the visible error message. If the label says `RUN:A` but nothing draws, try `RUN:C` in the Canvas test and compare. Nothing about Spell-Language has been activated.

## Build 015 • Scene boot-order repair and stable recovery page

Build 014 removed the blocking Phaser `preload()` assets so that the game could initialize without optional art. On a real iPhone, counters showed four foes and three stones but nothing rendered. The **likely timing regression** is that a scene can reach `Lab.create()` synchronously before later top-level `const` bindings (skin grid, hue choices, thumb controls) have initialized. `resetLab()` updates the counters, then an early menu refresh can throw before the first frame is drawn.

Build 015 corrects the ordering:
- **Phaser.Game is instantiated at the very end of the inline script**, after every UI binding and touch listener has been established. This remains safe even if `Lab.create()` fires synchronously without mandatory preloads.
- `Lab.create()` completes the playable level first, then cosmetic loading is queued with a short timeout; scene startup no longer calls the Phaser loader mid-create.
- **LAB BOOT / READY / ERROR** is visible in the HUD. Runtime JavaScript exceptions are copied into the page's message log instead of failing completely silently.
- Hue Forge may open even while character art is loading or has failed. Palette colors continue to save; rendered previews resume when masks become available. It is still not part of combat's initialization.
- No changes to damage, spells, Matter physics, existing palettes, keeper marks, or dormant Spell-Language.
- A frozen **[Build 012 playable baseline](./stable-012.html)** now lives alongside the current game. Its sprites, script, and dye controls match the last version that successfully played on the user's phone. This is a separate page, *not* a query-string cache buster, so it can be used to distinguish a modern-boot regression from an environment-specific issue.

**Regression check:** a synchronous Phaser scene-start simulation now creates the world and encounters with the UI fully available (`LAB READY`), even before the first asynchronous cosmetic download. This reproduces the specific startup timing we had not tested for 014. Real Safari rendering still requires a device-side test.

## Safe startup recovery (build 014)

After switching Build 013 to the new Dual-Mask Mage assets, field testing reported an apparently frozen arena: no enemies or crates, no movement/spell response, and Hue Forge wouldn't open. GitHub Pages completed deployment, but the exact phone-side image/loader exception was not available for inspection.

Build 014 **decouples cosmetic asset loading from scene startup**:

- Phaser now initializes its Matter world, the dummy, crates, enemies, HUD, input handlers, and basic vector wizard **without waiting for any artwork to download**.
- Only after `Lab.create()` completes does it asynchronously request the Build 013 WebP sprite atlas and PNG material mask.
- Successful loading swaps the vector fallback to a true player sprite. If the new atlas fails, the game tries the known-working Build 012 art; if both fail, the vector wizard remains fully playable.
- If the new mask fails while the atlas succeeds, Hue Forge can load the prior Build 012 dye mask instead. This preserves dyeing on most outfits but may temporarily use the old 03 mask coverage until the new mask is available.
- Existing `localStorage` palette, skin and keeper keys are unchanged. Build 013's dual-mask art remains the intended default when the assets are available.
- Combat JS and Spell-Language files are unchanged.

### Recovery field test

1. Open `magic-lab/?v=014`, dismiss the how-to overlay if shown, and confirm enemies, crates, and the dummy are visible **before** the wizard image finishes loading.
2. Move and cast spells. Hit RESET and verify everything returns.
3. Tap HUES, select 03, and confirm the split mask and trim tint when the 013 art is available.
4. If the character remains vector-drawn or uses an older sprite, wait for the art to load, then refresh. Combat should remain usable regardless.
5. The deployment and the exact iOS loading behavior cannot be fully proven by code inspection alone; collect Safari console output if the frozen symptoms recur.

### Verification

An instrumented scene-start test simulated the 013 art **failing completely**, verified that the Matter setup and original five lab bodies (dummy + four crates) had already been initialized, and confirmed successful fallback to the 012 art. The exact failure underlying the original phone report is not yet independently established.

## Dual-Mask Mage • wizard 03 (build 013)

Wizard **03** now has an intentional, theater-inspired **comedy/tragedy face mask**. The character retains its original white tousled hair, blue scarf, compact outfit, frame index **03**, and every gameplay property. The mask is physically drawn into the existing 56×68 sprite art, not placed on top of the Phaser hitbox or dynamically scaled from a concept sheet.

- **Comedy:** ivory/light half, with a happy eye and small smile; remains readable even with dark trim colors.
- **Tragedy:** indigo/dark half, sorrowful eye and a small cyan teardrop. The tragedy side has intentional **TRIM** dye coverage. The gold border and forehead jewel frame the theatrical theme.
- The new source assets are `skins/wizard-skins-20-013.webp` (a complete 20-frame transparent atlas with updated frame 03) and `skins/wizard-hue-masks-013.png` (material weights updated only for 03). All other 19 characters retain the same **visible pixels**, and the other three finalists retain the prior material masks.
- Old `011`/ `012` files remain in the repository for art comparison and rollback. The live page now loads both 013 assets with independent versioned URLs.
- The **SKINS** and **HUES** selectors still use 01–20 and the same `localStorage` keys. Your saved 03 robe/scarf/trim palette remains in effect. TRIM on 03 now recolors the intentionally masked tragedy side instead of an accidental skin-colored patch.
- The Hue Forge title and 03 selection label identify the Dual-Mask Mage. The other skins, collider, movement, six spells, Cinderheart, destruction, and multiplayer status are unchanged. Spell-Language is still dormant.

### Verify 013 on iPhone

1. Reload `magic-lab/?v=013`. Select **03** in SKINS or HUES. Confirm the ivory/light half and sorrowful dark half are visible underneath the white hair.
2. In HUES, select **03 → TRIM**. Try **Voidbloom**, **Royal Cobalt**, and **Obsidian**. The tragedy face half should respond but the comedy half should stay pale.
3. Change **ROBE** and **SCARF** separately. The mask geometry should not move and the white hair should stay white.
4. Switch to **06**, **08**, and **16**. Their old appearance and dye behavior should be unchanged.
5. Return to the arena: no hitbox, physics, or combat behavior changes.
6. Reload to verify that the existing selected skin and individual color choices survive.

The concept sheet is higher-resolution *design reference*. Build 013 is the first readable pixel-scale adaptation; it is not a frame-by-frame facial animation.

## Hue Forge refinements (build 012)

This is a targeted response to the first **iPhone landscape** dye-bench field test: wizard 06 robe coverage, fingertip access to **ROBE / SCARF / TRIM**, and weak trim dye uptake.

- **Mask 012:** New source asset `skins/wizard-hue-masks-012.png` replaces the earlier masked channel PNG at runtime. The 06 robe channel now avoids pale head hair and covers more of its sleeves and lower cloth. The four finalists' metallic trim channels have stronger, better localized pigment weights. Source white-cloth highlights, skin and magic glow remain protected as far as the compact concept art allows.
- **Trim rendering:** The dedicated trim blend is slightly stronger than fabric, while preserving per-pixel light and shadow instead of painting flat RGB. The 24 original named hues, eight locked mystery placeholders and per-skin `localStorage` keys remain unchanged.
- **UI:** A selected/tinted portrait no longer forces a 68px inline height inside a small landscape card. Character cards have bounded height and clipping. Material tabs now occupy a separate, clearly bordered row with **44px minimum** touch targets, **46px in compact landscape**. Restoring a layer and copying looks remain available.
- **Caching:** Build 012 loads `hue-forge.js?v=012` and `wizard-hue-masks-012.png?v=012` to avoid stale assets.
- **Tests:** Run `node magic-lab/hue-forge.tests.js`: **30 offline checks**. Includes alpha integrity, trim uptake, invalid IDs, independent materials and persistence. The game script syntax/DOM regression checks preserve movement, spells, touch handling and the old rotate fix. Real-device comfort is still subject to player review.

### Suggested phone test
1. Open **HUES** while holding the iPhone sideways. Confirm the 03 card no longer covers the material buttons.
2. Tap **ROBE**, **SCARF**, **TRIM** repeatedly while 03 is selected, including the left and right edge of each tab.
3. Switch to **06** and dye its robe dark violet. Its hair should stay pale while both lower cloth panels respond.
4. Switch to **TRIM** and compare **Royal Cobalt**, **Voidbloom**, **Sunmetal**, and **Obsidian** across 03/06/08/16. Metallic decorations should visibly change without destroying the original shading.
5. Switch among the four looks and refresh the page. Previously saved palettes should still exist.
6. Return to combat and check spells, dual-thumb controls, dash, and the landscape rotation fit.

This version does **not** enable color drops, trading, account synchronization or Spell-Language.

## Hue Forge: material dye bench (build 011)

A **separate, mobile-first hue bench** is now available in Arcane Lab through the **🎨 HUES** header button.

- The selected finalists **03, 06, 08, and 16** have individually built dye masks for three channels: **robe**, **scarf**, and **trim**. For 08 and 16, robe includes their white hood or wizard hat. Skin, exposed hair, eyes, boots, and magical glow stay protected by the masks as much as possible.
- Hue Forge shows four character previews, a currently selected wizard, material tabs, and **24 named starter hues**. Every color can be applied immediately to one selected fabric layer. **RESET LAYER** returns just that material to its unchanged original artwork.
- **Eight locked catalog slots (HUE-025…HUE-032)** are *future collectible placeholders only*. There are **no drop rates, loot drops, rarity modifiers, trading, or purchase system** in Build 011.
- Every finalist has its **own independent saved robe, scarf, and trim dyes**. The selected wizard appearance and starred keepers still persist as in Build 010. Hue choices use a separate localStorage entry on the current device. Your original twenty skin assets remain untouched.
- **COPY LOOK** copies a shareable text code such as `WRKMAN-HUE/011|08|robe:violet|scarf:teal|trim:original`. This is **an export string**, not a network-backed trading, importing, or account system.
- Hue Forge pauses the encounter while you're browsing, like the existing wardrobe. It does not affect hitbox size, spell costs, movement, damage, or combat physics.

### Recoloring implementation

- New pure `hue-forge.js` module: hue registry, validation, independent persistent palettes, deterministic RGBA recoloring, frame extraction, and copyable palette codes.
- Hand-prepared **channel-coded** PNG `skins/wizard-hue-masks-011.png` (280×272). Each sprite frame is 56×68 and matches the existing 20-frame WebP atlas; red=robe, green=scarf, blue=trim. All other sixteen frames have zero masks.
- Phaser loads the same original WebP atlas plus the small mask PNG. The renderer calculates a **single current 56×68 canvas texture**, blending selected dye hues with the original pixel luminance. Original alpha and unaffected areas are preserved. Gallery/bench previews come from the same per-skin recoloring path.
- Material masks are an **early art pass**, prepared from compressed concept sprites. They intentionally favor protecting faces/glows over covering every possible cloth pixel. Further hand art refinements can improve fabric edges before animation.
- With missing masks, Hue Forge refuses to open and displays an error. With missing original art, the old vector wizard is still the fallback.
- Run **`node magic-lab/hue-forge.tests.js`** for 27 offline tests. UI interaction checks also cover four finalist buttons, independent layering, save/reset, and modal pause/resume.

### Suggested first playtest

1. Open **HUES** on the sideways phone. Pick **08**, select **ROBE**, and try **Voidbloom**, **Obsidian**, and **Royal Cobalt**.
2. Switch to **TRIM** and choose **Ancient Bronze**. Switch to **SCARF** and choose **Deep Current**.
3. Tap 03, 06, and 16. Each should maintain a separate set of colors; 08's outfit should still be waiting when you return.
4. Tap **RESET LAYER** to restore the original coloring of just the selected part.
5. Close the panel, run around and cast: only the wizard's appearance should change. Try SKINS and starred keepers again.
6. Close and reopen the page: appearance, keeper stars, and palettes should survive via local device storage.
7. Try **COPY LOOK**; inspect the literal material IDs in its code.

**Not enabled:** Hue drops, discoveries, collectibles, online sync, shared spellbook, the dormant Spell-Language runtime, or automatic hue evolution.

## Physics systems
* Arc Bolt is a Matter circle with actual velocity and collisions.
* Gravity Well applies the same distance-based attraction to any dynamic Matter body within range (including bolts).
* Kinetic Pulse pushes dynamic bodies outward with impulses.
* Frost Field changes velocity of dynamic bodies within an area.
* Movable crates and an impact-registering dummy respond to these effects.
* Gravity deflections and dummy impacts are counted in the top HUD.
* Field power persists locally; COPY BUILD copies a **lab recipe**, not a production-ready Spell Designer ability.

## Dormant Spell-Language design

The [Spell-Language v0.1 design](./spell-language/README.md) is stored in a separate folder as an **offline, draft-only experiment**. It defines bounded spell procedures, observation waits, deterministic action-intent planning, repetition-based *suggestions* and explicit parent/child lineages. The sample Stormglass recipe and Node tests live alongside it.

**Spell-Language is NOT loaded by this game.** No recording, automatic spell-casting, unlocked shortcut, learning system, UI change or multiplayer feature has been activated. Connecting it later requires an explicit user-approved integration task.

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
