# WRKMAN Arcane Lab 043 | Adjustable Agent Lifespan + Fade

## What changed
Every crafted 32×32 spell recipe now stores `settings.lifespan`, in seconds, with a **0.5–30.0 second range and 0.5-second steps**. Older recipes without the setting default to **5.5 seconds**. The Forge's **HEX LIFESPAN** slider edits the selected recipe, and SAVE & EQUIP preserves it in the existing local library and portable Agent·Field JSON.

The physics engine `../field-physics.js` remains unchanged.

### At expiry
- Individual agents are fully simulated, visible, and able to collide until their own spawn time + the selected lifespan.
- **At their cutoff**, surviving agents are removed from the *live* swarm. They stop moving, hitting enemies/rocks, producing healing, and using the 6,000-live-agent capacity.
- A sampled visible-only particle snapshot softly fades for **800 ms**. It holds world-space position and its flat-hex or leaf orientation. It has **no physics, gameplay timers, damage, or collision checks**.
- A cast with zero live particles is removed immediately, freeing its casting slot; an optional linked Minor Heal ends with its parent.
- Scene reset/region transitions clear both the active spells and remaining visual ghosts. Fade memory is capped to **6,000 rendered ghost snapshots** and uses each recipe's display budget.
- Collision-destroyed particles still disappear on contact. Only natural lifespan expiry gets the soft fade.

### Preview
The Forge preview now respects the selected lifespan, after which its hexes fade and the preview pauses. Use **RESEED PREVIEW** to replay the newly configured spell. It uses the canonical 32×32 movement engine but a separate graphical display.

### Compatibility
- All previously saved 32×32 recipes retain their patterns and settings; missing `lifespan` defaults to 5.5 seconds.
- No changes to the original Agent·Field lab's movement, scene geometry, or physics.
- All three delivery modes (Aura, World Emission, Placed Field) use the same age rule.
- The old fixed delivery durations no longer truncate a 30-second agent's active life.
- Existing spell storage keys and previously implemented per-agent swept collisions are unchanged.

### Verification
110 pure/integration JavaScript checks passed, covering 0.5, 5.5 and 30 seconds in every delivery mode, exact threshold expiry, partial/complete ghost fade, absence of collisions from expired ghosts, per-agent staggered births, overlapping casts, cast-capacity cleanup, reset cleanup, save/load round-trip, and source syntax/dependency references.

**Remaining validation:** phone/PC feel and actual frame time with multiple 6,000-agent spells have not been measured. Prefer testing at 1,200 visible agents first.

## Playtest
1. Open ☰ → SPELL FORGE and choose a saved recipe.
2. Set **HEX LIFESPAN** to 2.0 seconds. Press RESEED PREVIEW and observe it stop and fade.
3. SAVE & EQUIP, cast on the arena and observe the agents fade over approximately 0.8 seconds after the active two seconds.
4. Try 10.0 seconds with your Bankai. Save and reload to confirm the selected spell retains its setting.

_W / Clock In. Build Something._
