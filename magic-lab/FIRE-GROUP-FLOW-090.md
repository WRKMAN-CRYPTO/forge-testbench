# Wandrune 090: Flowing Group Fire

**Implemented on isolated VFX test bench only.** Not merged into production Wandrune.

## Motivation

The Pass 089 iPhone recording showed a flame centipede: a smooth, glowing fire capsule with ten small, regular-looking appendages. The single-agent 088c fire rotation was already approved and must remain untouched.

## Changed renderer: flowing fire ribbons

- New optional `pixi-fire-group-flow.js` replaces uniformly distributed edge teeth with at most **four wide, curved and asymmetrically located fire ribbons per sampled group**, twelve total across three groups.
- Ribbons attach to genuine already-computed outer contours, with a broad root inside the body and curved warm/amber tips. They are not agent sprites and do not occupy simulation slots.
- Eligible contour anchors must face the mass's approximate collective travel direction or upward. The lower/away-facing edge is mostly untouched, breaking the bilateral 'centipede legs' pattern.
- Group flow reads the existing members' motion angles. Coherent movement biases the tongues forward with some rising convection. Diffuse groups favor upward convection. No simulation velocity or path is changed.
- Tongue length and bend vary smoothly with the existing presentation clock. No per-frame new textures and no random spawning. The old rounded plasma border strength is further suppressed in FLOW mode, so it no longer dominates the silhouette.
- The existing sampled density body, hot core and 3-mass nonblocking fire tracker are preserved. **No new field pass**, physics actor, projectile, mana change, hitbox, rune behavior or gameplay logic. The accepted 088c single-agent motion module is unchanged.
- Rendering-only `GROUP FIRE` button cycles **FLOW → SPIKES → OFF → FLOW**, so users can compare current version, centipede-style Pass 089, and prior smooth plasma Pass 088c. Query parameter `fireGroupStyle=flow|spikes|off` selects the initial appearance. `fireGroupFlames=0` still restores the earlier baseline.
- Opt-in module and bounded effects failure-safe to the preexisting renderer/Phaser fallback. All source agent records stay immutable.

## Tests

**15/15 headless suites, 1,942 assertions passed.**

New Pass 090 integration: 74 assertions, including group-average travel, broad-ribbon geometry, moving tip direction, smooth time deformation, immutable group inputs, original 089 comparison, GROUP FIRE OFF/ON, 600 fire agents across three casts, and the 12-ribbon budget.

Original Pass 089 group-flame suite: 62 assertions. All earlier renderer suites, camera registration, fire-density/perimeter/hot-core stability, single-agent flame and 088c motion-angle tests pass.

## On-device acceptance check

1. Repeat the cone spell shown in the centipede recording. Watch the leading/top outline and check whether the fire is asymmetrical and flowing, not a tube with legs.
2. Tap GROUP FIRE through FLOW, SPIKES, and OFF on the same spell.
3. Check three simultaneous 200-agent casts and confirm that visual frame rate and touch controls remain acceptable.
4. Confirm 088c single-agent tip/tail direction remains correct, and that the frost renderer remains unchanged.
5. If it still reads like a creature, evaluate shaping the shared density body itself rather than adding more contours.

Headless assertions and deployment success are not proof of iPhone visual quality or frame performance. Keep production Wandrune untouched until approval.
