/* WANDRUNE 091 | Water Lab | headless renderer and water-source regressions.
 * Run: node magic-lab/pixi-water-vfx.tests.js
 */
"use strict";
const assert=require("node:assert/strict");
const Water=require("./pixi-water-vfx.js");
const Bridge=require("./pixi-swarm-bridge.js");
let checks=0;
function ok(x,m){assert.ok(x,m);checks++}
function eq(x,y,m){assert.equal(x,y,m);checks++}
function near(x,y,err,m){ok(Math.abs(x-y)<err,m)}
const movingRecord=(x,y,t,i=0,seed=1)=>({
 element:2,x,y,time:t,castIndex:0,agentIndex:i,seed,alpha:.82,angle:0,r:3
});
const T=Water.makeMotionTracker();
T.beginFrame();
eq(T.sample(movingRecord(0,0,0)).influence,0,"First frame has zero visual speed");
let fast;
for(let i=1;i<=16;i++){T.beginFrame();fast=T.sample(movingRecord(i*5,0,i*16))}
ok(fast.valid&&fast.influence>.9,"Fast motion reaches high stretch influence");
const stretched=Water.dropPose(movingRecord(80,0,256),20,fast);
const compact=Water.dropPose(movingRecord(80,0,256),20);
ok(stretched.height>compact.height*1.45,"Fast droplet stretches in travel axis");
ok(stretched.width<compact.width*.86,"Fast droplet narrows rather than growing uniformly");
near(stretched.rotation,-Math.PI/2,.05,"Corrected water point faces travel in world X");
const wakes=Water.collectSmears([{record:movingRecord(80,0,256),motion:fast}]);
eq(wakes.length,1,"Motion generates one short water smear");
ok(wakes[0].tailX<80&&wakes[0].tailY===0,"Smear ends behind rightward motion");
ok(wakes[0].length<=26,"Smear cannot grow into a huge blue streak");
const samples=Array.from({length:600},(_,i)=>({
 record:{...movingRecord(i,0,256,i%200,i+1),castIndex:Math.floor(i/200)},motion:fast
}));
ok(Water.collectSmears(samples).length>0&&Water.collectSmears(samples).length<=72,"600 moving agents use at most 72 smear strokes");
const stationary=Water.makeMotionTracker();
stationary.beginFrame();stationary.sample(movingRecord(0,0,0));
for(let i=1;i<=12;i++){stationary.beginFrame();stationary.sample(movingRecord(i*5,0,i*16))}
let stopped;
for(let i=13;i<=50;i++){stationary.beginFrame();stopped=stationary.sample(movingRecord(60,0,i*16))}
ok(stopped.influence<.025&&!stopped.valid,"Stopping water relaxes and stops smearing");
ok(Water.dropPose(movingRecord(60,0,800),20,stopped).height<stretched.height*.76,
 "Stopped droplet returns to its compact silhouette");
const teleport=Water.makeMotionTracker();
teleport.beginFrame();teleport.sample(movingRecord(0,0,0));
teleport.beginFrame();
ok(!teleport.sample(movingRecord(1000,0,16)).valid,"Teleport does not streak");
teleport.beginFrame();
eq(teleport.sample(movingRecord(20,0,32,0,777)).influence,0,
 "Reused agent index with new seed resets history");
teleport.reset();eq(teleport.size,0,"Motion history can be cleared on toggle");

const record=(element,i,t=400)=>({
 x:90+i*2,y:220+i*.37,r:2.8,alpha:.58,element,
 castIndex:i<100?0:1,agentIndex:i,seed:i*.19,
 angle:i<80?Math.PI/4:0,time:t,progress:.5,palette:"arcane",
 color:0xffffff,trail:[
  {x:80+i*2,y:218+i*.37},
  {x:86+i*2,y:219+i*.37}]
});
const records=Array.from({length:200},(_,i)=>record(i<80?2:i<140?3:1,i));
const before=JSON.stringify(records);
const streams=Water.collectStreams(records);
ok(streams.length>0&&streams.length<=64,"Only water may form bounded streams");
ok(streams.every(s=>s.agentIndex<80),"Frost and fire cannot leak into streams");
eq(Water.collectStreams(records,{maxStreams:0}).length,0,"A zero stream budget draws none");
const far={...record(2,1),x:9999};
ok(Water.validTrail(far)===null,"Teleport/absurd path is ignored");
ok(Water.validTrail({...record(2,1),alpha:0})===null,"Zero-alpha records create no ribbons");
ok(Water.validTrail({...record(3,1)})===null,"Frost never has liquid ribbons");
const pose=Water.dropPose({...record(2,3),angle:0},20);
near(pose.rotation,-Math.PI/2,.05,"091b corrected droplet orientation is flipped 180 degrees");
ok(pose.height>pose.width,"Silhouette is longer along travel direction");
ok(Water.dropPose({...record(2,3),time:800},20).height!==pose.height,"Droplet surface breathes over time");
eq(JSON.stringify(records),before,"Geometry calculation never mutates inputs");
let canvases=0,specular=0;
const gradients={addColorStop(){}};
const ctx=new Proxy({}, {get(_t,k){
 if(k==="createLinearGradient"||k==="createRadialGradient")return()=>gradients;
 if(k==="drawImage")return()=>{specular++};
 return()=>{};
}});
const particleList=[],spriteList=[],graphicsList=[];
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...p){this.children.push(...p)}addChildAt(x,i){this.children.splice(i,0,x)}
 destroy(){}
}
class Graphics{
 constructor(){this.commands=[];graphicsList.push(this)}
 clear(){this.commands=[];return this}
 moveTo(x,y){this.commands.push(["move",x,y]);return this}
 lineTo(x,y){this.commands.push(["line",x,y]);return this}
 stroke(o){this.commands.push(["stroke",o]);return this}
 fill(o){this.commands.push(["fill",o]);return this}
 circle(){return this}cut(){return this}closePath(){return this}
 bezierCurveTo(){return this}quadraticCurveTo(){return this}
}
class Sprite{
 constructor(tex){this.texture=tex;this.anchor={set(){}};this.position={set:(x,y)=>{this.x=x;this.y=y}};spriteList.push(this)}
}
class Particle{constructor(o){Object.assign(this,o);particleList.push(this)}}
class ParticleContainer extends Container{
 constructor(o){super();this.source=o.texture}
 addParticle(p){assert.equal(p.texture.id,this.source.id);this.children.push(p)}
}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}}}}
 async init(){}stop(){}render(){}destroy(){}
}
const P={Container,Graphics,Sprite,Particle,ParticleContainer,Application,
 Texture:{from(c){return{id:c.id||"source",width:c.width,height:c.height}}}};
const win={PIXI:P,WRKMAN_WATER_VFX:Water,devicePixelRatio:2,document:{
 createElement(){const id="water-canvas-"+(++canvases);return{
 id,width:0,height:0,getContext(){return ctx}}}
}};
const stage={appendChild(){},
 querySelector(){return{getBoundingClientRect(){return{left:0,top:0,width:960,height:600}}}},
 getBoundingClientRect(){return{left:0,top:0,width:960,height:600}}};
const canonical=new Map();
const scene={cameras:{main:{getWorldPoint(x,y){return{x,y}}}},
 textures:{get(key){if(!canonical.has(key))canonical.set(key,{id:key,width:48,height:48});
  return{getSourceImage(){return canonical.get(key)}}}}};
(async()=>{
 const bridge=Bridge.createBridge(scene,{window:win,stage,art:"forge",look:"bright",
  fireBody:false,fireHot:false,fireShell:false,fireFlames:false,
  waterDrops:true,waterStreams:true,waterMotion:true});
 ok(await bridge.enable(),"Bridge initializes with water appearance");
 ok(bridge.waterDrops&&bridge.waterStreams&&bridge.waterMotion,"Water effects are independent and enabled");
 const afterInitCanvases=canvases;
 ok(afterInitCanvases>=18,"Three textures made once, alongside fallback textures");
 ok(specular>=3,"Canonical water material embedded once per cached droplet texture");
 function frame(time=400,alpha,offset=0){
  bridge.begin();
  for(const r of records)bridge.paint({...r,time,x:r.x+offset,
    alpha:alpha===undefined?r.alpha:alpha});
  bridge.end();
 }
 frame();
 eq(bridge.drawn,200,"One visual for each water/frost/fire agent");
 eq(bridge.bulk+bridge.details,200,"No duplicated visual particles");
 eq(bridge.waterDropsDrawn,80,"Only 80 genuine water agents receive droplet art");
 ok(bridge.waterStreamsDrawn>0&&bridge.waterStreamsDrawn<=64,"Water ribbons capped at 64");
 const watery=particleList.filter(x=>x.texture.id.startsWith("water-canvas-")&&x.alpha>0);
 ok(watery.length>=60&&watery.length<80,"Most droplets preserve efficient ParticleContainer batching");
 const frost=particleList.find(x=>x.texture.id==="wandrune-mat069-frost");
 ok(frost&&frost.alpha>0,"Original frost source texture remains intact");
 const oldCount=particleList.length+spriteList.length;
 const firstHeight=watery[0].scaleY;
 for(let i=1;i<=16;i++)frame(400+i*16,undefined,i*5);
 ok(bridge.waterSmearsDrawn>0&&bridge.waterSmearsDrawn<=72,
  "Pixi paints speed-gated water smears within the mobile budget");
 ok(watery[0].scaleY>firstHeight*1.35,
  "Fast water visibly stretches the existing ParticleContainer visual");
 ok(bridge.waterStreamsDrawn>0,"Long water streams coexist with short smears");
 eq(bridge.setWaterMotion(false),false,"Water motion can be disabled independently");
 frame(672);
 eq(bridge.waterSmearsDrawn,0,"No wakes when motion is OFF");
 ok(watery[0].scaleY<firstHeight*1.3,"Motion OFF returns compact droplet shape");
 ok(bridge.waterStreamsDrawn>0,"Streams survive water motion toggle OFF");
 eq(bridge.setWaterMotion(true),true,"Water motion reenabled live");
 frame(688);
 eq(bridge.waterSmearsDrawn,0,"Restart does not invent false motion");
 frame(600);
 eq(particleList.length+spriteList.length,oldCount,"No new visuals allocated during normal animation");
 eq(canvases,afterInitCanvases,"No per-frame procedural canvas creation");
 const previousAlpha=watery[0].alpha;
 ok(previousAlpha>0&&previousAlpha<1,"Droplet follows original non-opaque fade");
 const drawnStrokes=graphicsList.flatMap(g=>g.commands).filter(c=>c[0]==="stroke").length;
 ok(drawnStrokes>0,"Stream material emitted through one Graphics layer");
 eq(bridge.setWaterDrops(false),false,"Drops A/B can be turned off");
 frame(800);
 eq(bridge.waterDropsDrawn,0,"No droplet skins while disabled");
 ok(particleList.some(p=>p.texture.id==="wandrune-mat069-water"&&p.alpha>0),
  "Original canonical water art returns when drops are OFF");
 eq(bridge.setWaterStreams(false),false,"Streams A/B can be turned off");
 frame(900);
 eq(bridge.waterStreamsDrawn,0,"Stream geometry stops immediately on OFF");
 eq(bridge.setWaterDrops(true),true,"Water drops can be re-enabled");
 eq(bridge.setWaterStreams(true),true,"Water streams can be re-enabled");
 frame(1000);
 eq(bridge.waterDropsDrawn,80,"Droplets restore immediately");
 ok(bridge.waterStreamsDrawn>0,"Streams restore without recasting");
 frame(1100,0);
 ok(particleList.every(p=>p.alpha===0),"Zero alpha disappears fully");
 eq(bridge.waterDropsDrawn,80,"Zero-alpha records remain submitted, not destroyed");
 eq(JSON.stringify(records),before,"Water renderer never mutates simulated agents");
 bridge.destroy();ok(!bridge.active&&!bridge.ready,"Normal cleanup preserves safe fallback");
 console.log("Pixi 091 Water Lab: "+checks+" assertions passed");
})().catch(e=>{console.error(e);process.exitCode=1});
