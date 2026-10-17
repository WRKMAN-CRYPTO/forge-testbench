/* Run with: node magic-lab/pixi-swarm-bridge.tests.js
 * No browser, CDN, Phaser, GPU or gameplay system required.
 */
"use strict";
const assert=require("node:assert/strict");
const Bridge=require("./pixi-swarm-bridge.js");
let checks=0;function ok(value,msg){assert.ok(value,msg);checks++;}
const context=new Proxy({}, {get(_t,key){return key==="createRadialGradient"?()=>({addColorStop(){}}):()=>{};}});
const rect=()=>({left:12,top:20,width:960,height:600});
class Container{
 constructor(){this.children=[];this.scale={set(){}};this.position={set(){}};}
 addChild(...items){this.children.push(...items);}
 addChildAt(item,index){this.children.splice(index,0,item);}
 destroy(){this.destroyed=true;}
}
class Sprite{
 constructor(texture){this.texture=texture;this.anchor={set(){}};this.position={set(){}};this.visible=true;}
}
class Particle{constructor(props){Object.assign(this,props);}}
class ParticleContainer extends Container{addParticle(p){this.children.push(p);}}
class Application{
 constructor(){this.stage=new Container();this.canvas={style:{},classList:{add(){}}};this.renders=0;}
 async init(){}stop(){}render(){this.renders++;}destroy(){this.destroyed=true;}
}
const PIXI={Application,Sprite,Particle,ParticleContainer,Container,Texture:{from:()=>({})}};
const windowMock={PIXI,devicePixelRatio:3,document:{createElement:()=>({getContext:()=>context})}};
const stage={appendChild(canvas){this.overlay=canvas;},querySelector(){return{getBoundingClientRect:rect};},getBoundingClientRect:rect};
const scene={player:{x:10,y:20},combat:{hp:100},cameras:{main:{getWorldPoint(x,y){return{x:x/.8+11,y:y/.8+42};}}}};
(async()=>{
 ok(Bridge.wantPixi("?v=080"),"Pixi enabled for test path");
 ok(!Bridge.wantPixi("?renderer=legacy"),"Legacy query disables Pixi");
 ok(Bridge.classify({element:900})===0,"Unknown material falls back to arcane");
 const bridge=Bridge.createBridge(scene,{window:windowMock,stage,width:960,height:600});
 ok(!bridge.active,"Initially inactive");
 ok(await bridge.enable(),"Enables without Phaser scene changes");
 ok(bridge.active&&bridge.ready,"Active when ready");
 ok(stage.overlay.style.pointerEvents==="none","Overlay does not intercept thumb controls");
 bridge.begin();
 for(let i=0;i<200;i++)ok(bridge.paint({
  x:100+i,y:300,r:i===24?12:3,element:i%5,color:0xffffff,alpha:.72,agentIndex:i,angle:0
 }),"Accepts crafted visual "+i);
 ok(!bridge.paint({x:NaN,y:2}),"Non-finite coordinate rejected");
 bridge.end();
 ok(bridge.drawn===200,"Every input visual retained");
 ok(bridge.bulk+bridge.details===200,"All inputs represented exactly once");
 ok(bridge.details>=20&&bridge.details<=28,"About 10% detail with behemoth priority");
 ok(scene.combat.hp===100&&scene.player.x===10,"Gameplay scene untouched");
 bridge.begin();bridge.end();
 ok(bridge.drawn===0,"Empty frame clears old visual submissions");
 bridge.disable();ok(!bridge.active,"Fallback activated");
 ok(await bridge.enable(),"Re-enables after fallback");
 bridge.destroy();ok(!bridge.ready&&!bridge.active,"Disposes cleanly");
 console.log("Pixi8 bridge: "+checks+" assertions passed");
})().catch(e=>{console.error(e);process.exitCode=1;});
