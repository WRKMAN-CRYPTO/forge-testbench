/* Run: node magic-lab/pixi-fire-motion-bridge.tests.js
 * 088: live velocity/orientation integration and 3x200-agent cast regression.
 */
"use strict";
const assert=require("node:assert/strict");
const Flame=require("./pixi-fire-flame.js");
const Bridge=require("./pixi-swarm-bridge.js");
const Motion=require("./pixi-fire-motion.js");
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
const win={PIXI:P,WRKMAN_FIRE_FLAME:Flame,WRKMAN_FIRE_MOTION:Motion,devicePixelRatio:2,document:{
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
  fireFlames:true,fireMotion:true,fireBody:false,fireHot:false,fireShell:false});
 yes(await bridge.enable(),"Pixi bridge with flame atlas initializes");
 yes(bridge.fireFlames,"Flame silhouettes default on when available");
 yes(bridge.fireMotion,"Motion tracker enabled when supplied");
 const canvasReady=canvasCount;
 eq(canvasReady,19,"15 legacy fallbacks + three native flame variants + one probe");
 const render=(time,alpha)=>{
  bridge.begin();for(const r of records){bridge.paint({...r,x:r.x+Math.max(0,time-600)*.32,time,alpha:alpha===undefined?r.alpha:alpha});}
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
 for(let f=1;f<=18;f++)render(800+f*16);
 yes(bridge.fireMotionAligned>0,"Live Pixi fire agents align to movement");
 yes(bridge.fireMotionDense>0,"Dense mass receives reduced directional emphasis");
 eq(bridge.setFireMotion(false),false,"Motion A/B disables directional tails");
 render(1100);
 eq(bridge.fireMotionAligned,0,"Motion OFF retains living idle flame pose");
 eq(bridge.setFireMotion(true),true,"Motion A/B can restore tracking");
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
 const mass=Array.from({length:600},(_,i)=>{
  const cast=Math.floor(i/200),j=i%200;
  return {...records[j%80],element:1,castIndex:cast,agentIndex:j,seed:i+500,
   x:100+cast*245+(j%20)*.5,y:170+cast*90+Math.floor(j/20)*.5};
 });
 const copy=JSON.stringify(mass);
 const heavy=f=>{
  bridge.begin();for(const r of mass)bridge.paint({...r,x:r.x+f*5,time:1200+f*16});bridge.end();
 };
 heavy(0);eq(bridge.drawn,600,"Three separate 200-agent fire casts rendered");
 const particlesReady=allParticles.length+allSprites.length;
 for(let f=1;f<=16;f++)heavy(f);
 eq(bridge.drawn,600,"600 visual-agent records retained in motion");
 eq(bridge.bulk+bridge.details,600,"One render visual per submitted agent");
 eq(allParticles.length+allSprites.length,particlesReady,"Animation allocates zero additional particles");
 yes(bridge.fireMotionDense>0,"Dense 600-agent fields stay damped");
 yes(bridge.fireMotionAligned>0,"Moving groups receive bounded alignment");
 eq(JSON.stringify(mass),copy,"No original agent record altered");
 bridge.destroy();
 yes(!bridge.active&&!bridge.ready,"Fallback/teardown remains functional");
 console.log("Pixi 088 motion bridge: "+checks+" assertions passed");
})().catch(e=>{console.error(e);process.exitCode=1;});
