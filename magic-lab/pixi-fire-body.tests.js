/* Wandrune 085 Fire Cohesion Pass C: material filling without spell mutation.
 * Run: node magic-lab/pixi-fire-body.tests.js
 * No browser, Phaser, GPU or network required.
 */
"use strict";
const assert=require("node:assert/strict");
const C=require("./pixi-fire-clusters.js");
const F=require("./pixi-fire-perimeter.js");
const Bridge=require("./pixi-swarm-bridge.js");
let checks=0;
function ok(x,msg){assert.ok(x,msg);checks++;}
function same(a,b,msg){assert.equal(a,b,msg);checks++;}
const fire=(x,y,i=0,castIndex=0)=>({x,y,r:3,alpha:.85,
 element:1,castIndex,agentIndex:i,color:0xff8b42,angle:0,time:900});
const cone=Array.from({length:200},(_,i)=>{
 const t=i/199,v=(i*71%103)/103-.5;
 return fire(80+480*t,260+20*t+v*(5+24*t),i);
});
const snapshot=JSON.stringify(cone);
const group=C.findClusters(cone).groups;
same(group.length,1,"200-agent cone grouped as one");
const old=F.buildPerimeters(group,{body:false});
const newer=F.buildPerimeters(group,{body:true,threshold:.78});
same(old.shells[0].bands.length,0,"Pass B remains boundary-only");
same(newer.groups,1,"Pass C retains the same one-group geometry");
same(newer.shells[0].bands.length,2,"Pass C has two density tiers");
same(newer.shells[0].bands[0].kind,"body","first layer is translucent base");
same(newer.shells[0].bands[1].kind,"dense","second layer is dense amber");
ok(newer.shells[0].bands[0].paths.length>=1,"base plasma body exists");
ok(newer.shells[0].bands[1].paths.length>=1,"dense interior exists");
ok(newer.shells[0].bands[0].paths[0].area<
 old.shells[0].paths[0].area,"Pass C perimeter hugs fire more closely");
ok(newer.shells[0].bands[1].paths[0].area<
 newer.shells[0].bands[0].paths[0].area,"dense interior is smaller");
ok(newer.samples<=3500,"single cast uses bounded grid");
same(JSON.stringify(cone),snapshot,"plasma fields never mutate agent records");
const pair=C.findClusters([fire(10,20),fire(30,20,1)]).groups;
same(F.buildPerimeters(pair,{body:true,threshold:.78}).groups,1,
 "two neighboring embers make a shared body");
same(F.buildPerimeters(C.findClusters([fire(1,1)]).groups,{body:true}).groups,0,
 "single ember still has no body");
const ice=[{...fire(10,20),element:3},{...fire(20,20,1),element:3}];
same(F.buildPerimeters(C.findClusters(ice).groups,{body:true}).groups,0,
 "Pass C does not apply to other elements");
const ring=Array.from({length:140},(_,i)=>fire(
 300+95*Math.cos(i*Math.PI*2/140),300+95*Math.sin(i*Math.PI*2/140),i));
const ringResults=F.buildPerimeters(C.findClusters(ring).groups,
 {body:true,threshold:.78});
ok(ringResults.shells[0].bands.some(b=>b.paths.some(p=>p.depth%2===1)),
 "fire ring has a nested hole contour to cut from fill");
const twin=F.buildPerimeters(C.findClusters(
 cone.concat(cone.map(p=>({...p,castIndex:1})))).groups,
 {body:true,threshold:.78});
same(twin.groups,2,"separate casts never merged into one fill");
const many=Array.from({length:12},(_,i)=>
 cone.map(p=>({...p,castIndex:i}))).flat();
const busy=F.buildPerimeters(C.findClusters(many).groups,
 {body:true,threshold:.78,maxGroups:3,sampleBudget:3500});
ok(busy.groups<=3,"only the extra surfaces have a cluster budget");
ok(busy.samples<=3500,"additional field sampling remains capped");
ok(busy.skipped>0,"other casts keep ordinary visuals without extra fill");
// Mock Pixi: capture filled polygons and hole cuts, while inspecting switch
// independence and all submitted agents.
const ctx=new Proxy({}, {get(_t,k){
 return k==="createRadialGradient"?()=>({addColorStop(){}}):()=>{};
}});
let fills=[],cuts=0,strokes=[],renders=0,artRecords=[];
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...items){this.children.push(...items);}
 addChildAt(x,i){this.children.splice(i,0,x);}
 destroy(){}
}
class Graphics{
 clear(){return this;}
 moveTo(){return this;}lineTo(){return this;}closePath(){return this;}
 circle(){return this;}
 fill(p){fills.push(p);return this;}
 cut(){cuts++;return this;}
 stroke(p){strokes.push(p);return this;}
}
class Sprite{
 constructor(texture){this.texture=texture;this.anchor={set(){}};this.position={set(){}};}
}
class Particle{constructor(p){Object.assign(this,p);}}
class ParticleContainer extends Container{addParticle(p){this.children.push(p);}}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}},
  getBoundingClientRect(){return{left:0,top:0,width:960,height:600};}};}
 async init(){}stop(){}render(){renders++;}destroy(){}
}
const Pixi={Container,Graphics,Sprite,Particle,ParticleContainer,Application,
 Texture:{from:()=>({})}};
const rect=()=>({left:0,top:0,width:960,height:600});
const stage={getBoundingClientRect:rect,
 querySelector(){return{getBoundingClientRect:rect};},
 appendChild(cv){this.canvas=cv;}};
const win={PIXI:Pixi,WRKMAN_FIRE_CLUSTERS:C,WRKMAN_FIRE_PERIMETER:F,
 devicePixelRatio:2,document:{getElementById(){return stage;},
 createElement(){return{getContext(){return ctx;}};}}};
const scene={player:{x:1,y:2},combat:{hp:100},
 cameras:{main:{getWorldPoint(x,y){return{x,y};}}}};
(async()=>{
 const bridge=Bridge.createBridge(scene,
  {window:win,stage,width:960,height:600,fireBody:true,fireShell:true,fireHot:false,
   look:"bright",art:"soft"});
 ok(await bridge.enable(),"Pixi scene still initializes");
 function frame(records=cone){
  bridge.begin();
  for(const p of records)bridge.paint(p);
  bridge.end();
 }
 frame();
 same(bridge.drawn,200,"all 200 agents still submitted");
 ok(bridge.fireBody,"body starts enabled on new preview");
 same(bridge.fireShellGroups,1,"only one enhanced group");
 ok(bridge.fireBodyFills>=2,"two independent density fills drawn");
 ok(fills.some(f=>f.color===0xff5922),"translucent orange-red base");
 ok(fills.some(f=>f.color===0xffac49),"dense amber pockets");
 ok(fills.every(f=>f.alpha<.25),"no white-hot core and no opaque fill");
 ok(strokes.some(s=>s.width===9),"Pass C perimeter is tighter than Pass B");
 const before=fills.length;
 same(bridge.setFireBody(false),false,"body turns OFF instantly");
 frame();
 same(bridge.fireBodyFills,0,"body has no phantom fill when off");
 same(fills.length,before,"no more body polygons when switched off");
 ok(strokes.some(s=>s.width===15),"Pass B original shell remains selectable");
 ok(bridge.fireShell,"turning body off does not disable perimeter");
 same(bridge.setFireShell(false),false,"shell independently turns OFF");
 same(bridge.setFireBody(true),true,"body alone can be enabled");
 const beforeBodyOnly=fills.length;
 frame();
 ok(fills.length>beforeBodyOnly,"body renders without outer strokes enabled");
 same(bridge.drawn,200,"no visual agents discarded by toggles");
 const cutsBefore=cuts;
 frame(ring);
 ok(cuts>cutsBefore,"hollow fire shape uses Pixi Graphics.cut");
 same(scene.combat.hp,100,"combat state remains unmodified");
 same(scene.player.x,1,"player world position remains unmodified");
 bridge.disable();
 ok(!bridge.active,"original Phaser rollback preserved");
 ok(await bridge.enable(),"Pixi can reenable after fallback");
 bridge.destroy();
 ok(!bridge.ready,"body geometry destroyed cleanly");
 console.log("Fire 085 Pass C: "+checks+" assertions passed; "+
  renders+" mocked frames.");
})().catch(error=>{console.error(error);process.exitCode=1;});