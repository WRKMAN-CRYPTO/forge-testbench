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
