/* WANDRUNE 083 / Pixi camera registration tests.
 * Run: node magic-lab/pixi-camera.tests.js
 * Mock GL and DOM; validates CSS registration, same-frame world points and fallback.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Bridge=require("./pixi-swarm-bridge.js");
let checks=0;
const test=(condition,msg)=>{assert.ok(condition,msg);checks++};
const near=(a,b,msg)=>test(Math.abs(a-b)<1e-7,msg);
const page=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
test(page.includes("#stage{position:relative;"),"Stage is actual positioning ancestor");
test(page.includes("this.events.on(Phaser.Scenes.Events.RENDER"),"Pixi draws after Phaser render");
test(!page.includes("this.elementVfx?.extras(this.time.now);\n    this.pixiSpellRenderer?.end();"),
 "Scene.update no longer draws Pixi before camera preRender");
test(page.includes("pixiAlignStats"),"Live offset readout exists");
const c=new Proxy({}, {get(_t,key){return key==="createRadialGradient"?()=>({addColorStop(){}}):()=>{};}});
const rect=(left,top,width=960,height=600)=>({left,top,width,height});
class Container{
 constructor(){this.children=[];this.scale={set:(x,y)=>{this.scale.x=x;this.scale.y=y}};
  this.position={set:(x,y)=>{this.position.x=x;this.position.y=y}};}
 addChild(...items){this.children.push(...items)}
 addChildAt(item,i){this.children.splice(i,0,item)}
 destroy(){}
}
let glyphs=[];
class Graphics{
 clear(){glyphs=[];return this}
 moveTo(x,y){glyphs.push({x,y,move:true});return this}
 lineTo(x,y){glyphs.push({x,y});return this}
 stroke(){return this}
 circle(x,y,r){glyphs.push({x,y,r});return this}
}
class Sprite{constructor(t){this.texture=t;this.anchor={set(){}};this.position={set(){}};}}
class Particle{constructor(args){Object.assign(this,args)}}
class ParticleContainer extends Container{addParticle(p){this.children.push(p)}}
let app;
class Application{
 constructor(){
  app=this;this.stage=new Container();
  this.canvas={style:{},classList:{add(){}},
   getBoundingClientRect:()=>rect(20+parseFloat(this.canvas.style.left||0),
     35+parseFloat(this.canvas.style.top||0),
     parseFloat(this.canvas.style.width||960),parseFloat(this.canvas.style.height||600))};
 }
 async init(){}stop(){}render(){}destroy(){}
}
const PIXI={Container,Graphics,Sprite,Particle,ParticleContainer,Application,Texture:{from:()=>({})}};
const phaserCanvas={getBoundingClientRect:()=>rect(38,53,960,600)};
const stage={getBoundingClientRect:()=>rect(20,35,960,600),
 querySelector:()=>phaserCanvas,appendChild(el){this.overlay=el}};
const win={PIXI,devicePixelRatio:3,document:{getElementById:()=>stage,
 createElement:()=>({getContext:()=>c})}};
let sx=100,sy=200,zoom=.8;
const camera={getWorldPoint(x,y){return{x:sx+x/zoom,y:sy+y/zoom}}};
const bridge=Bridge.createBridge({cameras:{main:camera}},
 {window:win,stage,width:960,height:600,alignDebug:true,look:"bright"});
(async()=>{
 test(await bridge.enable(),"Pixi overlay initializes");
 bridge.setReference(200,350);
 bridge.begin();
 bridge.paint({x:235,y:348,r:3,alpha:.8,color:0xff6600,element:1,angle:.2,agentIndex:4,castIndex:0});
 bridge.end();
 // DOM offset measurement is sampled every twelfth rendered frame.
 for(let i=0;i<11;i++){bridge.begin();bridge.end();}
 near(bridge.canvasOffsetX,0,"Overlay CSS x equals Phaser canvas CSS x");
 near(bridge.canvasOffsetY,0,"Overlay CSS y equals Phaser canvas CSS y");
 const root=app.stage.children[0];
 near(root.scale.x,.8,"Camera zoom x respected");
 near(root.scale.y,.8,"Camera zoom y respected");
 near(root.position.x,-80,"Camera scroll x applied");
 near(root.position.y,-160,"Camera scroll y applied");
 test(glyphs.some(p=>p.x===200&&p.y===350),"Registration marker is at original world point");
 test(stage.overlay.style.pointerEvents==="none","Pixi never steals joystick or casting touches");
 // After moving/zooming the camera, transform must follow the new same-frame state.
 sx=412;sy=-66;zoom=1.25;
 bridge.begin();bridge.end();
 near(root.scale.x,1.25,"Camera zoom change x");
 near(root.scale.y,1.25,"Camera zoom change y");
 near(root.position.x,-515,"Camera pan x");
 near(root.position.y,82.5,"Camera pan y");
 bridge.disable();test(!bridge.active,"Phaser fallback remains available");
 bridge.destroy();test(!bridge.ready,"Camera adapter disposes");
 console.log("Pixi camera registration: "+checks+" assertions passed.");
})().catch(e=>{console.error(e);process.exitCode=1;});
