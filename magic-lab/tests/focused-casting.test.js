/* WANDRUNE 076 / One Is Enough.
 * Run: node --test magic-lab/tests/focused-casting.test.js
 * Exercises the real field engine, solo contact kernel, and fading FX,
 * without Phaser or a browser.
 */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
globalThis.WRKMAN_FIELD_PHYSICS=require('../../field-physics.js');
globalThis.WRKMAN_ELEMENT_SOURCES=require('../element-sources.js');
globalThis.WRKMAN_SWARM_RUNES=require('../swarm-runes.js');
globalThis.WRKMAN_SPELL_PRESENCE=require('../spell-presence.js');
globalThis.WRKMAN_FIELD_IMPACTS=require('../field-impacts.js');
const Presence=globalThis.WRKMAN_SPELL_PRESENCE;
const Impacts=globalThis.WRKMAN_FIELD_IMPACTS;
const Crafted=require('../crafted-magic.js');
const Mana=require('../mana-system.js');

function room(time=100){
 return {time:{now:time},player:{x:100,y:150},aim:{x:1,y:0},
  craftedAudioEnabled:false,combat:{enemies:[],pillars:[],debris:[]},
  actors:[],rings:[]};
}
function recipe(population,delivery='world'){
 const r=Crafted.starter();r.settings.population=population;
 r.settings.delivery=delivery;return r;
}
test('exact one agent, same original physics, starts at the casting hand',()=>{
 const scene=room();
 assert.equal(Crafted.start(scene,recipe(1),false),true);
 const spell=scene.craftedShots[0];
 assert.equal(spell.agents.length,1);
 assert.equal(globalThis.WRKMAN_SWARM_RUNES.mass(spell.agents[0]),1);
 const pt=Crafted.worldPosition(spell,spell.agents[0]);
 assert.ok(Math.hypot(pt.x-(scene.player.x+30),pt.y-scene.player.y)<.001);
 assert.ok(scene.craftedAccentFX.some(e=>e.kind==='launch'));
 assert.equal(spell.focus.impactBonus,16);
});
test('one actual collision has enough weight to matter and finishes its FX',()=>{
 const scene=room();
 Crafted.start(scene,recipe(1),false);
 const spell=scene.craftedShots[0],a=spell.agents[0];
 const enemy={alive:true,id:1,type:'charger',r:20,
  body:{position:{x:spell.center.x,y:spell.center.y}}};
 scene.combat.enemies=[enemy];
 // Sweep a single real agent through the target in world coordinates.
 a.prevX=a.x;a.prevY=a.y-.2;a.y+=.2;
 let damage=0;
 const combat={hitEnemy(_scene,_enemy,amount){damage+=amount}};
 assert.equal(Impacts.process(scene,spell,200,combat,{...spell.center}),1);
 assert.ok(damage>=15);
 assert.equal(spell.agents.length,0);
 scene.time.now=210;
 Crafted.step(scene,210,16,combat);
 assert.equal(scene.craftedShots.length,0);
 assert.equal(Crafted.snapshot(scene).active,false);
 assert.ok(scene.craftedAccentFX.some(e=>e.kind==='impact'));
 let calls=0;
 const graphics=new Proxy({}, {get(_t,k){
  if(k==='then')return undefined;
  return ()=>{calls++;return graphics};
 }});
 Crafted.draw(scene,graphics,215);
 assert.ok(calls>0,'Finishing impact should still be visible after last agent dies');
 Presence.step(scene,800);
 assert.equal(scene.craftedAccentFX.length,0,'Visual effects expire independently');
});
test('one, seven and 200 are real exact counts; no global swarm cap',()=>{
 const scene=room(),first=recipe(1),second=recipe(7),third=recipe(200);
 assert.equal(Crafted.normalize(first).settings.population,1);
 assert.equal(Crafted.normalize(second).settings.population,7);
 assert.equal(Crafted.normalize({...third,settings:{...third.settings,population:300}}).settings.population,200);
 Crafted.start(scene,first,false);
 Crafted.start(scene,second,false);
 Crafted.start(scene,third,false);
 assert.deepEqual(scene.craftedShots.map(st=>st.agents.length),[1,7,200]);
 assert.equal(scene.craftedShots[0].focus.focused,true);
 assert.equal(scene.craftedShots[2].focus.focused,false);
 assert.equal(scene.craftedShots[2].focus.impactBonus,0);
});
test('full-swarm mana price stays fixed; solo spells cost less',()=>{
 const m=Mana.create();
 assert.equal(m.cost(recipe(200,'world')),66);
 assert.equal(m.cost(recipe(200,'aura')),58);
 assert.equal(m.cost(recipe(1,'world')),15);
 assert.equal(m.cost(recipe(1,'aura')),7);
});
test('focus styling cannot manufacture extra mass or alter hit radius',()=>{
 const a=Presence.profile(1),b=Presence.profile(200);
 assert.equal(a.focus,1);
 assert.ok(a.radiusBonus>0&&a.impactBonus>0);
 assert.equal(b.radiusBonus,0);assert.equal(b.impactBonus,0);
 const rune=globalThis.WRKMAN_SWARM_RUNES;
 assert.equal(rune.mass({mass:1}),1);
 assert.equal(rune.radius({mass:1}),3);
});
