/* WANDRUNE 092 | Double every swarm agent visual and swept-hit radius.
 * Run: node magic-lab/agent-sizing.tests.js
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const Size=require("./agent-sizing.js");
let checks=0;
const ok=(v,label)=>{assert.ok(v,label);checks++};
const eq=(a,b,label)=>{assert.equal(a,b,label);checks++};
const near=(a,b,label)=>ok(Math.abs(a-b)<.001,label);
const Runes={
 mass:a=>Math.max(1,Math.floor(a.mass||1)),
 radius:a=>a.mass>1?Math.min(44,2.7+Math.sqrt(a.mass)*2.05):3,
 composition:a=>{let c=[0,0,0,0,0];c[a.element||0]=Runes.mass(a);return c}
};
const mockGlobal={
 WRKMAN_AGENT_SIZING:Size,
 WRKMAN_SWARM_RUNES:Runes,
 WRKMAN_FIELD_PHYSICS:{VERSION:"037"},
 WRKMAN_ELEMENT_SOURCES:{},
 WRKMAN_SPELL_PRESENCE:{paintAccents(){}}
};
function load(filename,extra={}){
 const source=fs.readFileSync(path.join(__dirname,filename),"utf8");
 const mod={exports:{}};
 new Function("module","globalThis",source)(mod,{...mockGlobal,...extra});
 return mod.exports;
}
const Impacts=load("field-impacts.js");
mockGlobal.WRKMAN_FIELD_IMPACTS=Impacts;
const Craft=load("crafted-magic.js");
eq(Size.FACTOR,2,"Shared scale is exactly 2");
for(const original of [.9,2.8,3,10,44]){
 eq(Size.visualRadius(original),2*original,"Every visual radius doubled");
 eq(Size.hitRadius(original),2*original,"Every agent collision radius doubled");
}
eq(Size.searchPadding(false),6,"Default collision search margin is doubled");
eq(Size.searchPadding(true),96,"Mass-rune collision search margin is doubled");
const collides=(distance,mass=1,kind="enemy",element=2)=>{
 const a={x:.5,y:.5,prevX:.5,prevY:.5,mass,element};
 const obj={id:1,r:18,alive:true,body:{position:{x:distance,y:0}}};
 const combat={enemies:kind==="enemy"?[obj]:[],
  pillars:kind==="stone"?[obj]:[],debris:[]};
 const scene={combat,actors:[]};
 const cast={agents:[a],recipe:{settings:{}},
  center:{x:0,y:0},scale:100,delivery:"aura",runeCount:mass>1?1:0,
  targetPrev:new Map(),impactFX:[],free:0,offscreen:0};
 let got=0;
 const result=Impacts.process(scene,cast,1000,{
  hitEnemy(){got++},damagePillar(){got++}
 },{x:0,y:0});
 return {result,got,remaining:cast.agents.length,cast};
};
eq(Impacts.sweep(0,0,0,0,22.5,0,22.5,0,21),null,
 "Old single-agent radius misses contact at distance 22.5");
eq(Impacts.sweep(0,0,0,0,22.5,0,22.5,0,24),0,
 "New double agent hit radius touches that target");
for(const e of [1,2,3,4]){
 const v=collides(22.5,1,"enemy",e);
 eq(v.result,1,"Element "+e+" has doubled world contact");
 eq(v.got,1,"Element "+e+" damages target exactly once");
 eq(v.remaining,0,"Element "+e+" still consumes after hit");
}
eq(collides(25,1).result,0,"Outside enlarged normal swept circle still misses");
const mass=400;
const oldR=Runes.radius({mass});
const d=18+oldR*1.55;
ok(d>18+oldR,"Mass collision probe is outside previous hit size");
eq(collides(d,mass).result,1,"Mass-rune hit radius doubles in swept impacts");
eq(collides(18+oldR*2+.5,mass).result,0,"Mass hit ends at exact doubled edge");
eq(collides(d,mass,"stone").got,1,"Larger contacts also reach destructible pillars");

// The game draw bridge must submit doubled radii, once, not fourfold.
const painted=[];
const game={craftedShots:[],craftedAura:null,craftedFades:[],
 pixiSpellRenderer:{active:true,paint:p=>painted.push(p)}};
const settings={mode:"ab",palette:"flame",texture:"flat",
 population:5,light:50,renderLimit:1200,lifespan:5.5};
const cast={recipe:{settings,values:[]},center:{x:0,y:0},
 delivery:"aura",scale:290,motionTime:0,
 agents:[],impactFX:[],healFX:[],focus:null};
for(let element=0;element<=4;element++)
 cast.agents.push({element,x:.5+element*.01,y:.5,r:1,progress:.5,
  mass:1,seed:0,vx:1,vy:0,bornAt:0});
cast.agents.push({element:3,x:.5,y:.5,progress:.5,mass,seed:0,vx:1,vy:0,bornAt:0});
game.craftedShots=[cast];
Craft.draw(game,{},0);
eq(painted.length,6,"Five elements and one mass-agent all rendered exactly once");
for(let e=0;e<=4;e++)near(painted[e].r,5.5,"Element "+e+" submitted with exactly 2x 2.75 radius");
near(painted[5].r,2*(2.75+oldR),"Large rune visual radius doubles once");
const fadedScene={craftedFades:[],cameras:{}};
const fadedCast={...cast,agents:[{element:2,x:.5,y:.5,progress:.5,mass:1,seed:0,
 bornAt:0,vx:1,vy:0}],born:0,spawnX:.5,spawnY:.5};
eq(Craft.expireAgents(fadedCast,6000,fadedScene),1,"Expired agent transfers into visual fade");
eq(fadedScene.craftedFades.length,1,"Fade batch created without active collision");
near(fadedScene.craftedFades[0].pieces[0].r,5.5,"Fading agent keeps 2x visual radius");
eq(fadedCast.agents.length,0,"Faded agent consumes zero combat capacity");
console.log("Wandrune 092 double agent footprint: "+checks+" assertions passed");
