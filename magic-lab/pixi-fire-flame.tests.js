/* Run: node magic-lab/pixi-fire-flame.tests.js
 * 087: deterministic flame appearance only; mocks Pixi, no browser or GPU.
 */
"use strict";
const assert=require("node:assert/strict");
const Flame=require("./pixi-fire-flame.js");
const Bridge=require("./pixi-swarm-bridge.js");
let checks=0;
function yes(x,m){assert.ok(x,m);checks++;}
function eq(x,y,m){assert.equal(x,y,m);checks++;}
let canvasCount=0,gradientCount=0,drawNativeCount=0;
const graphicCtx=new Proxy({}, {get(_t,key){
 if(key==="createLinearGradient"||key==="createRadialGradient")return (..._args)=>{
  gradientCount++;return{addColorStop(){}};
 };
 if(key==="drawImage")return()=>{drawNativeCount++;};
 return()=>{};
}});
const allSprites=[],allParticles=[],allBatches=[];
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...cs){this.children.push(...cs);}
 addChildAt(c,i){this.children.splice(i,0,c);}
 destroy(){}
}
class Graphics{
 clear(){return this;}circle(){return this;}fill(){return this;}
 lineTo(){return this;}moveTo(){return this;}stroke(){return this;}cut(){return this;}
}
class Sprite{
 constructor(texture){this.texture=texture;this.anchor={set(){}};this.position={set:(x,y)=>{this.x=x;this.y=y}};allSprites.push(this);}
}
class Particle{constructor(props){Object.assign(this,props);allParticles.push(this);}}
class ParticleContainer extends Container{
 constructor(o){super();this.source=o.texture;allBatches.push(this);}
 addParticle(p){assert.equal(p.texture.id,this.source.id);this.children.push(p);}
}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}}};}
 async init(){}stop(){}render(){}destroy(){}
}
const P={Container,Graphics,Sprite,Particle,ParticleContainer,Application,
 Texture:{from(obj){return{id:obj.id||"unknown",width:obj.width,height:obj.height};}}};
const win={PIXI:P,WRKMAN_FIRE_FLAME:Flame,devicePixelRatio:2,document:{
 createElement(tag){assert.equal(tag,"canvas");const id="canvas-"+(++canvasCount);
  return {id,width:0,height:0,getContext(){return graphicCtx;}};}
}};
const stage={appendChild(cv){this.overlay=cv;},
 querySelector(){return{getBoundingClientRect(){return{left:0,top:0,width:960,height:600}}}},
 getBoundingClientRect(){return{left:0,top:0,width:960,height:600}}};
const textures=new Map();
const scene={cameras:{main:{getWorldPoint(x,y){return{x,y}}}},
 textures:{get(key){if(!textures.has(key))textures.set(key,{id:key,width:48,height:48});
  return{getSourceImage(){return textures.get(key);}};}}};
const records=Array.from({length:200},(_,i)=>({
 x:100+i*2,y:220+i*.1,r:2.8,alpha:.56,element:i<80?1:i<140?3:0,
 agentIndex:i,castIndex:i<80?0:1,time:600,seed:i*.24,angle:i*.01,
 palette:"arcane",color:0xffffff,progress:0.5
}));
(async()=>{
 const pose0=Flame.flamePose(records[1],15);
 const pose1=Flame.flamePose({...records[1],time:800},15);
 yes(pose0.height>pose0.width,"Flame silhouette is taller than wide");
 yes(pose0.height!==pose1.height&&pose0.rotation!==pose1.rotation,"Visual shape moves smoothly with clock");
 const a=Flame.makeFlameTexture(win,P,{id:"source",width:48,height:48},0);
 yes(a?.width===64&&a?.height===64,"Cached texture is 64 square");
 yes(gradientCount>=3&&drawNativeCount>=1,"Flame has layered gradients and native hot material");
 const before=JSON.stringify(records);
 const bridge=Bridge.createBridge(scene,{window:win,stage,width:960,height:600,art:"forge",look:"bright",
  fireFlames:true,fireBody:false,fireHot:false,fireShell:false});
 yes(await bridge.enable(),"Pixi bridge with flame atlas initializes");
 yes(bridge.fireFlames,"Flame silhouettes default on when available");
 const canvasReady=canvasCount;
 eq(canvasReady,19,"15 legacy fallbacks + three native flame variants + one probe");
 const render=(time,alpha)=>{
  bridge.begin();for(const r of records){bridge.paint({...r,time,alpha:alpha===undefined?r.alpha:alpha});}
  bridge.end();
 };
 render(600);
 eq(bridge.drawn,200,"All 200 agent render records retained");
 eq(bridge.bulk+bridge.details,200,"No duplicated visible agents");
 eq(bridge.fireFlamesDrawn,80,"Only 80 actual fire agents use flame appearance");
 eq(bridge.materialDrawn,200,"Every source still has canonical material");
 const flaming=allParticles.filter(p=>p.texture.id.startsWith("canvas-")&&p.alpha>0);
 yes(flaming.length>65&&flaming.length<80,"Most fire visuals remain efficient batch particles");
 const normalIce=allParticles.find(p=>p.texture.id==="wandrune-mat069-frost");
 yes(normalIce&&Math.abs(normalIce.scaleX*48-8.96)<1e-6,"Frost retains untouched native texture and sizing");
 const baseAlpha=Math.pow(.56,.55);
 yes(flaming.every(p=>Math.abs(p.alpha-baseAlpha)<1e-9),"Original nonlinear fade alpha is kept");
 const oldHeight=flaming[0].scaleY,oldRotation=flaming[0].rotation;
 const allocation=allParticles.length;
 render(800);
 eq(allParticles.length,allocation,"Normal animation allocates zero new particles per frame");
 eq(canvasCount,canvasReady,"Normal animation repaints zero source canvases");
 yes(Math.abs(flaming[0].scaleY-oldHeight)>1e-5||Math.abs(flaming[0].rotation-oldRotation)>1e-5,
  "Existing sprite/particle geometry moves over time");
 eq(bridge.setFireFlames(false),false,"Live A/B turns off flame silhouette");
 render(800);
 eq(bridge.fireFlamesDrawn,0,"A/B OFF draws old material");
 eq(bridge.drawn,200,"A/B does not change visual count");
 yes(allParticles.some(p=>p.texture.id==="wandrune-mat069-fire"&&p.alpha>0),
  "Old fire material restored intact");
 eq(bridge.setFireFlames(true),true,"Live A/B re-enables new silhouette");
 render(850,0);
 eq(bridge.drawn,200,"Fade-out frame still gets all submissions");
 yes(allParticles.every(p=>p.alpha===0),"Zero alpha vanishes instead of lingering");
 eq(JSON.stringify(records),before,"Original agent inputs were not mutated");
 eq(canvasCount,canvasReady,"Switching A/B does not recreate canvases");
 bridge.destroy();
 yes(!bridge.active&&!bridge.ready,"Fallback/teardown remains functional");
 console.log("Pixi 087 flame silhouette: "+checks+" assertions passed");
})().catch(e=>{console.error(e);process.exitCode=1;});
