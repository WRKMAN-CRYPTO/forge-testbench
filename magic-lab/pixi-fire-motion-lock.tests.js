/* Wandrune 088b: rotation lock. No browser, GPU or gameplay dependency. */
"use strict";
const assert=require("node:assert/strict");
const M=require("./pixi-fire-motion.js");
let n=0;
const yes=(x,msg)=>{assert.ok(x,msg);n++};
const near=(x,y,t,msg)=>yes(Math.abs(Math.atan2(Math.sin(x-y),Math.cos(x-y)))<t,msg);
const a=(x,y,time=0,i=0,trail=null,seed=7)=>({
 x,y,time,agentIndex:i,castIndex:2,seed,alpha:.8,element:1,trail
});
const initial=a(30,20,100,0,[{x:8,y:20},{x:20,y:20}]);
const before=JSON.stringify(initial);
near(M.trailHeading(initial).angle,Math.PI/2,1e-8,"Correct rightward tip orientation");
const track=M.makeTracker();
track.beginFrame();
near(track.sample(initial,0,.14).rotation,Math.PI/2,.01,"Trail anchors first visible frame");
let moved;
for(let f=1;f<=18;f++){
 track.beginFrame();
 moved=track.sample(a(30+f*3,20,100+f*16,0,
  [{x:19+f*3,y:20},{x:25+f*3,y:20}]),0,.14);
}
near(moved.rotation,Math.PI/2,.035,"Movement dominates idle wobble");
yes(moved.aligned&&moved.stretch>1.25,"Fast agents stay oriented and stretched");
yes(JSON.stringify(initial)===before,"Source record and trail immutable");
const dense=M.makeTracker();
dense.beginFrame();dense.sample(a(0,0),8,0);
let dp;
for(let f=1;f<=18;f++){dense.beginFrame();dp=dense.sample(a(f*5,0,f*16),8,.2)}
near(dp.rotation,Math.PI/2,.055,"Crowded fire still points with travel");
yes(dp.stretch<moved.stretch,"Crowding reduces elongation, not direction");
const jitter=M.makeTracker();
jitter.beginFrame();jitter.sample(a(0,0),0,0);
let jp;
for(let f=1;f<=18;f++){
 jitter.beginFrame();
 jp=jitter.sample(a(f*2,(f%2)*1.2,f*16,0,
  [{x:f*2-5,y:(f%2)*1.2},{x:f*2-3,y:(f%2)*1.2}]),0,0);
}
near(jp.rotation,Math.PI/2,.08,"Stable trail overrides lateral jitter");
const turn=M.makeTracker();
turn.beginFrame();turn.sample(a(0,0),0,0);
for(let f=1;f<=12;f++){turn.beginFrame();turn.sample(a(f*5,0,f*16),0,0)}
let rp;
for(let f=1;f<=14;f++){
 turn.beginFrame();
 const x=60-f*5;
 rp=turn.sample(a(x,0,(12+f)*16,0,[{x:x-8,y:0}]),0,0);
}
near(rp.rotation,-Math.PI/2,.11,"Reversal beats obsolete forward trail");
yes(M.trailHeading(a(0,0,0,0,[]))===null,"Absent trail neutral");
yes(M.trailHeading(a(0,0,0,0,[{x:0,y:0}]))===null,"Coincident trail ignored");
yes(M.trailHeading(a(0,0,0,0,[{x:Infinity,y:0}]))===null,"Invalid trail ignored");
yes(M.trailHeading(a(0,0,0,0,[{x:-999,y:0}]))===null,"Remote trail ignored");
const idle=M.makeTracker();
idle.beginFrame();idle.sample(a(0,0),0,0);
for(let f=1;f<=12;f++){idle.beginFrame();idle.sample(a(f*5,0,f*16),0,0)}
let still;
for(let f=13;f<=50;f++){idle.beginFrame();still=idle.sample(a(60,0,f*16),0,0)}
near(still.rotation,0,.08,"Still flame relaxes to idle");
yes(!still.aligned,"Stopped flame not reported as moving");
idle.reset();yes(idle.size===0,"Reset clears all histories");
console.log("Pixi 088b rotation lock: "+n+" assertions passed");
