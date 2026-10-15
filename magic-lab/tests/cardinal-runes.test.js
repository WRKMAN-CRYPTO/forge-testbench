/* WANDRUNE 079 / Cardinal rune regression tests
 * node --test magic-lab/tests/cardinal-runes.test.js
 */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
globalThis.WRKMAN_FIELD_PHYSICS=require('../../field-physics.js');
globalThis.WRKMAN_ELEMENT_SOURCES=require('../element-sources.js');
globalThis.WRKMAN_SWARM_RUNES=require('../swarm-runes.js');
globalThis.WRKMAN_SPELL_PRESENCE=require('../spell-presence.js');
globalThis.WRKMAN_FIELD_IMPACTS=require('../field-impacts.js');
const R=globalThis.WRKMAN_SWARM_RUNES;
const Crafted=require('../crafted-magic.js');
const N=32;
function stage(tiles){
 const recipe=Crafted.starter();recipe.settings.population=1;
 recipe.runes.fill(0);
 for(const [x,y,rune] of tiles)recipe.runes[y*N+x]=rune;
 const st={recipe:Crafted.normalize(recipe),agents:[],born:100,worldW:360,worldH:500,
  scale:290,center:{x:0,y:0},right:{x:1,y:0},forward:{x:0,y:1},delivery:'world',spawnX:.5,spawnY:.5};
 R.configure(st);return st;
}
function agent(x=10.5,y=10.5,vx=3,vy=4){
 return {x:x/N,y:y/N,prevX:x/N,prevY:y/N,vx,vy,tail:[],element:0,seed:0};
}
function move(st,a,x,y,time=120){
 a.prevX=a.x;a.prevY=a.y;a.x=x/N;a.y=y/N;
 R.advance(st,null,time,1/60);
 return a;
}
test('four cardinal rune IDs are stable and map-space directions are exact',()=>{
 for(const [id,label,dx,dy] of [[8,'north',0,-1],[9,'south',0,1],
  [10,'west',-1,0],[11,'east',1,0]]){
  assert.equal(R.byId(id).key,label);
  const a=agent(10,10,3,4);
  assert.equal(R.direct(a,id),true);
  assert.equal(a.vx,5*dx);
  assert.equal(a.vy,5*dy);
 }
 assert.equal(R.byId(7).key,'wall');
 assert.equal(R.byId(4).key,'seeker');
});
test('a still agent receives enough motion to obey a directional tile',()=>{
 const a=agent(10,10,0,0);
 R.direct(a,8);
 assert.equal(a.vx,0);assert.equal(a.vy,-2);
});
test('birth directly on a directional pixel acts immediately, exactly once',()=>{
 const st=stage([[10,10,10]]);
 const a=agent(10.25,10.25,0,3);a.sourceIndex=10+10*N;
 st.agents=[a];R.onBirth(st);
 assert.ok(a.vx<0&&a.vy===0);
 assert.equal(st.directionHits,1);
 move(st,a,10.4,10.3,120);
 assert.equal(st.directionHits,1);
});
test('entering a cardinal rune redirects, leaving and re-entering re-arms',()=>{
 const st=stage([[12,10,8]]);
 const a=agent();st.agents=[a];
 move(st,a,12.5,10.5,110);
 assert.ok(a.vx===0&&a.vy<0);
 assert.equal(st.directionHits,1);
 move(st,a,13.5,10.5,130);
 assert.equal(st.directionHits,1);
 move(st,a,12.5,10.5,150);
 assert.equal(st.directionHits,2);
 assert.ok(a.vx===0&&a.vy<0);
});
test('fast movement across consecutive cardinal tiles triggers in traversal order',()=>{
 const st=stage([[11,10,8],[13,10,11]]);
 const a=agent(10.5,10.5,1,1);st.agents=[a];
 move(st,a,17.5,10.5,120);
 assert.equal(st.directionHits,2);
 assert.ok(a.vx>0&&a.vy===0,'east is last, and wins');
});
test('wall blocks activation of a direction rune behind it',()=>{
 const st=stage([[12,10,7],[14,10,9]]);
 const a=agent(10.5,10.5,4,0);st.agents=[a];
 move(st,a,19.5,10.5,120);
 assert.ok(a.x<12/N);
 assert.equal(st.directionHits,0);
 assert.ok(a.vx<0);
});
test('directions use field axes even when world spell is rotated',()=>{
 const st=stage([[10,10,8]]);
 st.right={x:0,y:1};st.forward={x:-1,y:0};
 const a=agent(10.5,10.5,3,4);a.sourceIndex=10+10*N;
 st.agents=[a];R.onBirth(st);
 assert.equal(a.vx,0);
 assert.equal(a.vy,-5);
 // Local north = negative forward = world right in this rotated spell.
 const worldVX=a.vx*st.right.x*st.worldW+a.vy*st.forward.x*st.worldH;
 const worldVY=a.vx*st.right.y*st.worldW+a.vy*st.forward.y*st.worldH;
 assert.ok(worldVX>0&&Math.abs(worldVY)<1e-9);
});
test('birth, color, and runes stay independent; 200-agent limit unchanged',()=>{
 const r=Crafted.starter();r.settings.population=200;
 r.runes[10*N+10]=8;r.sources[10*N+10]=1;
 assert.equal(Crafted.normalize(r).settings.population,200);
 assert.equal(Crafted.normalize(r).sources[10*N+10],1);
 assert.equal(Crafted.normalize(r).runes[10*N+10],8);
});
