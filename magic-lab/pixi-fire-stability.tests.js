/* WANDRUNE 085 / COHESION STABILITY REGRESSION
 * node magic-lab/pixi-fire-stability.tests.js
 * Deterministic clocks; no browser, network or physics.
 */
"use strict";
const assert=require("node:assert/strict");
const Stability=require("./pixi-fire-stability.js");
const Clusters=require("./pixi-fire-clusters.js");
const Perimeter=require("./pixi-fire-perimeter.js");
let assertions=0;
const ok=(v,m)=>{assert.ok(v,m);assertions++;};
const eq=(a,b,m)=>{assert.equal(a,b,m);assertions++;};
function mass(label,count,castIndex=0){
 const x=label*95;
 return {castIndex,count,x,y:155,minX:x-12,maxX:x+12,minY:140,maxY:170,
  members:Array.from({length:count},(_,i)=>({agentIndex:label*1000+i,x:x+(i%5),y:150+(i%3),r:3,alpha:.85}))};
}
function rankRivals(t){
 return [mass(1,70),mass(2,60),mass(3,50),mass(4,(Math.round(t/20)%2)?53:48)];
}
const track=Stability.makeTracker();
let initial=null;
for(let t=0;t<=900;t+=20){
 const state=track.step(rankRivals(t),t);
 if(!initial)initial=state.slots.map(x=>x.id);
 eq(state.slots.length,3,"three enhanced slots maximum");
 eq(state.swaps,0,"small cluster size oscillations never trigger visual replacement");
 eq(state.slots.map(x=>x.id).join(","),initial.join(","),
  "same three blob IDs remain visually selected");
}
ok(initial.length===3,"initial slots filled");
const preempt=Stability.makeTracker();
let first=preempt.step([mass(1,70),mass(2,60),mass(3,50),mass(4,20)],0);
const selectedBefore=first.slots.map(x=>x.id);
// Give previously enhanced masses their rendered contour cache for fading.
preempt.apply({shells:first.slots.map(x=>({trackId:x.id,castIndex:x.castIndex,count:x.count,paths:[],bands:[],hotBands:[]}))},first);
const next=preempt.step([mass(1,70),mass(2,60),mass(3,50),mass(4,84)],20);
eq(next.selected,3,"three active expensive field slots maintained");
ok(next.slots.filter(x=>x.group).some(x=>!selectedBefore.includes(x.id)),
 "new genuinely large mass receives a field slot immediately");
ok(next.slots.some(x=>x.ghost),"previous mass fades through cached cheap ghost");
ok(next.slots.filter(x=>x.group).length<=3,
 "ghosts never consume or inflate the THREE sampled fields");
eq(preempt.diagnostics().swaps,1,"one stronger contender replaces the old incumbent");
for(let t=40;t<=360;t+=20){
 const p=preempt.step([mass(1,70),mass(2,60),mass(3,50),mass(4,84)],t);
 eq(p.selected,3,"replacement does not starve current large groups");
}
const sourceForTest=id=>({trackId:id,castIndex:0,count:80,paths:[],bands:[],hotBands:[]});
const vanished=Stability.makeTracker();
let before=null;
for(let t=0;t<=200;t+=20)before=vanished.step([mass(1,80)],t);
const priorAlpha=before.slots[0].opacity;
let falling=[];
const previouslySelected=before.slots[0];
vanished.apply({shells:[sourceForTest(previouslySelected.id)]},before);
for(let t=220;t<=480;t+=20){
 const state=vanished.step([],t);
 ok(state.slots.length<=1,"vanished blob uses only its old slot while fading");
 if(state.slots.length)falling.push(state.slots[0].opacity);
}
ok(priorAlpha>.9,"mass becomes fully visible before disappearing");
ok(falling.length>=4,"old mass survives multiple fade frames");
ok(falling[0]<priorAlpha&&falling[1]<falling[0],"disappearance fades, not snaps");
eq(vanished.step([],500).slots.length,0,"vanished mass eventually releases its slot");
const casts=Stability.makeTracker();
const clA=mass(1,30,1),clB={...mass(1,30,2),x:clA.x,y:clA.y};
const stateA=casts.step([clA,clB],0);
eq(stateA.slots.length,2,"two casts can overlap visually without merging");
const idPairs=stateA.slots.map(s=>({cast:s.castIndex,id:s.id}));
const stateB=casts.step([clB,clA],20);
for(const p of idPairs)ok(stateB.slots.some(s=>s.castIndex===p.cast&&s.id===p.id),
 "cross-cast tracking preserves each independent visual identity");
const heat=Stability.makeTracker({heatHoldMs:110,heatFadeMs:180});
function source(trackId,hasHot){
 const contour={points:[{x:1,y:1},{x:10,y:1},{x:8,y:8},{x:1,y:1}],
  closed:true,depth:0,parent:-1,area:25};
 return {trackId,count:100,castIndex:0,paths:[contour],bands:[],
  hotBands:hasHot?[{kind:"hot",paths:[contour]},{kind:"peak",paths:[]}]:[]};
}
let hotId,holdAlpha=0,quietAlpha=0;
for(let t=0;t<=200;t+=20){
 const s=heat.step([mass(1,100)],t);
 hotId=s.slots[0].id;
 const res=heat.apply({shells:[source(hotId,true)]},s);
 ok(res.shells.length===1,"stable visible shell exists");
}
let sticky=heat.step([mass(1,100)],220);
let held=heat.apply({shells:[source(hotId,false)]},sticky);
ok(held.heldHot>=1,"hot contour memory survives one below-threshold frame");
holdAlpha=held.shells[0].hotBands[0].opacity;
for(let t=240;t<=480;t+=20){
 const s=heat.step([mass(1,100)],t);
 held=heat.apply({shells:[source(hotId,false)]},s);
 if(t===440)quietAlpha=held.shells[0].hotBands[0]?.opacity||0;
}
ok(holdAlpha>.5,"a brief dip preserves substantial hot opacity");
ok(quietAlpha<holdAlpha,"sustained absence fades the hot contour");
ok(held.shells[0].hotBands.length===0,"old hot contour eventually disappears");
const dynamic=Stability.makeTracker();
const intact=mass(5,150);
const original=JSON.stringify(intact);
const ss=dynamic.step([intact],0);
const dummy=source(ss.slots[0].id,true);
dynamic.apply({shells:[dummy]},ss);
eq(JSON.stringify(intact),original,"persistent visual memory never edits agent records");
const old=Perimeter.buildPerimeters(Clusters.findClusters([
 {x:100,y:100,r:3,alpha:.9,element:1,agentIndex:0,castIndex:0},
 {x:112,y:100,r:3,alpha:.9,element:1,agentIndex:1,castIndex:0}
]).groups,{body:true,hot:true});
eq(old.groups,1,"original fire detector and field solver remain operational");
// Regression for the bug where grid ceil(+1) exceeded maxSamples
// and discarded the third of three actual 200-agent fire masses.
const threeClouds=[];
for(let castIndex=0;castIndex<3;castIndex++){
 const cx=145+castIndex*220,cy=200+(castIndex%2)*150;
 for(let i=0;i<200;i++){
  const theta=i*2.39996,dist=Math.sqrt(i/200)*43;
  threeClouds.push({castIndex,agentIndex:i,x:cx+dist*Math.cos(theta),
   y:cy+dist*Math.sin(theta),r:3,alpha:.85,element:1});
 }
}
const clouds=Clusters.findClusters(threeClouds);
eq(clouds.groups.length,3,"three true 200-agent masses detected");
const baked=Perimeter.buildPerimeters(clouds.groups,
 {maxGroups:3,sampleBudget:3500,body:true,hot:true,threshold:.78});
eq(baked.groups,3,"no blob starved by grid ceil overshoot");
eq(baked.skipped,0,"third blob is not silently skipped");
ok(baked.samples<=3500,"all three fit inside exact shared grid limit");
const nonblocking=Stability.makeTracker();
const selection=nonblocking.step(clouds.groups,0);
const bakedStable=Perimeter.buildPerimeters(selection.slots.filter(x=>x.group).map(x=>x.group),
 {maxGroups:3,sampleBudget:3500,body:true,hot:true,threshold:.78});
eq(bakedStable.groups,3,"stable tracker still enhances all three 200-agent blobs");
ok(selection.slots.filter(x=>x.group).every(x=>x.opacity>=.8),
 "no new fire mass begins almost invisible");

console.log("Fire 085 stability: "+assertions+" assertions passed.");
