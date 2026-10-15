/* WANDRUNE 077 / WALL rune regression tests.
 * Run: node --test magic-lab/tests/wall-rune.test.js
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
const N=32,WALL=7;
function walls(cells){
 const runes=Array(N*N).fill(0);
 for(const [x,y] of cells)runes[y*N+x]=WALL;
 const st={recipe:{runes},agents:[],born:0,worldW:360,worldH:500,scale:290};
 R.configure(st);return st;
}
function move(st,from,to,{phase=false}={}){
 const a={prevX:from[0]/N,prevY:from[1]/N,x:to[0]/N,y:to[1]/N,
  vx:(to[0]-from[0])*2,vy:(to[1]-from[1])*2,phaseUntil:phase?1e6:0,
  tail:[],element:0};
 const hit=R.resolveWall(st,a);
 return {a,hit};
}
test('new WALL rune normalizes and has a recognizable editor identity',()=>{
 const cfg=Crafted.starter();
 cfg.runes[10*N+12]=WALL;
 assert.equal(Crafted.normalize(cfg).runes[10*N+12],WALL);
 assert.equal(R.byId(WALL).key,'wall');
 assert.ok(R.byId(WALL).symbol);
});
test('horizontal high-speed agent cannot tunnel through even one pixel',()=>{
 const st=walls([[12,10]]);
 const {a,hit}=move(st,[3.5,10.5],[25,10.5]);
 assert.equal(hit,true);
 assert.ok(a.x<12/N);
 assert.ok(a.vx<0,'bounce is physical velocity feedback');
 assert.equal(st.wallHits,1);
});
test('vertical high-speed agent and phased agent cannot tunnel',()=>{
 const st=walls([[12,10]]);
 const {a,hit}=move(st,[12.5,2],[12.5,20],{phase:true});
 assert.equal(hit,true);
 assert.ok(a.y<10/N);
 assert.ok(a.vy<0);
});
test('corner contact catches diagonal passage without cutting through',()=>{
 const st=walls([[12,10]]);
 const {a,hit}=move(st,[9.5,7.5],[18.5,16.5]);
 assert.equal(hit,true);
 assert.ok(a.x<12/N&&a.y<10/N);
});
test('wall segments prevent passing from either direction',()=>{
 const st=walls([[12,10],[12,11],[12,12]]);
 const {a}=move(st,[17,11.5],[5,11.5]);
 assert.ok(a.x>13/N);
 assert.equal(st.wallCount,3);
 assert.equal(st.wallRects.length,3);
});
test('open space remains traversable, and wall-less spells retain prior behavior',()=>{
 const st=walls([[12,10]]);
 assert.equal(move(st,[14.5,10.5],[19.5,10.5]).hit,false);
 const empty=walls([]);
 assert.equal(move(empty,[3,10.5],[25,10.5]).hit,false);
});
test('an agent born inside wall can leave but cannot re-enter',()=>{
 const st=walls([[12,10]]);
 const outgoing=move(st,[12.5,10.5],[15,10.5]);
 assert.equal(outgoing.hit,false);
 const incoming=move(st,[15,10.5],[12.5,10.5]);
 assert.equal(incoming.hit,true);
 assert.ok(incoming.a.x>=13/N);
});
test('walls are private to each spell and do not change mass or population',()=>{
 const a=walls([[12,10]]),b=walls([]);
 assert.equal(a.wallCount,1);
 assert.equal(b.wallCount,0);
 assert.equal(R.mass({mass:1}),1);
 assert.equal(R.resolveWall(b,{prevX:0,prevY:.1,x:.9,y:.1,vx:10,vy:0}),false);
 const s={time:{now:100},player:{x:0,y:0},aim:{x:1,y:0},
  craftedAudioEnabled:false,combat:{enemies:[],pillars:[],debris:[]},actors:[]};
 const r=Crafted.starter();
 r.runes[10*N+12]=WALL;r.settings.population=1;r.settings.delivery='world';
 assert.equal(Crafted.start(s,r,false),true);
 assert.equal(s.craftedShots[0].wallCount,1);
 assert.equal(s.craftedShots[0].agents.length,1);
});
test('rune activation uses corrected blocked path, not tunneled endpoint',()=>{
 const st=walls([[12,10]]);
 st.recipe.runes[14+10*N]=4;
 R.configure(st);
 const before={prevX:10.5/N,prevY:10.5/N,x:16.5/N,y:10.5/N,
  vx:4,vy:0,seed:1,element:0,tail:[],phaseUntil:0};
 st.agents=[before];
 R.advance(st,null,200,1/60);
 assert.ok(before.x<12/N);
 assert.ok(!(before.seekUntil>200),'unreachable Seeker should not activate');
});
