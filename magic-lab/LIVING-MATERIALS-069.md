# Wandrune 069 | Living Materials

## Architecture: simulation first, cosmetics second

A swarm agent retains its existing 32×32 instruction genome, motion, mass, collisions and birth element. The renderer receives its `element` ID, world position, display radius and visual parameters. **This pass changes presentation, never gameplay.**

- `element-material-registry.js` is the single extension point for material appearance and reusable visual effects.
- `element-vfx.js` reads that registry and builds texture canvases **only once per material**, on first use. It pools sprite images and clusters glowing agents into **at most 2/4** lights in Medium/High, with **zero** light sprites in Low. No per-agent PointLights, shaders or physics bodies.
- `crafted-magic.js` continues to simulate its existing agents, and paints both agent textures and linked healing FX using the optional renderer.
- `index.html` draws gravity wells through the gravity effect hook (with the original fallback).
- `combat.js` draws combat shockwaves through the explosion hook (with the original fallback).

**Current birth elements are unchanged:** neutral/arcane (0), fire (1), water (2), frost (3), lightning (4). Element-source value 5 remains the neutral-source paint choice. New material ID 6+ is reserved for future **visual extension**, but does not cause new gameplay without separate updates to `element-sources.js`, agent composition and elemental interactions.

## Add a new material

Register in `element-material-registry.js` (or register during startup before its first use):

```js
window.WRKMAN_MATERIAL_REGISTRY.registerElement({
  id:6, key:"plasma",
  rgb:0xd78aff, glow:0x9744ed,
  center:"#fff4ff", mid:"#d99bff", edge:"#6224a6",
  shape:"crystal", mote:"spark",
  light:true, lightPriority:2
  // Optional: drawTexture(ctx,seed), drawMote(g,agent,{time,f,phase})
});
```

No sprite or particle-system code changes are required. The texture is generated once per new ID, ordinary shapes remain visible even when the sprite budget is exhausted, and extras respect the existing quality caps. Adding the element *to the playable 32×32 birth palette* is **not part of this pass**.

## Add a reusable effect

```js
window.WRKMAN_MATERIAL_REGISTRY.registerEffect({
  key:"gravity-pulse",
  draw(g,{x,y,r=70,progress=0,alpha=1,time=0}) {
    g.lineStyle(2,0xb699ff,alpha*(1-progress));
    g.strokeCircle(x,y,r*progress);
  }
});
// Draw while rendering only:
scene.elementVfx?.effect?.(g,{
  effect:"gravity-pulse",x:100,y:200,r:90,progress:.35,time:scene.time.now
});
```

The descriptor's `draw` callback is cosmetic and receives only the rendering context and a plain options object. It cannot apply forces, heal, explode, or modify the simulation through this API. The built-in `gravity`, `explosion` and `healing` effects are **now drawing real existing game events**. Creating corresponding **swarm agent abilities** is later gameplay work.

### Performance, fallback, and visual design

| Quality | Textured agents maximum | Extra motes maximum | Pooled halos maximum |
| --- | ---: | ---: | ---: |
| Low | 0 | 26 | 0 |
| Medium | 300 | 105 | 2 |
| High | 850 | 220 | 4 |

1. Sharp textured cores remain legible separately from glows.
2. Large, sparse, pooled halos never become hundreds of giant flashing white circles.
3. Each element can specify distinct grain, particle motes and a glow color.
4. Registry effects are finite and cheap; physics and render budgets remain separate.
5. Missing registry/effect hooks trigger existing Graphics fallbacks so the game remains playable.

## Verification

Run `node magic-lab/element-vfx.tests.js`. Existing tests cover fixed pool and halo caps, low-power mode, stable subsampling, lighting opacity/diameter and resource cleanup. The Build 069 extensions test registering a sixth material with a custom one-time texture and pooled halo, all three builtin effect hooks, a fourth custom effect, duplicate registration rejection, and the original fallback.

Suggested device QA: try 200 mass and then 6,000 mass spells on iPhone. Compare Medium with Low. Confirm distinct frost shards, hot fire, concentrated lightning illumination, gravity spiral rings, explosions and healing pulses without stutters, white-disk flashing or a changed hitbox.

**Next mechanics (not yet implemented):** Gravity agents that create field forces, explosive agents with bounded impact energy / chain reactions, and healing agents that deliver valid healing on contact. Each will need an explicit gameplay specification and separate balance tests.
