# WRKMAN Agent·Magic v0.3

Standalone, phone-first experimental magic renderer built from moving hexagonal agents. No roguelike integration yet.

## Try it

Open `index.html` using GitHub Pages at `https://wrkman-crypto.github.io/forge-testbench/agent-magic/`.

## Spell forms

- **Orb**: glowing arcane formation.
- **Ward**: defensive ring.
- **Sigil**: forms and **holds indefinitely** until `ACTIVATE` triggers its final dissolution; `DISSOLVE` also releases it.
- **Summon**: spirit-familiar silhouette assembled by the swarm.
- **Fireball**: charge and hold at formation, tap or drag on the stage to aim, then press `ACTIVATE` to launch, trail embers, and burst. You can also `DISSOLVE` directly.

## Controls

Cast, Activate, Dissolve, Auto Cast, Pause, Swarm size (500–8,000), Light budget, Structure, Cohesion, Shimmer, Intensity, Agent freedom, and color family (including Flame).

## Notes

`index.html` is self-contained and is the runnable GitHub Pages entry point. `magic.js` is a readable copy of the inline JavaScript for inspection. Rendering uses bounded source-over light, with each agent's position and contribution modeled independently. The project is an experimental visual study, not yet a game effect pipeline.
