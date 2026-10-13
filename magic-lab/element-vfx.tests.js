/* WANDRUNE VFX 057 regression checks: node magic-lab/element-vfx.tests.js
   Physics is not instantiated; art must remain independent and capped. */
'use strict';
const assert=require('node:assert/strict');
const Effects=require('./element-vfx.js');
const textures=new Set(),objects=[];
let invalidPointLights=0;
global.document={createElement:()=>({width:0,height:0,getContext:()=>({
 clearRect(){},createRadialGradient(){return{addColorStop(){}}},
 save(){},translate(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},
 clip(){},stroke(){},fillRect(){},ellipse(){},arc(){},quadraticCurveTo(){},bezierCurveTo(){},strokeRect(){},restore(){}
})})};
const store={};
global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;}};
global.Phaser={WEBGL:2,BlendModes:{ADD:1}};
function image(type){
 const o={type,x:0,y:0,w:0,h:0,alpha:0,visible:false,destroyed:false,
  setDepth(){return this},setVisible(v){this.visible=v;return this},setOrigin(){return this},
  setTexture(t){assert.ok(textures.has(t),t);this.texture=t;return this},
  setPosition(x,y){this.x=x;this.y=y;return this},setDisplaySize(w,h){this.w=w;this.h=h;return this},
  setAlpha(v){this.alpha=v;return this},setRotation(){return this},setBlendMode(){return this},
  destroy(){this.destroyed=true}
 };objects.push(o);return o;
}
const gfx={clear(){},fillStyle(){},fillCircle(){},fillPoints(){},lineStyle(){},lineBetween(){},strokeCircle(){},destroy(){}};
const scene={textures:{exists:k=>textures.has(k),addCanvas:k=>textures.add(k)},
 add:{graphics:()=>({...gfx,setDepth(){return this}}),image:(x,y,key)=>{
  const o=image(key.includes('halo')?'halo':'material');o.x=x;o.y=y;return o;
 },pointlight:()=>{invalidPointLights++;throw Error('PointLight regression');}},
 cameras:{main:{worldView:{contains:()=>true}}},game:{renderer:{type:2}}};
const fx=Effects.install(scene);
function frame(quality,time){
 fx.setQuality(quality);fx.begin();
 for(let i=0;i<1300;i++)fx.paint(gfx,{
  x:i%40*8,y:Math.floor(i/40)*8,r:i%7+2,element:i%5,
  seed:i*71+12,color:0x90aeff,alpha:.57,time,palette:'arcane',
  texture:'flat',progress:i%10/10
 });
 fx.extras(time);
 return fx.stats;
}
assert.equal(Effects.VERSION,'057');
assert.equal(frame('low',1000).sprites,0);
assert.equal(frame('low',1001).lights,0);
const med=frame('medium',1016);assert.equal(med.sprites,300);assert.ok(med.lights<=2);
const high=frame('high',1032);assert.equal(high.sprites,850);assert.ok(high.lights<=4);
const glows=objects.filter(x=>x.type==='halo'&&x.visible);
for(const glow of glows){assert.ok(glow.w<=118,'halo diameter capped');assert.ok(glow.alpha<=.53,'halo opacity capped');}
assert.equal(invalidPointLights,0,'shader PointLights completely removed');
assert.equal(frame('low',1048).lights,0,'low mode immediately hides glows');
assert.equal(Effects.hash(71*17+4*29),Effects.hash(71*17+4*29),'anchor sampling deterministic');
fx.destroy();
assert.ok(objects.every(x=>x.destroyed),'all pooled objects destroyed');
console.log('Wandrune 057 visual regression checks passed');
