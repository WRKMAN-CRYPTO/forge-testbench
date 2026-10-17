/* WANDRUNE 085 / Fire Cohesion Pass B: shared perimeter regression.
 * node magic-lab/pixi-fire-perimeter.tests.js
 */
"use strict";
const assert=require("node:assert/strict");
const C=require("./pixi-fire-clusters.js"),F=require("./pixi-fire-perimeter.js");
const Bridge=require("./pixi-swarm-bridge.js");
let assertions=0;
function ok(v,message){assert.ok(v,message);assertions++;}
function equal(a,b,message){assert.equal(a,b,message);assertions++;}
const fire=(x,y,castIndex=0,agentIndex=0)=>({
 x,y,r:3,alpha:.82,color:0xff8c35,element:1,angle:.1,
 castIndex,agentIndex,time:1000,seed:agentIndex+.1
});
function detect(records,opts){return C.findClusters(records,opts).groups;}
const single=[fire(10,10)];
equal(F.buildPerimeters(detect(single)).groups,0,"a single ember has no shared perimeter");
const pair=[fire(10,20),fire(32,20,0,1)];
const pairGroup=detect(pair);
equal(pairGroup.length,1,"Pass A recognized two neighboring agents");
equal(pairGroup[0].members.length,2,"Pass A preserves read-only member references");
const original=JSON.stringify(pair);
const merged=F.buildPerimeters(pairGroup);
equal(merged.groups,1,"two fire agents share one visible perimeter");
equal(merged.paths,1,"a nearby pair becomes one rounded contour");
ok(merged.shells[0].paths[0].closed,"small perimeter closes");
ok(merged.shells[0].paths[0].points.length>=8,"small perimeter is smooth");
ok(merged.shells[0].paths[0].points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),
 "all world coordinates are finite");
equal(JSON.stringify(pair),original,"field-building never changes agent coordinates");
function cone(n=200,castIndex=0){
 return Array.from({length:n},(_,i)=>{
  const t=i/(n-1),j=((i*71)%103)/103-.5;
  return fire(90+t*535,270+t*22+j*(4+20*t),castIndex,i);
 });
}
const stream=cone(),snapshot=JSON.stringify(stream);
const detected=detect(stream),shell=F.buildPerimeters(detected);
equal(detected.length,1,"200 fire agents form one cluster");
equal(shell.groups,1,"200-agent cone gets an outer perimeter");
ok(shell.paths>=1,"at least one actual marching-squares contour exists");
ok(shell.vertices>40,"contour preserves distinct structure rather than convex four corners");
ok(shell.samples<=3500,"one stream respects per-cluster sample limit");
ok(shell.work<100000,"gaussian splatting is local, not quadratic field evaluation");
equal(JSON.stringify(stream),snapshot,"200 source records remain unchanged");
const ext=shell.shells[0].paths.flatMap(p=>p.points);
ok(ext.some(p=>p.x<stream[0].x),"plasma edge extends beyond near tip");
ok(ext.some(p=>p.x>stream[199].x),"plasma edge extends beyond far tip");
const separated=detect(stream.concat(cone(200,1)));
equal(separated.length,2,"two overlapping source casts remain distinct");
equal(F.buildPerimeters(separated).groups,2,"one perimeter per separate cast");
const dispersed=Array.from({length:12},(_,i)=>fire(i*75,30,0,i));
equal(F.buildPerimeters(detect(dispersed)).groups,0,"solo embers do not create shells");
const other=[{...fire(10,20),element:2},{...fire(25,20,0,1),element:3}];
equal(F.buildPerimeters(detect(other)).groups,0,"water and frost are untouched");
const big=Array.from({length:12},(_,i)=>cone(200,i)).flat();
const busy=F.buildPerimeters(detect(big),{maxGroups:4,sampleBudget:7500});
ok(busy.groups<=4,"cap only the EXTRA contours, never game agents");
ok(busy.skipped>=8,"budgeted draw skips optional shells for other casts");
ok(busy.samples<=7500,"total grid work stays within requested budget");
const ring=Array.from({length:100},(_,i)=>fire(300+80*Math.cos(i*2*Math.PI/100),
 300+80*Math.sin(i*2*Math.PI/100),0,i));
const ringShell=F.buildPerimeters(detect(ring));
ok(ringShell.groups===1,"non-beam nearby fire also gets a surface");
ok(ringShell.shells[0].paths.every(p=>p.points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y))),
 "all ring topology coordinates stay finite");
// Pixi mock: shell layer is optional, a control toggle, and has no authority
// to replace the canonical Forge material artwork or physics.
const ctx=new Proxy({}, {get(_t,k){return k==="createRadialGradient"?()=>({addColorStop(){}}):()=>{};}});
let painted=[],rendered=0;
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...items){this.children.push(...items)}
 addChildAt(item,index){this.children.splice(index,0,item)}
 destroy(){}
}
class Graphics{
 constructor(){this.geometry=[];this.isShell=false;}
 clear(){this.geometry=[];return this;}
 moveTo(x,y){this.geometry.push([x,y]);return this;}
 lineTo(x,y){this.geometry.push([x,y]);return this;}
 closePath(){return this;}
 stroke(options){painted.push(options);return this;}
 circle(){return this;}
 fill(){return this;}
}
class Sprite{constructor(texture){this.texture=texture;this.anchor={set(){}};this.position={set(){}};}}
class Particle{constructor(props){Object.assign(this,props);}}
class ParticleContainer extends Container{addParticle(p){this.children.push(p);}}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}},
  getBoundingClientRect:()=>({left:0,top:0,width:960,height:600})};}
 async init(){}stop(){}render(){rendered++;}destroy(){}
}
const P={Container,Graphics,Sprite,Particle,ParticleContainer,Application,Texture:{from:()=>({})}};
const rect=()=>({left:0,top:0,width:960,height:600});
const stage={getBoundingClientRect:rect,querySelector(){return{getBoundingClientRect:rect}},
 appendChild(canvas){this.canvas=canvas}};
const win={PIXI:P,WRKMAN_FIRE_CLUSTERS:C,WRKMAN_FIRE_PERIMETER:F,
 devicePixelRatio:2,document:{getElementById(){return stage},
 createElement(){return{getContext(){return ctx;}}}}};
const scene={player:{x:55,y:77},combat:{hp:100},
 cameras:{main:{getWorldPoint(x,y){return{x,y}}}}};
(async()=>{
 const bridge=Bridge.createBridge(scene,{window:win,stage,art:"soft",look:"bright",
  fireShell:true,fireBody:false,fireDebug:false,width:960,height:600});
 ok(await bridge.enable(),"Pixi renderer loads independently");
 function frame(){bridge.begin();for(const p of stream)bridge.paint(p);bridge.end();}
 frame();
 ok(bridge.fireShell,"Pass B can be active without debug outlines");
 equal(bridge.fireShellGroups,1,"one surface in live renderer");
 ok(bridge.fireShellPaths>=1,"valid contour was rendered");
 equal(bridge.drawn,200,"all 200 visual agents still submitted");
 ok(painted.some(p=>p.width===15),"outer feather band is drawn");
 ok(painted.some(p=>p.width===7),"middle halo band is drawn");
 ok(painted.some(p=>p.width===2.4),"subtle edge band is drawn");
 ok(painted.every(p=>p.alpha<=.16),"no opaque fill or hot core from Pass C/D");
 equal(scene.player.x,55,"player movement is untouched");
 equal(scene.combat.hp,100,"combat state is untouched");
 const count=painted.length;
 equal(bridge.setFireShell(false),false,"pass can be switched off instantly");
 frame();
 equal(bridge.fireShellGroups,0,"optional shell is cleared");
 equal(painted.length,count,"no shell strokes added when off");
 equal(bridge.drawn,200,"turning off shell never removes agents");
 ok(bridge.setFireShell(true),"optional shell can be restored");
 frame();
 equal(bridge.fireShellGroups,1,"re-enabled shell detects original cone");
 bridge.disable();
 ok(!bridge.active,"legacy Phaser rollback still works");
 ok(await bridge.enable(),"Pixi visuals can be re-enabled");
 bridge.destroy();
 ok(!bridge.ready,"no shell survives renderer teardown");
 console.log("Fire 085 Pass B: "+assertions+" assertions passed; "+rendered+" mocked frames.");
})().catch(err=>{console.error(err);process.exitCode=1;});