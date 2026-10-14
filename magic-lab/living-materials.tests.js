/* Wandrune 069 | Registry integration (node magic-lab/living-materials.tests.js)
 * Runs actual Crafted.draw with and without the optional element renderer.
 */
'use strict';
const assert=require('node:assert/strict');
const Motion=require('../field-physics.js');
const Sources=require('./element-sources.js');
const Runes=require('./swarm-runes.js');
const Impacts=require('./field-impacts.js');
globalThis.WRKMAN_FIELD_PHYSICS=Motion;
globalThis.WRKMAN_ELEMENT_SOURCES=Sources;
globalThis.WRKMAN_SWARM_RUNES=Runes;
globalThis.WRKMAN_FIELD_IMPACTS=Impacts;
const Materials=require('./element-material-registry.js');
const C=require('./crafted-magic.js');

assert.equal(Sources.TYPES.length,6,'Birth elements unchanged by cosmetic upgrades');
assert.deepEqual(Materials.effects().sort(),['explosion','gravity','healing']);
assert.equal(typeof Materials.registerElement,'function');
assert.equal(typeof Materials.registerEffect,'function');

const recipe=C.normalize(C.starter());
const scene={time:{now:1000},player:{x:230,y:280},
 combat:{hp:50,enemies:[]},rings:[],cameras:{main:{worldView:null}}};
assert.equal(C.start(scene,recipe,true),true);
const st=scene.craftedAura||scene.craftedShots?.[0];
assert.ok(st?.agents?.length,'The real swarm must exist');
st.healFX=[{x:100,y:100,born:1000}];
let primitives=0,hookCalls=0,paintedAgents=0;
const g=new Proxy({}, {get(_,key){return (...args)=>{primitives++;};}});

scene.elementVfx={
 paint(){paintedAgents++},
 paintImpact(){},
 effect(g,options){
  assert.equal(options.effect,'healing');
  assert.equal(options.x,100);assert.equal(options.y,100);
  hookCalls++;return true;
 }
};
C.draw(scene,g,1200);
assert.equal(hookCalls,1);
assert.ok(paintedAgents>0,'Real agents still draw through the material layer');

// Older renderers that lack .effect, and missing renderers, must both work.
const before=primitives;
scene.elementVfx={paint(){},paintImpact(){}};
C.draw(scene,g,1200);
assert.ok(primitives>before,'Fallback healing graphics still work');
scene.elementVfx=null;
const after=primitives;
C.draw(scene,g,1200);
assert.ok(primitives>after,'Original agent + effect rendering remains playable');

// Visual hooks do not touch health or agent population.
assert.equal(scene.combat.hp,50);
assert.equal(st.agents.length>0,true);
console.log('Wandrune 069 living-material integration checks passed');
