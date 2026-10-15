/* WANDRUNE 078: grayscale control + elemental pixel independence.
 * Run: node --test magic-lab/tests/element-control.test.js
 */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
globalThis.WRKMAN_FIELD_PHYSICS=require('../../field-physics.js');
globalThis.WRKMAN_ELEMENT_SOURCES=require('../element-sources.js');
globalThis.WRKMAN_SWARM_RUNES=require('../swarm-runes.js');
globalThis.WRKMAN_SPELL_PRESENCE=require('../spell-presence.js');
globalThis.WRKMAN_FIELD_IMPACTS=require('../field-impacts.js');
const Motion=globalThis.WRKMAN_FIELD_PHYSICS;
const Sources=globalThis.WRKMAN_ELEMENT_SOURCES;
const Crafted=require('../crafted-magic.js');
const N=32;
const make=()=>Array(N*N).fill(-1);
function seeded(){let n=0;return ()=>(((n++*97+31)%997)/997)}
test('new spells use classic grayscale launch, old saves retain explicit emitters',()=>{
 const fresh=Crafted.starter();
 assert.equal(Crafted.normalize(fresh).settings.spawnMode,'grayscale');
 const old={...fresh,settings:{...fresh.settings}};
 delete old.settings.spawnMode;
 assert.equal(Crafted.normalize(old).settings.spawnMode,'emitters');
});
test('adding element pixels does not move a SINGLE grayscale launch position',()=>{
 const values=make(),colors=Array(1024).fill(0);
 values[10*N+5]=255;values[10*N+20]=255;values[14*N+14]=120;
 const original=Sources.startingCells(values,colors,Motion,'grayscale');
 colors[10*N+5]=1;colors[10*N+20]=3;
 const altered=Sources.startingCells(values,colors,Motion,'grayscale');
 assert.deepEqual(altered.map(a=>a.index),original.map(a=>a.index));
 assert.deepEqual(altered.map(a=>a.element),[1,3]);
 assert.deepEqual(original.map(a=>a.element),[0,0]);
 const a=Sources.spawn(values,original,Motion,seeded(),0);
 const b=Sources.spawn(values,altered,Motion,seeded(),0);
 assert.deepEqual([a.x,a.y,a.vx,a.vy,a.seed],[b.x,b.y,b.vx,b.vy,b.seed]);
});
test('color stamps outside bright motion regions tint births, not relocate them',()=>{
 const values=make(),colors=Array(1024).fill(0);
 values[4*N+4]=255;values[25*N+25]=255;
 colors[0]=1;colors[31*N+31]=2; // Colors on magenta instruction pixels
 const births=Sources.startingCells(values,colors,Motion,'grayscale');
 assert.deepEqual(births.map(a=>a.index),[4*N+4,25*N+25]);
 assert.deepEqual(births.map(a=>a.element),[1,2]);
 const first=Sources.spawn(values,births,Motion,()=>0,0);
 assert.equal(first.element,1);
 assert.equal(first.sourceIndex,4*N+4);
});
test('same velocity and grayscale trajectory with or without coloring',()=>{
 const values=make(),plain=Array(1024).fill(0),colored=Array(1024).fill(0);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)values[y*N+x]=255-Math.floor(x*7);
 colored[17*N+7]=4;
 const uncolored=Sources.spawn(values,Sources.startingCells(values,plain,Motion,'grayscale'),Motion,seeded(),1);
 const bright=Sources.spawn(values,Sources.startingCells(values,colored,Motion,'grayscale'),Motion,seeded(),1);
 for(let i=0;i<180;i++){
  const t=i/60;
  Motion.stepAgent(uncolored,values,{mode:'ab',swirl:26,momentum:62},1/60,360,500,t);
  Motion.stepAgent(bright,values,{mode:'ab',swirl:26,momentum:62},1/60,360,500,t);
 }
 for(const k of ['x','y','vx','vy','progress','free'])
  assert.equal(uncolored[k],bright[k],k+' should ignore element labels');
 assert.equal(bright.element,4);
 assert.equal(uncolored.element,0);
});
test('explicit elemental emitter mode remains exactly where colors are painted',()=>{
 const values=make(),colors=Array(1024).fill(0);
 values[10*N+4]=255;colors[25*N+24]=2;
 const starts=Sources.startingCells(values,colors,Motion,'emitters');
 assert.deepEqual(starts,[{index:25*N+24,element:2}]);
 const spawned=Sources.spawn(values,starts,Motion,()=>.5,0);
 assert.equal(spawned.sourceIndex,25*N+24);
 assert.equal(spawned.element,2);
});
test('multiple elements and neutral stamps preserve geographic composition',()=>{
 const values=make(),colors=Array(1024).fill(0);
 for(let x=2;x<30;x++)values[15*N+x]=255;
 colors[15*N+2]=1;colors[15*N+18]=3;colors[15*N+29]=5;
 const starts=Sources.startingCells(values,colors,Motion,'grayscale');
 assert.equal(starts.find(a=>a.index===15*N+3).element,1);
 assert.equal(starts.find(a=>a.index===15*N+20).element,3);
 assert.equal(starts.find(a=>a.index===15*N+28).element,0);
});
test('starter, saved recipe and preview use the same launch policy',()=>{
 const recipe=Crafted.starter();recipe.settings.population=7;
 recipe.values=make();recipe.values[10*N+8]=255;
 recipe.sources=Array(1024).fill(0);recipe.sources[25*N+8]=4;
 const scene={time:{now:10},player:{x:0,y:0},aim:{x:1,y:0},craftedAudioEnabled:false};
 assert.equal(Crafted.start(scene,recipe,false),true);
 const cast=scene.craftedAura;
 assert.equal(cast.starts.length,1);
 assert.equal(cast.starts[0].index,10*N+8);
 assert.equal(cast.starts[0].element,4);
 assert.equal(cast.agents.length,7);
 assert.ok(cast.agents.every(a=>a.element===4&&a.sourceIndex===10*N+8));
});
