# WANDRUNE 056 | Elemental Material Pass

### New art direction
Crafted magic's 32×32 *simulation* has not been modified. The renderer now uses the agent's persistent birth element, including mass-merged / fractured agents, to pick its visible material:
- **Frost:** clear-cut pale blue crystalline facet lines, reflected grain, drifting 6-point ice glints
- **Lightning:** saturated electric rim, white-hot zigzag conductors, branching spark flickers, at most 2/4 local point-light approximations
- **Fire:** layered yellow/orange coal with swirling inner tongues, hot embers rising from real agent locations
- **Water:** refracted cyan ribbons, specular tear-shaped highlight, faint liquid ripples
- **Neutral:** gemstone/rune facets that follow the recipe's flame, arcane, healing or void palette (3 brightness variations)

This pass builds reusable 48×48 vector-generated **Canvas textures once** per Phaser texture manager. Graphics fallback paints per-element facets for unsprited agents. It retains the existing recipe leaf shape, tail motion, lifespan fade, rune size and recipe strength, and 6,000-agent simulation cap.

### Architecture
- \`element-vfx.js\` owns the texture/material atlas, sprite pool, deterministic ambient glints, capped point-light effects, impact bursts and graphics tiers.
- \`crafted-magic.js\` calls the visual adapter from its existing \`draw(scene,g,time)\`; all physics, rune updates, impact calculation, recipe saves, damage and collision code are unchanged.
- \`index.html\` installs the optional module, starts/ends each frame, and provides a \`☰ → ELEMENT FX\` quality cycle. Exceptions from the *visual* adapter fall back to the original renderer.

### Phone settings
| Option | Maximum pooled textured bodies | Decorative mote anchors | Point lights |
| --- | ---: | ---: | ---: |
| Low | 0 (enhanced Graphics bodies) | 26 | 0 |
| Medium (default) | 300 | 105 | 2 |
| High | 850 | 220 | 4 |

Settings use \`wrkman-wandrune056-vfx-quality\` in localStorage. Quality changes do not modify cast behavior, combat or save data. Decorative effects are bounded globally per rendered frame, not per agent. Lighting is WebGL-only and guarded behind renderer support; the game remains playable without it.

The regular game scene render order is preserved: world graphics at depth 4, crafted field graphics at depth 5, VFX material sprites at 5.22, motes at 5.35, local lights at 5.38, player cosmetics at depth 6.

### Mobile smoke test
1. Start Wandrune. Open ☰ → SPELL FORGE. Paint fire, frost, lightning, and water pixels in the SOURCE layer. Save/Equip and cast an emission.
2. Watch a moving fire spell: golden embers and scorching cores. Watch frost: facets and isolated cold glints. Watch lightning: white conductor cores, arcing sparks and localized illumination.
3. Switch Low → Medium → High with ☰ → ELEMENT FX. Compare visuals and responsiveness on iPhone.
4. Form a Behemoth, Fracture it and use Seeker; the color/texture remains tied to the preserved element identity.
5. Test a long 6,000-agent spell with low render cap, then a high draw budget. No new physics bodies or new collision handlers should appear.
6. Test death fade and impact glints. The faded agents continue original field motion, and gameplay capacities still clear immediately.
7. Test Canvas fallback via \`?renderer=canvas\`; expensive point lights are skipped.
