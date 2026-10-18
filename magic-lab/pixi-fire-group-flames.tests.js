/* Wandrune 089: contour-attached group flame surfaces + original hot regression.
 * Run: node magic-lab/pixi-fire-hot.tests.js
 * Headless. No browser, network, physics, Phaser or GPU.
 */
"use strict";
const assert=require("node:assert/strict");
const C=require("./pixi-fire-clusters.js");
const F=require("./pixi-fire-perimeter.js");
const Bridge=require("./pixi-swarm-bridge.js");
const GroupFire=require("./pixi-fire-group-flames.js");
let checks=0;
function ok(v,m){assert.ok(v,m);checks++;}
function eq(a,b,m){assert.equal(a,b,m);checks++;}
const record=(x,y,i=0,castIndex=0,alpha=.85)=>({
 x,y,r:3,alpha,color:0xff8c34,element:1,castIndex,
 agentIndex:i,angle:.12,time:1234,seed:i*.419
});
function cone(n=200,cast=0){
 return Array.from({length:n},(_,i)=>{
  const t=i/(n-1),w=((i*71)%103)/103-.5;
  return record(80+480*t,260+20*t+w*(5+24*t),i,cast);
 });
}
const pair=[record(10,20),record(30,20,1)];
const pairs=C.findClusters(pair).groups;
eq(pairs.length,1,"Two close embers form a group");
const paired=F.buildPerimeters(pairs,{hot:true,body:true,threshold:.78});
eq(paired.hotPaths,0,"Two fire agents do NOT generate an artificial hot core");
eq(paired.peakPaths,0,"Two fire agents do NOT generate pale-white intensity");
const lone=F.buildPerimeters(C.findClusters([record(4,6)]).groups,{hot:true});
eq(lone.groups,0,"Solo ember remains unchanged");
const coneData=cone();
const saved=JSON.stringify(coneData),group=C.findClusters(coneData).groups;
const baseline=F.buildPerimeters(group,{hot:false,body:true,threshold:.78});
const heated=F.buildPerimeters(group,{hot:true,body:true,threshold:.78});
const tongues=GroupFire.createTongues(heated.shells,500);
ok(tongues.tongues.length>0&&tongues.tongues.length<=10,"Coherent fire group receives limited curved tongues");
ok(tongues.tongues.every(x=>Number.isFinite(x.tip.x)&&Number.isFinite(x.tip.y)),"Generated flame tips are finite");
const tongueLater=GroupFire.createTongues(heated.shells,760);
ok(tongues.tongues[0].length!==tongueLater.tongues[0].length,"Edge flames breathe continuously over time");
eq(baseline.hotPaths,0,"Pass C still has no hot core when disabled");
eq(baseline.peakPaths,0,"Pass C still has no pale heat");
eq(heated.groups,1,"200-agent fire cone remains one cluster");
ok(heated.hotPaths>=1,"200-agent cone develops real heat");
ok(heated.peakPaths>=1,"Densest parts develop rarer pale-hot material");
eq(heated.samples,baseline.samples,"Same precomputed density grid is reused");
eq(heated.work,baseline.work,"No extra Gaussian splatting work for Pass D");
ok(heated.samples<=3500,"Heat shares the mobile grid cap");
eq(JSON.stringify(coneData),saved,"All 200 input records immutable");
const shell=heated.shells[0];
const amber=shell.hotBands.find(x=>x.kind==="hot");
const peak=shell.hotBands.find(x=>x.kind==="peak");
ok(amber.paths[0].area<shell.bands[0].paths[0].area,
 "Warm interior is smaller than surrounding plasma body");
ok(peak.paths[0].area<amber.paths[0].area,
 "Pale-hot center is smaller than warm interior");
const widelySpread=Array.from({length:16},(_,i)=>record(i*75,100,i));
eq(F.buildPerimeters(C.findClusters(widelySpread).groups,{hot:true}).groups,0,
 "Disconnected ember spray never becomes a continuous hot body");
const ice=[{...record(10,20),element:3},{...record(20,20,1),element:3}];
eq(F.buildPerimeters(C.findClusters(ice).groups,{hot:true}).hotPaths,0,
 "Ice never receives fire hot-core artwork");
const ring=Array.from({length:140},(_,i)=>
 record(300+95*Math.cos(i*2*Math.PI/140),
        300+95*Math.sin(i*2*Math.PI/140),i));
const ringResult=F.buildPerimeters(C.findClusters(ring).groups,
 {hot:true,body:true,threshold:.78});
ok(ringResult.hotPaths>=1,"Ring develops nested amber contours");
ok(ringResult.shells[0].hotBands.some(b=>b.paths.some(p=>p.depth%2===1)),
 "Hollow center remains identified at hot contour levels");
const ringTongues=GroupFire.createTongues(ringResult.shells,1000);
ok(ringTongues.tongues.every(x=>x.pathIndex>=0),"Flame tongues are emitted from solid contours only");
const noIce=GroupFire.createTongues(F.buildPerimeters(C.findClusters(ice).groups,{body:true}).shells,1000);
eq(noIce.tongues.length,0,"Non-fire source cannot generate group flame tongues");
const doubled=F.buildPerimeters(C.findClusters(
 coneData.concat(cone(200,1))).groups,
 {hot:true,body:true,threshold:.78});
eq(doubled.groups,2,"Two fire casts retain independent heat structures");
const three=F.buildPerimeters(C.findClusters(coneData.concat(cone(200,1),cone(200,2))).groups,
 {body:true,hot:true,threshold:.78,maxGroups:3,sampleBudget:3500});
const threeTongues=GroupFire.createTongues(three.shells,1200);
ok(threeTongues.tongues.length<=30&&threeTongues.groups===3,"Three group flames stay within 30-tongue render cap");
const busy=F.buildPerimeters(C.findClusters(
 Array.from({length:12},(_,i)=>cone(200,i)).flat()).groups,
 {hot:true,body:true,threshold:.78,maxGroups:3,sampleBudget:3500});
ok(busy.groups<=3&&busy.samples<=3500,
 "Optional heat processing obeys cluster and sample budgets");
ok(busy.skipped>0,"Off-budget spells remain simulated and drawn");
// Mock Pixi graphics surface: inspect the hot layer separately from body,
// boundary and agents and verify toggle isolation and hole cut behavior.
const ctx=new Proxy({}, {get(_t,k){return k==="createRadialGradient"?()=>({addColorStop(){}}):()=>{}}});
let renders=0,draws=[],cuts=0;
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...x){this.children.push(...x)}
 addChildAt(x,i){this.children.splice(i,0,x)}
 destroy(){}
}
class Graphics{
 clear(){this.drawing=[];return this}
 moveTo(x,y){this.drawing.push([x,y]);return this}
 lineTo(x,y){this.drawing.push([x,y]);return this}
 closePath(){return this}
 bezierCurveTo(){return this}
 quadraticCurveTo(){return this}
 fill(style){draws.push({type:"fill",style});return this}
 stroke(style){draws.push({type:"stroke",style});return this}
 cut(){cuts++;return this}
 circle(){return this}
}
class Sprite{constructor(t){this.texture=t;this.anchor={set(){}};this.position={set(){}};}}
class Particle{constructor(p){Object.assign(this,p)}}
class ParticleContainer extends Container{addParticle(p){this.children.push(p)}}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}},
  getBoundingClientRect(){return {left:0,top:0,width:960,height:600}}};}
 async init(){}stop(){}render(){renders++}destroy(){}
}
const PI={Container,Graphics,Sprite,Particle,ParticleContainer,Application,Texture:{from:()=>({})}};
const rect=()=>({left:0,top:0,width:960,height:600});
const stage={getBoundingClientRect:rect,
 querySelector(){return{getBoundingClientRect:rect}},
 appendChild(cv){this.cv=cv}};
const win={PIXI:PI,WRKMAN_FIRE_CLUSTERS:C,WRKMAN_FIRE_PERIMETER:F,
 WRKMAN_FIRE_GROUP_FLAMES:GroupFire,
 devicePixelRatio:2,document:{getElementById(){return stage},
 createElement(){return{getContext(){return ctx}}}}};
const scene={player:{x:20,y:30},combat:{hp:100},
 cameras:{main:{getWorldPoint(x,y){return {x,y}}}}};
(async()=>{
 const b=Bridge.createBridge(scene,{window:win,stage,fireHot:true,fireBody:true,
  fireShell:true,art:"soft",look:"bright",width:960,height:600});
 ok(await b.enable(),"Renderer initialized with independent hot core");
 function frame(records=coneData){b.begin();for(const p of records)b.paint(p);b.end();}
 frame();
 eq(b.drawn,200,"Hot core leaves all 200 agent visuals present");
 ok(b.fireHotPaths>=1&&b.firePeakPaths>=1,"Both density tiers are active");
 ok(b.fireGroupFlames,"Group fire defaults on when visual module is available");
 ok(b.fireGroupTongues>0&&b.fireGroupTongues<=30,"Live group contour renders bounded connected flame tongues");
 ok(draws.some(x=>x.type==="fill"&&x.style.color===0xff6a1d),"Warm connected flame skin painted");
 ok(draws.some(x=>x.type==="fill"&&x.style.color===0xffd26d),"Hot roots painted within shared boundary");
 const sourceBefore=JSON.stringify(coneData);
 const oldTongues=draws.filter(x=>x.type==="fill"&&x.style?.color===0xff6a1d).length;
 eq(b.setFireGroupFlames(false),false,"GROUP FIRE OFF is immediate");
 frame();
 eq(b.fireGroupTongues,0,"OFF clears group flame draw counter");
 eq(draws.filter(x=>x.type==="fill"&&x.style?.color===0xff6a1d).length,oldTongues,"OFF emits no new group flame shapes");
 ok(b.fireHotFills>0&&b.fireBodyFills>0,"OFF retains old hot and body rendering");
 ok(b.setFireGroupFlames(true),"GROUP FIRE ON restores flames");
 frame();
 ok(b.fireGroupTongues>0,"ON restores contour flames without a recast");
 eq(JSON.stringify(coneData),sourceBefore,"Group enhancement never mutates submitted agents");
 ok(b.fireHotFills>=2,"Amber and pale-hot infill rendered");
 ok(draws.some(x=>x.type==="fill"&&x.style?.color===0xffc65b),"Amber heat color");
 ok(draws.some(x=>x.type==="fill"&&x.style?.color===0xfff2be),"Pale-hot heat color");
 ok(draws.filter(x=>x.type==="fill"&&
  (x.style.color===0xffc65b||x.style.color===0xfff2be))
   .every(x=>x.style.alpha<.4),"Heat stays translucent, never fully opaque");
 let prior=draws.filter(x=>x.type==="fill"&&x.style?.color===0xffc65b).length;
 eq(b.setFireHot(false),false,"Hot core can be disabled instantly");
 frame();
 eq(b.fireHotFills,0,"No invisible lingering hot fill when OFF");
 eq(draws.filter(x=>x.type==="fill"&&x.style?.color===0xffc65b).length,prior,
 "No further hot paint while disabled");
 ok(b.fireBody&&b.fireShell,"Passes B and C remain independently enabled");
 eq(b.setFireBody(false),false,"Turn off body without affecting shell or hot");
 ok(b.setFireHot(true),"Hot core can run while body is disabled");
 frame();
 ok(b.fireHotFills>=1,"Hot-only comparison still draws original density core");
 const oldCuts=cuts;
 frame(ring);
 ok(cuts>oldCuts,"Ring's white-hot fill does not cover its hollow center");
 eq(scene.player.x,20,"Player position unchanged");
 eq(scene.combat.hp,100,"Combat state unchanged");
 const allThree=cone(200,0).concat(cone(200,1),cone(200,2));
 frame(allThree);
 eq(b.drawn,600,"All three 200-agent casts still submit visuals");
 ok(b.fireGroupTongueGroups===3&&b.fireGroupTongues<=30,"Three concurrent groups obey appearance budget");
 b.setFireHot(false);frame();
 eq(b.drawn,200,"Disabling Pass D never removes any of the 200 cone agents");
 b.disable();ok(!b.active,"Immediate Phaser fallback still works");
 ok(await b.enable(),"Can reenable without resetting game state");
 b.destroy();ok(!b.ready,"Resource disposal works");
 console.log("Fire 089 group flames: "+checks+" assertions passed; "+renders+" mocked frames.");
})().catch(e=>{console.error(e);process.exitCode=1;});