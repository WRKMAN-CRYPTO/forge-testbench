/* WANDRUNE 085 / Fire Cohesion Pass A.
 * Run: node magic-lab/pixi-fire-clusters.tests.js
 * Pure geometry and mocked Pixi. No Phaser, Matter or GPU required.
 */
"use strict";
const assert=require("node:assert/strict");
const Clusters=require("./pixi-fire-clusters.js");
const Bridge=require("./pixi-swarm-bridge.js");
let assertions=0;
function check(x,msg){assert.ok(x,msg);assertions++;}
function equal(a,b,msg){assert.equal(a,b,msg);assertions++;}
function p(x,y,castIndex=0,element=1,alpha=.8,r=3){
 return {x,y,castIndex,element,alpha,r,color:0xffaa44,angle:.1,agentIndex:0};
}
const lone=Clusters.findClusters([p(0,0)]);
equal(lone.singles,1,"a single agent remains single");
equal(lone.activeClusters,0,"no synthetic plasma body for a lone ember");
const pair=Clusters.findClusters([p(0,0),p(13,2)]);
equal(pair.activeClusters,1,"nearby pair connects");
equal(pair.groups[0].count,2,"pair has exactly two agents");
equal(pair.links,1,"pair has one essential connection");
const split=Clusters.findClusters([p(0,0),p(13,2),p(100,90),p(112,90)]);
equal(split.activeClusters,2,"separated pairs remain distinct");
equal(split.links,2,"two pairs produce two links");
const mixed=Clusters.findClusters([p(0,0,0),p(8,0,0),p(0,0,1),p(8,0,1),
 p(3,0,0,2),p(1,1,0,3),p(2,1,0,4)]);
equal(mixed.activeClusters,2,"overlapping cast origins never merge");
equal(mixed.candidates,4,"water/ice/lightning do not enter fire clustering");
const ghosts=Clusters.findClusters([p(0,0),p(8,0,0,1,.03),p(8,0,0,1,0)]);
equal(ghosts.activeClusters,0,"faded and hidden sources never cause cohesion");
equal(ghosts.singles,1,"faded sources do not inflate cluster");
const culled=Clusters.findClusters([p(10,10),p(20,10),p(2000,2000),p(2010,2000)],
 {bounds:{minX:0,maxX:100,minY:0,maxY:100},margin:10});
equal(culled.candidates,2,"viewport removes outside fire from diagnostics");
equal(culled.activeClusters,1,"onscreen fire retains its outline");
function cone(n=200,castIndex=0){
 return Array.from({length:n},(_,i)=>{
  const t=i/(n-1),noise=(i*73%101)/100-.5;
  return p(90+t*480,150+t*18+noise*(4+12*t),castIndex);
 });
}
const fire=cone(200),before=JSON.stringify(fire),one=Clusters.findClusters(fire);
equal(one.candidates,200,"all 200 agents reach detector");
equal(one.activeClusters,1,"directed conal fire detects as one cluster");
equal(one.largest,200,"cone retains full connected group");
equal(one.groups[0].edges.length,199,"200 connected agents form a spanning forest");
check(one.groups[0].hull.length>=3,"debug outline encloses the cone");
equal(JSON.stringify(fire),before,"spatial pass never edits agent records");
const reverse=Clusters.findClusters(fire.slice().reverse());
equal(reverse.largest,one.largest,"connection membership is independent of array order");
equal(reverse.activeClusters,one.activeClusters,"array order cannot split a cluster");
const twins=Clusters.findClusters(fire.concat(cone(200,1)));
equal(twins.activeClusters,2,"overlapping cones cast separately remain distinct");
equal(twins.links,398,"two 200-agent casts keep their own 199 links");
const ring=Array.from({length:200},(_,i)=>p(200+85*Math.cos(2*Math.PI*i/200),
 200+85*Math.sin(2*Math.PI*i/200)));
check(Clusters.findClusters(ring).activeClusters>0,"debug pass detects any close ring, not hardcoded cones");
const many=Array.from({length:12},(_,i)=>cone(200,i)).flat();
const stress=Clusters.findClusters(many);
equal(stress.candidates,2400,"more than 200 total agents is allowed");
equal(stress.activeClusters,12,"no global cluster or cast cap");
check(stress.checks<50000,"spatial hash avoids all-to-all comparisons across casts");
// Renderer debug is opt-in, with original per-agent visuals unchanged.
const ctx=new Proxy({}, {get(_t,k){return k==="createRadialGradient"?()=>({addColorStop(){}}):()=>{};}});
let strokes=0,fills=0,renders=0;
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...x){this.children.push(...x);}
 addChildAt(x,i){this.children.splice(i,0,x);}
 destroy(){}
}
class Graphics{
 clear(){return this;}moveTo(){return this;}lineTo(){return this;}
 closePath(){return this;}circle(){return this;}
 fill(){fills++;return this;}stroke(){strokes++;return this;}
}
class Sprite{constructor(t){this.texture=t;this.anchor={set(){}};this.position={set(){}};}}
class Particle{constructor(o){Object.assign(this,o);}}
class ParticleContainer extends Container{addParticle(particle){this.children.push(particle);}}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}},
  getBoundingClientRect(){return{left:0,top:0,width:960,height:600};}};}
 async init(){}stop(){}render(){renders++;}destroy(){}
}
const P={Container,Graphics,Sprite,Particle,ParticleContainer,Application,Texture:{from:()=>({})}};
const rect=()=>({left:0,top:0,width:960,height:600});
const stage={getBoundingClientRect:rect,querySelector(){return{getBoundingClientRect:rect};},
 appendChild(c){this.canvas=c;}};
const win={PIXI:P,WRKMAN_FIRE_CLUSTERS:Clusters,devicePixelRatio:2,document:{
 getElementById:()=>stage,createElement:()=>({getContext:()=>ctx})}};
const scene={cameras:{main:{getWorldPoint(x,y){return{x,y};}}}};
(async()=>{
 const bridge=Bridge.createBridge(scene,{window:win,stage,width:960,height:600,
  look:"bright",art:"soft",fireDebug:false});
 check(await bridge.enable(),"Pixi bridge initialized");
 function frame(){bridge.begin();for(let i=0;i<fire.length;i++)bridge.paint(fire[i]);bridge.end();}
 frame();
 equal(bridge.fireGroups,0,"debug OFF leaves clustering out of render path");
 const originalCount=bridge.drawn;
 const baselineStrokes=strokes;
 check(bridge.setFireDebug(true),"debug can be enabled instantly");
 frame();
 equal(bridge.fireGroups,1,"debug sees one live cone");
 equal(bridge.fireLargest,200,"debug reports largest connected cluster");
 equal(bridge.fireEdges,199,"debug reports exactly 199 supporting links");
 equal(bridge.fireCandidates,200,"all active fire agents are available");
 equal(bridge.drawn,originalCount,"debug cannot change rendered agent count");
 check(strokes>baselineStrokes&&fills>0,"debug draws hull and links");
 check(bridge.setFireDebug(false)===false,"debug turns off immediately");
 frame();
 equal(bridge.fireGroups,0,"diagnostics clear on disable");
 equal(bridge.drawn,200,"disable does not alter simulation record count");
 bridge.disable();
 equal(bridge.active,false,"original Phaser fallback remains available");
 check(await bridge.enable(),"Pixi may be re-enabled");
 bridge.destroy();
 equal(bridge.ready,false,"debug resources clean up");
 console.log("Wandrune 085 fire clusters: "+assertions+" assertions passed; "+renders+" mock renders.");
})().catch(e=>{console.error(e);process.exitCode=1;});
