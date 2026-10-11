# WRKMAN Agent·Magic v0.3.2 · Living Flame

Standalone, phone-first canvas lab for hex-agent magic. The roguelike is **not** modified.

## New in v0.3.2

- **Independent motion clock:** `phaseClock` controls formation, hold, launch and release. `motionClock` continues while the spell is held. Both pause together when Pause is used; Cast starts a new sequence.
- **Living hold:** Fireball's core convects and shell orbits indefinitely while charged. Sigil rings, wards and other spell shapes retain internal motion even when their lifecycle is held.
- **Fireball convection:** Core vortices, flickering shell, tongues, and drifting embers, influenced by Shimmer, Freedom and Intensity.
- **Agent-made trail:** During launch, filament and ember agents occupy delayed positions along the projectile path, with moving lateral turbulence. The previous synthetic straight glow stroke is removed.
- **Same bounded light:** The source-over light budget still prevents additive whiteout, including under extreme 8,000-agent settings.
- **Existing spell controls retained:** Cast, Activate/Launch, Dissolve, Auto Cast, Pause, Swarm size, Light budget, Structure, Cohesion, Shimmer, Intensity, Freedom and palette.

## Testing

- Automated desktop Chromium mobile viewport tests covered Fireball, Sigil, Ward, Orb and Summon through a six-second hold, activation and full release.
- Every tested spell kept its lifecycle clock fixed while its rendering agents moved during the hold.
- 8,000-agent Fireball stress test: 100 of 100 sampled agents moved during a six-second hold; no near-white pixels in a canvas snapshot at maximum settings; no page JavaScript errors.
- A stage resize preserved the held lifecycle clock.
- Browser desktop emulation is not a guarantee of physical iPhone FPS or temperature.

## Files

- `index.html`: self-contained GitHub Pages app. No build step, CDN or external JS required.
- `magic.js`: synchronized, inspectable JavaScript copy. The app runs its inline script, so this is not loaded twice.

## Quick test

1. Choose Fireball and press Cast.
2. Wait for **CHARGED · CHURNING**. Watch the agents move without launching.
3. Tap/drag on the canvas to aim, then press **LAUNCH**.
4. Watch the physically trailing hex agents and the detonation.
5. Choose Sigil or Ward; observe held circulation, then press Activate.

The underlying effect is an experiment in emergent-looking motion, not a physically simulated plasma model.