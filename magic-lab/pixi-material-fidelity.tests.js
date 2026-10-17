/* WANDRUNE 084 / Pixi material-fidelity test
 * Run: node magic-lab/pixi-material-fidelity.tests.js
 * Mocked renderer, uses exactly the same procedural material atlas keys
 * emitted by ElementVFX 069. No DOM, Phaser/Matter or GPU required.
 */
"use strict";
const assert=require("node:assert/strict");
const Bridge=require("./pixi-swarm-bridge.js");
let assertions=0;
function check(v,msg){assert.ok(v,msg);assertions++;}
const ctx=new Proxy({}, {get(_t,k){return k==="createRadialGradient"?()=>({addColorStop(){}}):()=>{};}});
const keys=[],loaded=[],sprites=[],particles=[],batches=[];
let highlights=0,renderCount=0;
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...items){this.children.push(...items);}
 addChildAt(item,i){this.children.splice(i,0,item);}
 destroy(){}
}
class Graphics{
 clear(){return this;}circle(){return this;}fill(){highlights++;return this;}
 moveTo(){return this;}lineTo(){return this;}stroke(){return this;}
}
class Sprite{
 constructor(texture){this.texture=texture;this.anchor={set(){}};this.position={set(){}};sprites.push(this);}
}
class Particle{
 constructor(props){Object.assign(this,props);particles.push(this);}
}
class ParticleContainer extends Container{
 constructor(opts){super();this.texture=opts.texture;batches.push(this);}
 addParticle(p){
  assert.equal(p.texture.id,this.texture.id,
   "ParticleContainer must not combine distinct texture sources");
  this.children.push(p);
 }
}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}},
  getBoundingClientRect(){return {left:0,top:0,width:960,height:600};}};}
 async init(){}stop(){}render(){renderCount++;}destroy(){}
}
const PIXI={Container,Graphics,Sprite,Particle,ParticleContainer,Application,
 Texture:{from(image){const id=image.id||"soft";loaded.push(id);return{id};}}};
const rect=()=>({left:0,top:0,width:960,height:600});
const stage={querySelector(){return{getBoundingClientRect:rect};},getBoundingClientRect:rect,
 appendChild(c){this.overlay=c;}};
const win={PIXI,document:{createElement(){return{getContext(){return ctx;}};},
 getElementById(){return stage;}},devicePixelRatio:3};
const atlas=new Map();
const scene={cameras:{main:{getWorldPoint(x,y){return{x,y};}}},
 textures:{get(key){
  keys.push(key);
  if(key==="wandrune-mat069-lightning"&&scene.missingLightning)return null;
  if(!atlas.has(key))atlas.set(key,{id:key,width:48,height:48});
  return{getSourceImage(){return atlas.get(key);}};
 }}};
const srcRecords=Array.from({length:200},(_,i)=>({
 x:150+i*.5,y:250+i*.1,r:2.8,alpha:.4,time:1500,seed:i+2,
 element:i<80?1:i<140?0:i<180?3:4,
 palette:i<80?"flame":i<140?"healing":"arcane",
 progress:i%2?.89:.55,color:0xffb880,angle:.5,agentIndex:i,castIndex:0
}));
const before=JSON.stringify(srcRecords);
(async()=>{
 const bridge=Bridge.createBridge(scene,{window:win,stage,width:960,height:600,art:"forge",look:"bright"});
 check(await bridge.enable(),"Pixi bridge initializes");
 check(bridge.art==="forge","Default selected art is restored materials");
 function frame(){bridge.begin();for(const r of srcRecords)check(bridge.paint(r),"Agent accepted");bridge.end();}
 frame();
 check(bridge.drawn===200&&bridge.materialDrawn===200,"All records use canonical native materials");
 check(bridge.artFallback===0,"No missing materials");
 check(bridge.details+bridge.bulk===200,"200 simulated visuals kept");
 check(keys.includes("wandrune-mat069-fire"),"Fire source image found");
 check(keys.includes("wandrune-mat069-frost"),"Frost source image found");
 check(keys.includes("wandrune-mat069-lightning"),"Lightning source image found");
 check(keys.includes("wandrune-mat069-neutral-healing-1"),"Mid recipe palette used");
 check(keys.includes("wandrune-mat069-neutral-healing-2"),"Late recipe palette used");
 check(particles[0].texture.id==="wandrune-mat069-fire","Bulk uses actual material image");
 check(particles[0].tint===0xffffff,"Original colored atlas is not double tinted");
 check(batches.some(x=>x.texture.id==="wandrune-mat069-fire"),
  "Native fire material has its own source-consistent particle batch");
 check(batches.some(x=>x.texture.id==="wandrune-mat069-neutral-healing-2"),
  "Late palette material uses a different batch from early palette");
 check(batches.every(x=>x.children.every(p=>p.texture.id===x.texture.id)),
  "Every batch has exactly one shared source");

 const materialAlpha=particles[0].alpha;
 bridge.setArt("soft");frame();
 check(bridge.materialDrawn===0,"Soft reference uses previous cloud textures");
 check(particles[0].alpha<materialAlpha,"Original particles are less visually solid");
 bridge.setArt("forge-hot");frame();
 check(bridge.materialDrawn===200,"Forge+ keeps original material source");
 check(bridge.ambientDrawn>0&&highlights>0,"Forge+ adds sparse glints");
 check(bridge.ambientDrawn<=72,"Extra accents capped");
 check(JSON.stringify(srcRecords)===before,"Art comparisons leave input records untouched");
 scene.missingLightning=true;
 // Fresh adapter exercises fallback without erroneously using cached native texture.
 const missing=Bridge.createBridge(scene,{window:win,stage,width:960,height:600,art:"forge",look:"bright"});
 check(await missing.enable(),"Fallback renderer initializes");
 missing.begin();missing.paint(srcRecords[190]);missing.end();
 check(missing.artFallback===1&&missing.drawn===1,"Absent material gracefully uses fallback texture");
 missing.destroy();
 bridge.disable();check(!bridge.active,"Phaser fallback survives");
 check(await bridge.enable(),"Pixi can resume without resetting physics");
 bridge.destroy();check(!bridge.ready,"Renderer teardown works");
 console.log("Pixi 084 material fidelity: "+assertions+" assertions passed; "+renderCount+" mock renders.");
})().catch(err=>{console.error(err);process.exitCode=1;});
