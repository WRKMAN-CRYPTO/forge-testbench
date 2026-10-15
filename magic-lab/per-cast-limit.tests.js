/* Wandrune 071 | Per-cast population regression
 * Run: node magic-lab/per-cast-limit.tests.js
 * No browser, graphics driver, network, or gameplay timers required.
 */
'use strict';
const assert=require('node:assert/strict');
globalThis.WRKMAN_FIELD_PHYSICS=require('../field-physics.js');
globalThis.WRKMAN_ELEMENT_SOURCES=require('./element-sources.js');
globalThis.WRKMAN_SWARM_RUNES=require('./swarm-runes.js');
globalThis.WRKMAN_FIELD_IMPACTS=require('./field-impacts.js');
const Crafted=require('./crafted-magic.js');
const base=Crafted.starter();
const scene=()=>({time:{now:1000},player:{x:260,y:300},aim:{x:1,y:0},combat:{hp:100,enemies:[]}});

{
 const old=Crafted.normalize({...base,settings:{...base.settings,
  population:6000,renderLimit:6000,delivery:'world'}});
 assert.equal(old.settings.population,200,'legacy 6000-population recipe clamps to 200 per cast');
 assert.equal(old.settings.renderLimit,6000,'display budget must NOT be capped at 200');
 assert.equal(Crafted.normalize({...base,settings:{...base.settings,population:50}}).settings.population,50,
  'fewer than 200 agents remains a supported recipe');
 assert.equal(Crafted.normalize({...base,settings:{...base.settings,population:201}}).settings.population,200);
 assert.equal(Crafted.starter().settings.population,200);
 assert.equal(Crafted.starter().settings.renderLimit,1200,'restore default visual budget');
}
{
 const s=scene(),recipe=Crafted.normalize({...base,settings:{...base.settings,
  population:200,delivery:'world',renderLimit:6000}});
 for(let i=0;i<7;i++){
  s.time.now=1000+i*700;
  assert.equal(Crafted.start(s,recipe,false),true,
   'a world cast must not be rejected by another cast or the old 3-emission limit');
 }
 assert.equal(s.craftedShots.length,7);
 assert.equal(s.craftedShots.reduce((sum,c)=>sum+c.agents.length,0),1400,
  'aggregate population may exceed 200 and is not capped globally');
 for(const cast of s.craftedShots){
  assert.equal(cast.agents.length,200,'each cast still births no more than 200');
  assert.equal(cast.recipe.settings.renderLimit,6000,'display setting survives repeated casts');
 }
 // Existing aura deployment/redeployment semantics remain intact.
 const aura=Crafted.normalize({...base,settings:{...base.settings,population:100,delivery:'aura'}});
 assert.equal(Crafted.start(s,aura,false),true,'aura may coexist with many world emissions');
 assert.equal(s.craftedAura.agents.length,100);
 assert.equal(Crafted.start(s,aura,false),false,'second aura still follows the original toggle rule');
 assert.equal(s.craftedShots.length,7,'aura toggle does not clear world emissions');
 // Rendering is not capped by the number of agents in one cast.
 const graphics={fillStyle(){},fillPoints(){},lineStyle(){},lineBetween(){},strokeCircle(){}};
 Crafted.draw(s,graphics,1500);
 assert.equal(s.craftedShots.reduce((sum,c)=>sum+c.rendered,0),1400,
  'all visible agents across casts may render on an unrestricted display budget');
}
console.log('Wandrune 071 per-cast population checks passed');
