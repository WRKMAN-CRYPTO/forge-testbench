/* WANDRUNE 057 | Stable Glow + Luminance Upgrade
 * Purely visual. No forces, no collisions, no timers, no agent mutations.
 * One texture atlas set and capped, recyclable sprites. Every other agent
 * receives inexpensive elemental geometry through the existing Graphics pass.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ELEMENT_VFX=api;
})(typeof globalThis==="object"?globalThis:null,function(){
 "use strict";
 const VERSION="057",PREF="wrkman-wandrune056-vfx-quality",TWO_PI=Math.PI*2;
 const QUALITY=Object.freeze({
   low:Object.freeze({sprites:0,motes:26,lights:0,detail:0}),
   medium:Object.freeze({sprites:300,motes:105,lights:2,detail:1}),
   high:Object.freeze({sprites:850,motes:220,lights:4,detail:2})
 });
 const MATERIALS=Object.freeze({
  0:Object.freeze({key:"arcane",glow:0xb7a4ff,center:"#ffffff",mid:"#cfbcff",edge:"#7055a4"}),
  1:Object.freeze({key:"fire",glow:0xff7c29,center:"#fffce0",mid:"#ffcf62",edge:"#b83f26"}),
  2:Object.freeze({key:"water",glow:0x56ccec,center:"#ffffff",mid:"#71e7ff",edge:"#277ca2"}),
  3:Object.freeze({key:"frost",glow:0xa2eaff,center:"#ffffff",mid:"#bff2ff",edge:"#467fa8"}),
  4:Object.freeze({key:"lightning",glow:0xa9e5ff,center:"#ffffff",mid:"#f3faff",edge:"#408de8"})
 });
 const safeQuality=x=>QUALITY[x]?x:"medium";
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 // Boost opacity without introducing a floor, so the 800ms lifespan fades still vanish.
 // Frost keeps the restrained glass translucency that already looked right.
 const litAlpha=(alpha,element=0)=>clamp(Math.pow(clamp(alpha),element===3?.8:.55)*(element===4?1.035:1));
 function kind(element){return Number.isInteger(element)&&MATERIALS[element]?element:0;}
 function hash(v){let x=(Math.floor(v*9817)||1)>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;return (x>>>0)/4294967295;}
 function drawMaterial(ctx,element,seed,neutralColor=null){
  const m=MATERIALS[element],size=48,c=24,rad=15;
  ctx.clearRect(0,0,size,size);
  const grad=ctx.createRadialGradient(20,17,1,24,24,19);
  grad.addColorStop(0,neutralColor||m.center);
  grad.addColorStop(.40,neutralColor||m.mid);
  grad.addColorStop(.74,m.mid);
  grad.addColorStop(1,m.edge);
  if(element===1||element===4){
   const glow=ctx.createRadialGradient(c,c,2,c,c,24);
   glow.addColorStop(0,element===1?"#ffc05a88":"#b4e8ffb8");glow.addColorStop(1,"#ffffff00");
   ctx.fillStyle=glow;ctx.fillRect(0,0,48,48);
  }
  ctx.save();ctx.translate(c,c);
  ctx.beginPath();
  const sides=element===3?6:element===4?8:element===1?9:element===2?10:7;
  for(let k=0;k<sides;k++){
   const t=k*TWO_PI/sides-Math.PI/2;
   const jitter=element===2?.95:(.81+hash(seed+k*3)*.28);
   const r=rad*jitter;
   if(!k)ctx.moveTo(Math.cos(t)*r,Math.sin(t)*r);else ctx.lineTo(Math.cos(t)*r,Math.sin(t)*r);
  }
  ctx.closePath();ctx.fillStyle=grad;ctx.globalAlpha=.98;ctx.fill();
  ctx.clip();
  // Reusable vector material grain. No live per-agent canvas work.
  if(element===3){
   // Frost: radial crystalline cleavage, deep blue facet borders, pinprick inclusions.
   for(let k=0;k<6;k++){
    const t=(k/6)*TWO_PI,px=Math.cos(t)*12,py=Math.sin(t)*12;
    ctx.beginPath();ctx.moveTo(-1,-2);ctx.lineTo(px,py);
    ctx.strokeStyle=k%2?"#ffffffc0":"#307facbb";ctx.lineWidth=k%2?.75:1.25;ctx.stroke();
    ctx.beginPath();ctx.moveTo(px*.65,py*.65);
    ctx.lineTo(px*.8-Math.sin(t)*4,py*.8+Math.cos(t)*4);
    ctx.strokeStyle="#e9ffffbb";ctx.lineWidth=.8;ctx.stroke();
   }
   ctx.fillStyle="#ffffffc9";ctx.fillRect(-3,-7,3,3);
  }else if(element===4){
   // Lightning: bright forked conductor paths inside a glassy edge.
   ctx.lineJoin="round";ctx.lineCap="round";
   for(let side=-1;side<=1;side+=2){
    ctx.beginPath();ctx.moveTo(-9*side,-12);ctx.lineTo(-3*side,-3);
    ctx.lineTo(-7*side,1);ctx.lineTo(4*side,11);ctx.lineTo(1*side,2);
    ctx.lineTo(10*side,-2);
    ctx.strokeStyle="#2277ff";ctx.lineWidth=3.3;ctx.stroke();
    ctx.strokeStyle="#ffffff";ctx.lineWidth=1.35;ctx.stroke();
   }
   ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(0,0,4,0,TWO_PI);ctx.fill();
  }else if(element===1){
   // Fire: swirling layered tongues, hot center, black-red coal chips.
   for(let k=0;k<5;k++){
    const t=k*TWO_PI/5+seed*.13,x=Math.cos(t)*9,y=Math.sin(t)*9;
    ctx.beginPath();ctx.moveTo(-x*.24,-y*.24);ctx.quadraticCurveTo(y,-x,x,y);
    ctx.strokeStyle=k%2?"#ffd26eaa":"#ff5c25c8";ctx.lineWidth=2.8;ctx.stroke();
   }
   ctx.fillStyle="#fff2a8";ctx.beginPath();ctx.arc(-3,-4,4,0,TWO_PI);ctx.fill();
  }else if(element===2){
   // Water: layered caustics / refracted ribbons, glistening pearlescent edge.
   for(let k=-2;k<=2;k++){
    ctx.beginPath();ctx.moveTo(-15,-5+k*5);
    ctx.bezierCurveTo(-6,1+k*4,4,-7+k*3,16,-1+k*5);
    ctx.strokeStyle=k%2?"#d2fbffae":"#14548788";ctx.lineWidth=1.35;ctx.stroke();
   }
   ctx.fillStyle="#ffffffcc";ctx.beginPath();ctx.ellipse(-6,-8,3,1.6,-.6,0,TWO_PI);ctx.fill();
  }else{
   // Arcane: inner gemstone, etched glyph geometry and animated purple tint.
   for(let k=0;k<5;k++){
    const t=k*TWO_PI/5;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(12*Math.cos(t),12*Math.sin(t));
    ctx.strokeStyle=k%2?"#ffffff6d":"#462682a6";ctx.lineWidth=1;ctx.stroke();
   }
   ctx.strokeStyle="#ffffffbc";ctx.lineWidth=.7;ctx.strokeRect(-5,-5,10,10);
   ctx.fillStyle="#fff";ctx.fillRect(-2,-2,3,3);
  }
  // Light-catching grain, fixed for this atlas variant.
  for(let j=0;j<12;j++){
   const a=hash(seed*13+j*31)*TWO_PI,r=hash(seed*67+j*7)*13;
   ctx.fillStyle=j%2?"#0a152b52":"#ffffff8c";
   const d=j%3===0?1.5:.8;
   ctx.fillRect(Math.cos(a)*r,Math.sin(a)*r,d,d);
  }
  ctx.restore();
 }
 function factoryImage(scene,key,element,variation,neutralColor){
  if(scene.textures.exists(key))return true;
  if(typeof document==="undefined")return false;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=48;
  const ctx=canvas.getContext("2d");
  if(!ctx)return false;
  drawMaterial(ctx,element,variation,neutralColor);
  scene.textures.addCanvas(key,canvas);
  return true;
 }
 // Radial alpha image, not a PointLight shader. No hard white circles.
 // Soft halos are wholly transparent at their edges, independent of renderer.
 function makeHalo(scene,key,fire=false){
  if(scene.textures.exists(key))return;
  if(typeof document==="undefined")return;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=96;
  const ctx=canvas.getContext("2d");if(!ctx)return;
  const glow=ctx.createRadialGradient(48,48,0,48,48,47);
  if(fire){
   glow.addColorStop(0,"rgba(255,199,106,.47)");
   glow.addColorStop(.26,"rgba(255,141,62,.33)");
   glow.addColorStop(.60,"rgba(252,96,38,.105)");
  }else{
   glow.addColorStop(0,"rgba(161,225,255,.48)");
   glow.addColorStop(.26,"rgba(96,174,255,.31)");
   glow.addColorStop(.60,"rgba(57,121,241,.10)");
  }
  glow.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=glow;ctx.fillRect(0,0,96,96);
  scene.textures.addCanvas(key,canvas);
 }
 function install(scene){
  if(!scene?.textures||!scene.add)return null;
  const prefix="wandrune-mat056-";
  const keys={};
  for(let element=1;element<=4;element++){
   const key=prefix+MATERIALS[element].key;
   factoryImage(scene,key,element,element*97);
   keys[element]=key;
  }
  // The neutral majority needs textures too, matching each recipe palette.
  const neutral={
   flame:["#ffb979","#ffd6a2","#fff3cd"],
   arcane:["#8ec8ff","#c0a5ff","#f1d6ff"],
   healing:["#70e8ba","#baf9be","#f6ffd0"],
   void:["#a68dd8","#d78fe8","#ffe0f6"]
  };
  for(const [palette,cols] of Object.entries(neutral)){
   for(let i=0;i<3;i++){
    const key=prefix+"neutral-"+palette+"-"+i;
    factoryImage(scene,key,0,i+37,cols[i]);
    keys[palette+"_"+i]=key;
   }
  }
  const glowKeys={1:prefix+"halo-fire-057",4:prefix+"halo-lightning-057"};
  makeHalo(scene,glowKeys[1],true);
  makeHalo(scene,glowKeys[4],false);
  let q="medium";
  try{q=safeQuality(localStorage.getItem(PREF));}catch(_){}
  const overlay=scene.add.graphics().setDepth(5.35);
  let pool=[],used=0,previous=0,lastActive=0,lastMotes=0;
  const anchors=[],glows=[];
  let lastGlowTime=0;
  function setQuality(level){
   q=safeQuality(level);
   try{localStorage.setItem(PREF,q);}catch(_){}
   return q;
  }
  function ensureSlot(){
   if(used>=QUALITY[q].sprites)return null;
   if(used===pool.length){
    const obj=scene.add.image(0,0,keys[1]).setDepth(5.22);
    obj.setVisible(false);obj.setOrigin(.5,.5);
    pool.push(obj);
   }
   return pool[used++];
  }
  function begin(){
   used=0;lastActive=0;lastMotes=0;anchors.length=0;
   overlay.clear();
  }
  function pushAnchor(element,x,y,r,seed){
   const max=QUALITY[q].motes;
   if(!max||anchors.length>=max)return;
   // Stable deterministic subsampling avoids per-agent ParticleEmitters.
   const mark=hash(seed*17+element*29); // Stable agent identity; no positional flicker.
   if(mark>.26)return;
   anchors.push({element,x,y,r,seed});
  }
  function paint(g,opts){
   const {x,y,r,element=0,alpha=.8,time=0,seed=0,texture="flat",palette="flame",progress=.44,angle=0}=opts;
   const e=kind(element),radius=Math.max(.8,r),illum=litAlpha(alpha,e);
   // Only the intended recipe leaf shape stays leaf-shaped.
   if(texture==="leaf"){
    const nx=Math.cos(angle),ny=Math.sin(angle),px=-ny,py=nx;
    g.fillStyle(e?([0,0xffb669,0x7ce8ff,0xb5edff,0xffeeae][e]):opts.color,illum);
    g.fillPoints([
     {x:x-nx*radius*1.45,y:y-ny*radius*1.45},
     {x:x+px*radius*.72,y:y+py*radius*.72},
     {x:x+nx*radius*1.65,y:y+ny*radius*1.65},
     {x:x-px*radius*.72,y:y-py*radius*.72}],true);
    if(e===3&&q!=="low"){g.lineStyle(.5,0xe1fbff,alpha*.65);g.lineBetween(x,y,x+nx*radius,y+ny*radius);}
    if(e>0)pushAnchor(e,x,y,radius,seed);
    return;
   }
   let key=keys[e];
   if(!e)key=keys[palette+"_"+(progress<.33?0:progress<.7?1:2)]||keys["flame_1"];
   const sprite=ensureSlot();
   if(sprite&&scene.textures.exists(key)){
    const flicker=e===4?1+.07*Math.sin(time*.027+seed):e===1?1+.035*Math.sin(time*.014+seed):1;
    sprite.setTexture(key).setPosition(x,y).setDisplaySize(radius*3.2*flicker,radius*3.2*flicker)
      .setAlpha(illum).setVisible(true);
    sprite.setRotation(e===3?Math.sin(seed)*.1:e===1?Math.sin(time*.0008+seed)*.12:0);
   }else{
    // All unsprited agents still have faceted material and luminescent core.
    const col=e===0?opts.color:[0,0xffa347,0x61d7fb,0xb6ecff,0xffed9a][e];
    g.fillStyle(col,illum);
    const sides=e===3?6:e===4?7:6;
    const points=[];
    for(let j=0;j<sides;j++){
     const a=j*TWO_PI/sides+(e===3?0:.18),rr=radius*(j%2===0?1:.9);
     points.push({x:x+rr*Math.cos(a),y:y+rr*Math.sin(a)});
    }
    g.fillPoints(points,true);
    if(QUALITY[q].detail>0||e===4){
     const light=e===1?0xffe7a0:e===2?0xcaffff:e===3?0xe7fbff:0xffffff;
     g.fillStyle(light,clamp(illum*(e===4?.86:.6)));
     g.fillCircle(x-radius*.21,y-radius*.24,Math.max(.42,radius*(e===4?.38:.25)));
    }
    if(radius>4.5&&QUALITY[q].detail>0){
     g.lineStyle(.55,e===3?0x3d799e:e===1?0x8b251d:0xffffff,alpha*.57);
     g.lineBetween(x-radius*.48,y-radius*.2,x+radius*.27,y+radius*.55);
    }
   }
   if(e)pushAnchor(e,x,y,radius,seed);
   lastActive++;
  }
  function paintImpact(g,impact,time){
   const elapsed=clamp((time-impact.born)/310),opacity=(1-elapsed);
   if(opacity<=0)return;
   const color=impact.color;
   const e=color===0xff6b32?1:color===0x44c9ed?2:color===0xa7d8ff?3:color===0xffe65a?4:0;
   g.lineStyle(e===4?3:1.8,e===4?0xeaffff:color,opacity*.82);
   g.strokeCircle(impact.x,impact.y,2+elapsed*(e===4?20:14));
   if(e>0)for(let k=0;k<(e===4?7:5);k++){
    const a=TWO_PI*k/(e===4?7:5)+impact.x*.113;
    const d=3+elapsed*(e===3?18:24);
    const sx=impact.x+Math.cos(a)*d,sy=impact.y+Math.sin(a)*d;
    g.fillStyle(e===3?0xd6fcff:e===4?0xffffff:e===1?0xffba5b:0xb8faff,opacity*(e===4?.93:.58));
    g.fillCircle(sx,sy,Math.max(.4,(e===3?1.7:2)*(1-elapsed)));
   }
  }
  function extras(time){
   overlay.clear();
   const settings=QUALITY[q];
   // Every mote is anchored to a real simulated agent. No particles can collide.
   for(let k=0;k<anchors.length;k++){
    const a=anchors[k],id=a.seed*4+k*.39,t=time*.001,ph=id*5.33;
    const wobble=Math.sin(t*2.3+ph),f=.35+.65*Math.abs(Math.sin(t*2.8+ph));
    if(a.element===3){
     // Frost: six-pointed crystallites and chilly drifting haze.
     const x=a.x+Math.cos(ph+t*.42)*(4+a.r*2.5),y=a.y-a.r*1.5-((t*7+ph*3)%18);
     overlay.fillStyle(0xcdf8ff,.18+.32*f);overlay.fillCircle(x,y,1.2+.8*f);
     overlay.lineStyle(.65,0xe5ffff,.23+.4*f);
     overlay.lineBetween(x-2.5,y,x+2.5,y);overlay.lineBetween(x,y-2.5,x,y+2.5);
    }else if(a.element===4){
     // Lightning: short jagged ion branches with white-hot terminal sparks.
     const x=a.x+Math.cos(ph)*a.r*.8,y=a.y+Math.sin(ph)*a.r*.8;
     const ext=5+7*f;
     overlay.lineStyle(.9,0x5caefc,.38+.38*f);
     overlay.lineBetween(x,y,x+ext,y-3*wobble);
     overlay.lineStyle(.85,0xe8ffff,.55+.4*f);
     overlay.lineBetween(x+ext,y-3*wobble,x+ext+3,y-3*wobble-4);
     overlay.fillStyle(0xffffff,.48+.5*f);overlay.fillCircle(x+ext+3,y-3*wobble-4,.8);
    }else if(a.element===1){
     const x=a.x+Math.cos(ph+t*.7)*(a.r+3),y=a.y-a.r-((time*.009+ph*11)%20);
     overlay.fillStyle(k%2?0xffdb69:0xff7031,.28+.5*f);
     overlay.fillCircle(x,y,.65+f);
    }else if(a.element===2){
     const x=a.x+Math.cos(ph+t*.9)*(a.r*1.4+3),y=a.y+Math.sin(ph+t*.9)*(a.r*1.4+3);
     overlay.lineStyle(.7,0xc5fbff,.15+.37*f);overlay.strokeCircle(x,y,1.2+f);
    }
   }
   for(let i=previous;i>used;i--)pool[i-1].setVisible(false);
   previous=used;lastMotes=anchors.length;
   // Pool up to 2/4 ambient halos. Group by world cell so many lightning agents
   // illuminate one region rather than each agent spawning a new light.
   // This substitutes soft procedural textures for unstable PointLight shaders.
   const buckets=new Map();
   if(settings.lights){
    const camera=scene.cameras?.main?.worldView;
    for(const a of anchors){
     if(a.element!==4&&!(q==="high"&&a.element===1))continue;
     if(camera&&!camera.contains(a.x,a.y))continue;
     const key=a.element+":"+Math.floor(a.x/110)+":"+Math.floor(a.y/110);
     let bucket=buckets.get(key);
     if(!bucket){bucket={key,element:a.element,x:0,y:0,count:0,r:0};buckets.set(key,bucket);}
     bucket.x+=a.x;bucket.y+=a.y;bucket.r+=Math.min(a.r,14);bucket.count++;
    }
   }
   const targets=[...buckets.values()].sort((a,b)=>
     (b.count+(b.element===4?.4:0))-(a.count+(a.element===4?.4:0))||
     a.key.localeCompare(b.key)).slice(0,settings.lights);
   const dt=lastGlowTime?clamp(time-lastGlowTime,8,55):16;
   lastGlowTime=time;
   const glide=clamp(dt/140,.05,.40),fadeSpeed=clamp(dt/175,.05,.34);
   for(let i=0;i<Math.max(glows.length,targets.length);i++){
    const target=targets[i];
    if(!glows[i]&&target){
     const obj=scene.add.image(target.x/target.count,target.y/target.count,glowKeys[target.element])
       .setDepth(5.12).setOrigin(.5,.5).setAlpha(0).setVisible(true);
     // Additive color at a small, capped alpha gives a glow, not a white disk.
     if(typeof obj.setBlendMode==="function"&&typeof Phaser!=="undefined")
      obj.setBlendMode(Phaser.BlendModes.ADD);
     glows[i]=obj;
    }
    const halo=glows[i];if(!halo)continue;
    if(target&&scene.textures.exists(glowKeys[target.element])){
     const x=target.x/target.count,y=target.y/target.count;
     const distance=Math.hypot(x-halo.x,y-halo.y);
     if(distance>115&&halo.alpha>.06){
      halo.setAlpha(Math.max(0,halo.alpha-fadeSpeed*.5));
      continue; // Cross regions invisibly instead of teleporting bright circles.
     }
     halo.setTexture(glowKeys[target.element]);
     halo.setPosition(halo.alpha<.06?x:halo.x+(x-halo.x)*glide,
                      halo.alpha<.06?y:halo.y+(y-halo.y)*glide);
     const averageRadius=target.r/target.count;
     const diameter=Math.min(118,78+averageRadius*2.9);
     halo.setDisplaySize(diameter,diameter).setVisible(true);
     const targetAlpha=Math.min(.53,.31+.065*Math.sqrt(target.count));
     halo.setAlpha(clamp(halo.alpha+(targetAlpha-halo.alpha)*fadeSpeed));
    }else{
     halo.setAlpha(Math.max(0,halo.alpha-fadeSpeed*.57));
     if(halo.alpha<.012)halo.setVisible(false);
    }
   }
  }
  function destroy(){
   for(const x of pool)x.destroy();
   for(const x of glows)x.destroy();
   overlay.destroy();
  }
  return {begin,paint,paintImpact,extras,setQuality,get quality(){return q;},
    get stats(){return {sprites:used,agents:lastActive,motes:lastMotes,lights:glows.filter(x=>x.visible).length};},
    destroy};
 }
 return Object.freeze({VERSION,PREF,QUALITY,MATERIALS,safeQuality,hash,drawMaterial,install});
});
