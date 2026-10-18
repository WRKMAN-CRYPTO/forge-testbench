/* Run: node magic-lab/pixi-fire-motion.tests.js. Render-only Pass 088c. */
"use strict";
const assert=require("node:assert/strict");
const M=require("./pixi-fire-motion.js");
let n=0;
function ok(x,label){assert.ok(x,label);n++}
function eq(x,y,label){assert.equal(x,y,label);n++}
const a=(x,y,t=0,i=0,c=0,seed=i+1)=>({x,y,time:t,agentIndex:i,castIndex:c,seed,element:1,alpha:.75});
const diff=(x,y)=>Math.atan2(Math.sin(x-y),Math.cos(x-y));
function track(dx,dy,neighbors=0){
 const T=M.makeTracker();
 T.beginFrame();T.sample(a(0,0,0),neighbors,0);
 let p;
 for(let i=1;i<=18;i++){T.beginFrame();p=T.sample(a(dx*i,dy*i,i*16),neighbors,0)}
 return p;
}
const right=track(5,0),left=track(-5,0),up=track(0,-5),down=track(0,5);
ok(Math.abs(diff(M.travelRotation(1,0),-Math.PI/2))<1e-10,"088c direction basis rotated 180 degrees");
ok(Math.abs(diff(right.rotation,-Math.PI/2))<.10,"Right tip points right; tail left");
ok(Math.abs(diff(left.rotation,Math.PI/2))<.10,"Left tip points left; tail right");
ok(Math.abs(diff(up.rotation,Math.PI))<.10,"Up tip points up; tail down");
ok(Math.abs(diff(down.rotation,0))<.10,"Down tip points down; tail up");
ok(right.stretch>1.3&&right.width<.93,"Fast agents stretch and narrow");
ok(right.aligned&&left.aligned,"Strong moving flames aligned");
const dense=track(5,0,8),slow=track(.015,0);
ok(dense.influence<right.influence*.26,"Dense body dampens arrow effect");
ok(dense.stretch<right.stretch,"Dense body stays billowy");
ok(slow.influence<.02&&!slow.aligned,"Subpixel drift does not jitter");
const stop=M.makeTracker();
stop.beginFrame();stop.sample(a(0,0),0,0);
for(let i=1;i<=10;i++){stop.beginFrame();stop.sample(a(i*5,0,i*16),0,0)}
let final;
for(let i=11;i<=45;i++){stop.beginFrame();final=stop.sample(a(50,0,i*16),0,0)}
ok(final.influence<.01,"Stopped agent loses heading influence");
ok(Math.abs(diff(final.rotation,0))<.10,"Stationary flame returns to idle");
stop.reset();eq(stop.size,0,"Toggle reset discards visual cache");
stop.beginFrame();eq(stop.sample(a(50,0,900),0,0).influence,0,"Reset has no fake motion");
const teleport=M.makeTracker();
teleport.beginFrame();teleport.sample(a(0,0),0,0);
teleport.beginFrame();eq(teleport.sample(a(2000,0,16),0,0).influence,0,"Teleport ignored");
teleport.beginFrame();eq(teleport.sample(a(10,0,32,0,0,123),0,0).influence,0,"Cast seed change resets");
ok(Math.abs(Math.abs(M.interpolateAngle(Math.PI-.1,-Math.PI+.1,.5))-Math.PI)<.03,"Shortest arc across angle wrap");
const same=[a(0,0),a(8,0,0,1),a(0,0,0,2,1)];
const near=M.countNearbyFire(same);
eq(near.get(same[0]),1,"Same cast neighbors contribute");
eq(near.get(same[2]),0,"Different casts excluded");
const three=[];
for(let c=0;c<3;c++)for(let i=0;i<200;i++)three.push(a(c*250+(i%20)*2,c*250+Math.floor(i/20)*2,0,i,c));
const before=JSON.stringify(three);
const neighborhood=M.countNearbyFire(three);
ok(three.length===600,"600 test agents generated from three independent casts");
ok(neighborhood.get(three[0])>5,"Dense 200-agent cast recognized");
ok(neighborhood.get(three[200])>5&&neighborhood.get(three[400])>5,"Each cast recognized independently");
const T=M.makeTracker();T.beginFrame();
for(const r of three)T.sample(r,neighborhood.get(r),0);
eq(T.size,600,"Tracks all 600 visual agents without a global cap");
for(let frame=1;frame<=12;frame++){
 T.beginFrame();
 for(const r of three)T.sample({...r,x:r.x+frame*5,time:frame*16},neighborhood.get(r),0);
}
eq(T.size,600,"Movement updates do not duplicate tracked agents");
eq(JSON.stringify(three),before,"No source agent record mutated");
for(let k=0;k<72;k++)T.beginFrame();
eq(T.size,0,"Stale visual cache is pruned");
for(let i=0;i<12;i++)ok(Number.isFinite(track(i*.1,0).rotation),"Every tested heading remains finite");
console.log("Pixi 088 motion tracking: "+n+" assertions passed");
