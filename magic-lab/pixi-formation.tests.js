/* WANDRUNE 081 / Presentation-only formation tests.
 * Run: node magic-lab/pixi-formation.tests.js
 * No network, browser, Phaser, Matter or real Pixi GPU required.
 */
"use strict";
const A=require("node:assert/strict");
const Formation=require("./pixi-formation.js");
const Bridge=require("./pixi-swarm-bridge.js");
let assertions=0;
function ok(x,message){A.ok(x,message);assertions++;}
function near(a,b,msg){ok(Math.abs(a-b)<1e-8,msg);}
function beam(count=200,width=24,castIndex=0){
 return Array.from({length:count},(_,i)=>{
  const t=i/(count-1),j=((i*71)%103)/103-.5;
  return {castIndex,agentIndex:i,element:1,color:0xff8040,
   x:80+t*560,y:220+26*t+j*(7+width*t),angle:.055+j*.09,
   r:3.4,alpha:.72};
 });
}
const cone=beam(),snapshot=JSON.stringify(cone);
const forms=Formation.analyze(cone);
ok(forms.length===1,"widening cone recognized from motion and geometry");
ok(forms[0].segments.length>=7,"ribbon includes connected occupied regions");
ok(forms[0].coherence>.8,"motion-direction coherence is measured");
ok(JSON.stringify(cone)===snapshot,"analysis never mutates agent records");
ok(Formation.analyze(beam(15)).length===0,"fewer than 24 points creates no artificial beam");
const radial=Array.from({length:200},(_,i)=>({
 castIndex:0,agentIndex:i,element:1,color:0xff8040,
 x:300+95*Math.cos(i*2*Math.PI/200),y:300+95*Math.sin(i*2*Math.PI/200),
 angle:i*2*Math.PI/200,r:3.4,alpha:.72
}));
ok(Formation.analyze(radial).length===0,"circular effects never become beams");
const fog=Array.from({length:200},(_,i)=>({
 castIndex:0,agentIndex:i,element:1,color:0xff8040,
 x:320+115*Math.cos(i*.618*6.28),y:320+115*Math.sin(i*.618*6.28),
 angle:i*.43,r:3.4,alpha:.72
}));
ok(Formation.analyze(fog).length===0,"scattered effects never become beams");
ok(Formation.analyze(beam().concat(beam(200,24,1))).length===2,
 "casts analyzed independently");
const split=beam().map(p=>({...p,x:p.x<340?p.x:p.x+800}));
ok(Formation.analyze(split).length===0,"disconnected distant streams cannot be joined");
// Minimal Pixi public-surface mock verifies toggles and fallback behavior.
const ctx=new Proxy({}, {get(_t,k){return k==="createRadialGradient"?()=>({addColorStop(){}}):()=>{};}});
let polygons=0,rendered=0,appInstance=null,particleRef=null;
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...a){this.children.push(...a);}
 addChildAt(a,i){this.children.splice(i,0,a);}
 destroy(){}
}
class Graphics{
 clear(){this.fills=0;}
 moveTo(){return this;}lineTo(){return this;}closePath(){return this;}
 fill(){this.fills=(this.fills||0)+1;polygons++;return this;}
}
class Sprite{constructor(t){this.texture=t;this.anchor={set(){}};this.position={set(){}};}}
class Particle{constructor(data){Object.assign(this,data);if(!particleRef)particleRef=this;}}
class ParticleContainer extends Container{addParticle(p){this.children.push(p);}}
class Application{
 constructor(){appInstance=this;this.stage=new Container();this.canvas={style:{},classList:{add(){}}};}
 async init(){}stop(){}render(){rendered++;}destroy(){}
}
const PI={Container,Graphics,Sprite,Particle,ParticleContainer,Application,Texture:{from:()=>({})}};
const rect=()=>({left:0,top:0,width:960,height:600});
const stage={querySelector(){return{getBoundingClientRect:rect};},getBoundingClientRect:rect,appendChild(c){this.pixiCanvas=c;}};
const win={PIXI:PI,WRKMAN_PIXI_FORMATIONS:Formation,devicePixelRatio:3,
 document:{createElement:()=>({getContext:()=>ctx}),getElementById:()=>stage}};
const scene={player:{x:100,y:100},combat:{hp:100},
 cameras:{main:{getWorldPoint(x,y){return{x,y};}}}};
(async()=>{
 const vfx=Bridge.createBridge(scene,{stage,window:win,width:960,height:600,look:"original"});
 ok(await vfx.enable(),"Pixi overlay enabled");
 ok(stage.pixiCanvas.style.pointerEvents==="none","game controls remain accessible");
 function tick(){vfx.begin();for(const r of cone)vfx.paint(r);vfx.end();}
 tick();const old=particleRef.alpha;
 ok(vfx.formations===0,"original has no formation augmentation");
 ok(vfx.drawn===200&&vfx.bulk+vfx.details===200,"all 200 records drawn");
 vfx.setLook("bright");tick();const brighter=particleRef.alpha;
 ok(brighter>old*1.8,"lightweight particle opacity restored");
 ok(vfx.formations===0,"bright changes opacity without merging trajectories");
 vfx.setLook("formation");tick();
 ok(vfx.formations===1&&vfx.formationSegments>=7,"coherent stream gets shape glow");
 ok(polygons>0,"geometry is sent to Pixi Graphics");
 ok(vfx.drawn===200,"formation never reduces simulated visual-state count");
 ok(JSON.stringify(cone)===snapshot,"bridge does not change source records");
 ok(scene.player.x===100&&scene.combat.hp===100,"combat and player positions untouched");
 vfx.setLook("original");tick();
 ok(vfx.formations===0,"reverting immediately clears shape layer");
 vfx.disable();ok(!vfx.active,"Phaser fallback available");
 ok(await vfx.enable(),"Pixi can re-enable without new game state");
 vfx.destroy();ok(!vfx.active&&!vfx.ready,"bridge shuts down cleanly");
 console.log("Wandrune 081 formation: "+assertions+" assertions passed; "+rendered+" mock renders.");
})().catch(err=>{console.error(err);process.exitCode=1;});
