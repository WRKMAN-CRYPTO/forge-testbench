/* WANDRUNE / PIXI8 MIGRATION PHASE 1
 * Purely presentational adapter for the existing crafted swarm drawing pass.
 * Phaser 3 + Matter retain all gameplay, collisions, input, time, save keys,
 * agent movement, rune effects, world geometry and combat state.
 * No global cast limit, agent mutation, forced visual LOD or gameplay hooks.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_PIXI_SWARM=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="081-pixi8-formations",CDN="https://cdn.jsdelivr.net/npm/pixi.js@8.10.0/dist/pixi.min.js";
 let scriptLoading=null;
 function clamp(n,a=0,b=1){return Math.min(b,Math.max(a,Number.isFinite(n)?n:a));}
 function wantPixi(search){return !/(?:[?&])(?:renderer|render)=legacy(?:&|$)/.test(search||"");}
 function loadPixi(win){
  if(win.PIXI?.Application&&win.PIXI?.ParticleContainer)return Promise.resolve(win.PIXI);
  if(scriptLoading)return scriptLoading;
  scriptLoading=new Promise((resolve,reject)=>{
   const script=win.document.createElement("script");
   let finished=false;
   const timer=win.setTimeout(()=>fail(new Error("PixiJS download timed out")),12000);
   function fail(err){if(finished)return;finished=true;win.clearTimeout(timer);reject(err);}
   script.src=CDN;script.async=true;
   script.onload=()=>{if(win.PIXI?.ParticleContainer){finished=true;win.clearTimeout(timer);resolve(win.PIXI);}
    else fail(new Error("PixiJS 8 is missing ParticleContainer"));};
   script.onerror=()=>fail(new Error("PixiJS 8 CDN unavailable"));
   win.document.head.append(script);
  }).catch(e=>{scriptLoading=null;throw e;});
  return scriptLoading;
 }
 function classify(record){
  const x=Number(record?.element)||0;
  return Number.isInteger(x)&&x>=0&&x<=4?x:0;
 }
 const ELEMENTS=[
  {name:"arcane",rgb:[182,137,255]},
  {name:"fire",rgb:[255,144,68]},
  {name:"water",rgb:[102,204,251]},
  {name:"frost",rgb:[139,228,255]},
  {name:"lightning",rgb:[162,211,255]}
 ];
 function makeTexture(win,P,kind,variant){
  const canvas=win.document.createElement("canvas");canvas.width=canvas.height=128;
  // White luminance texture can be tinted to the *authored* recipe RGB.
  // A preset-color texture multiplied by the recipe tint would darken custom spells.
  const g=canvas.getContext("2d"),[r,v,b]=[255,255,255];
  const glow=g.createRadialGradient(64,64,1,64,64,59);
  glow.addColorStop(0,"rgba("+r+","+v+","+b+",.95)");
  glow.addColorStop(.16,"rgba("+r+","+v+","+b+",.60)");
  glow.addColorStop(.40,"rgba("+r+","+v+","+b+",.16)");
  glow.addColorStop(1,"rgba("+r+","+v+","+b+",0)");
  g.fillStyle=glow;g.fillRect(0,0,128,128);
  g.save();g.translate(64,64);
  g.shadowColor="rgb("+r+","+v+","+b+")";g.shadowBlur=13;
  g.fillStyle="#ffffff";
  if(variant===0){
   if(kind===1){g.beginPath();g.moveTo(0,-27);g.bezierCurveTo(16,-5,10,4,8,17);g.quadraticCurveTo(-2,26,-12,8);g.quadraticCurveTo(-10,-3,0,-27);g.fill();}
   else if(kind===3){g.beginPath();g.moveTo(0,-27);g.lineTo(8,-6);g.lineTo(0,28);g.lineTo(-9,-7);g.closePath();g.fill();}
   else if(kind===4){g.beginPath();g.moveTo(-5,-25);g.lineTo(9,-6);g.lineTo(0,-5);g.lineTo(9,25);g.lineTo(-12,0);g.lineTo(0,-2);g.closePath();g.fill();}
   else {g.beginPath();g.arc(0,0,10,0,Math.PI*2);g.fill();}
  }else if(variant===1){
   g.rotate(.6);g.beginPath();g.ellipse(0,0,kind===3?4:3,kind===1?22:26,0,0,Math.PI*2);g.fill();
  }else{
   g.beginPath();g.arc(0,0,kind===3?6:3.7,0,Math.PI*2);g.fill();
   if(kind===3){g.strokeStyle="#ffffff";g.lineWidth=1.3;g.beginPath();g.moveTo(-12,0);g.lineTo(12,0);g.moveTo(0,-12);g.lineTo(0,12);g.stroke();}
  }
  g.restore();
  return P.Texture.from(canvas);
 }
 function createBridge(scene,opts={}){
  const win=opts.window||(typeof window!=="undefined"?window:null);
  if(!win||!win.document)throw Error("Browser required for Pixi overlay");
  const W=Number(opts.width)||960,H=Number(opts.height)||600;
  const stage=opts.stage||win.document.getElementById("stage");
  if(!stage)throw Error("Wandrune stage not found");
  const FORMATION=win.WRKMAN_PIXI_FORMATIONS||null;
  const allowedLooks=["original","bright","formation"];
  const requested=allowedLooks.includes(opts.look)?opts.look:"formation";
  const initialLook=requested==="formation"&&!FORMATION?.analyze?"bright":requested;
  const state={active:false,ready:false,loading:false,error:null,records:[],drawn:0,
   details:0,bulk:0,frame:0,look:initialLook,formations:0,formationSegments:0};
  let P=null,app=null,world=null,detailsLayer=null,shapeLayer=null,shapeGraphics=null,textureSet=[],bulkGroups=[],spritePool=[],disposed=false,heroUsed=0;
  const DETAIL_RATIO=.10;
  function announce(msg){
   if(typeof opts.status==="function")try{opts.status(msg);}catch(_){}
  }
  function setLook(next){
   if(!allowedLooks.includes(next))return state.look;
   if(next==="formation"&&!FORMATION?.analyze){
    announce("FORMATION UNAVAILABLE · BRIGHT ONLY");
    next="bright";
   }
   state.look=next;
   if(next!=="formation"){shapeGraphics?.clear();state.formations=0;state.formationSegments=0;}
   announce("PIXI LOOK · "+next.toUpperCase());
   return state.look;
  }
  function drawQuad(g,a,b,nx,ny,scale,color,alpha){
   const aw=a.width*scale,bw=b.width*scale;
   g.moveTo(a.x+nx*aw,a.y+ny*aw)
    .lineTo(b.x+nx*bw,b.y+ny*bw)
    .lineTo(b.x-nx*bw,b.y-ny*bw)
    .lineTo(a.x-nx*aw,a.y-ny*aw)
    .closePath().fill({color,alpha});
  }
  function paintFormations(){
   if(!shapeGraphics)return;
   shapeGraphics.clear();
   state.formations=0;state.formationSegments=0;
   if(state.look!=="formation"||!FORMATION?.analyze)return;
   const inferred=FORMATION.analyze(state.records,{maxFormations:10});
   for(const f of inferred){
    state.formations++;
    state.formationSegments+=f.segments.length;
    const nx=-f.axis.y,ny=f.axis.x,color=f.color;
    const r=(color>>>16)&255,gr=(color>>>8)&255,blue=color&255;
    const hot=(Math.round(r+(255-r)*.58)<<16)|
     (Math.round(gr+(255-gr)*.58)<<8)|Math.round(blue+(255-blue)*.58);
    for(const segment of f.segments){
     // Three independent light bands, behind the individual particles.
     // Per-bin width is inferred from local occupied space.
     drawQuad(shapeGraphics,segment.a,segment.b,nx,ny,2.25,color,.035);
     drawQuad(shapeGraphics,segment.a,segment.b,nx,ny,1.15,color,.085);
     drawQuad(shapeGraphics,segment.a,segment.b,nx,ny,.47,hot,.12);
    }
   }
  }
  function getGroup(element,variant){
   const i=element*3+variant;
   if(!bulkGroups[i]){
    const pool=[];
    const container=new P.ParticleContainer({dynamicProperties:{position:true,vertex:true,rotation:true,color:true}});
    container.blendMode="normal";
    world.addChildAt(container,world.children.indexOf(detailsLayer));
    bulkGroups[i]={pool,container,used:0};
   }
   return bulkGroups[i];
  }
  function allocateHero(){
   if(heroUsed<spritePool.length)return spritePool[heroUsed++];
   const sprite=new P.Sprite(textureSet[0][0]);
   sprite.anchor.set(.5);sprite.blendMode="add";
   detailsLayer.addChild(sprite);spritePool.push(sprite);heroUsed++;
   return sprite;
  }
  function takeParticle(element,variant){
   const batch=getGroup(element,variant),index=batch.used++;
   if(index<batch.pool.length)return batch.pool[index];
   const particle=new P.Particle({texture:textureSet[element][variant],
    x:0,y:0,anchorX:.5,anchorY:.5,rotation:0,scaleX:1,scaleY:1,alpha:0});
   batch.container.addParticle(particle);
   batch.pool.push(particle);
   return particle;
  }
  function align(){
   if(!app||!app.canvas)return;
   const phaserCanvas=stage.querySelector("canvas:not(.wandrune-pixi-canvas)");
   if(!phaserCanvas)return;
   const a=phaserCanvas.getBoundingClientRect(),b=stage.getBoundingClientRect();
   const cv=app.canvas;
   cv.style.left=(a.left-b.left)+"px";cv.style.top=(a.top-b.top)+"px";
   cv.style.width=a.width+"px";cv.style.height=a.height+"px";
   const cam=scene.cameras?.main;
   if(cam&&world){
    // Map the *actual Phaser camera inverse* to Pixi world transforms.
    // Accounts for follow, zoom and the game's phone-scale ENVELOP crop.
    const p0=cam.getWorldPoint(0,0);
    const px=cam.getWorldPoint(W,0);
    const py=cam.getWorldPoint(0,H);
    const scaleX=W/(px.x-p0.x),scaleY=H/(py.y-p0.y);
    if(Number.isFinite(scaleX)&&Number.isFinite(scaleY)&&Math.abs(scaleX)<50&&Math.abs(scaleY)<50){
     world.scale.set(scaleX,scaleY);
     world.position.set(-p0.x*scaleX,-p0.y*scaleY);
    }
   }
  }
  async function enable(){
   if(disposed)return false;
   if(state.ready&&app){state.active=true;app.canvas.style.display="block";announce("PIXI8 SWARM · ON");return true;}
   if(state.loading)return false;
   state.loading=true;state.error=null;announce("PIXI8 SWARM · LOADING");
   try{
    P=await loadPixi(win);
    if(disposed)return false;
    app=new P.Application();
    await app.init({width:W,height:H,resolution:Math.min(2,win.devicePixelRatio||1),
     autoDensity:true,backgroundAlpha:0,antialias:false,preference:"webgl",powerPreference:"high-performance"});
    if(disposed){app.destroy(true);return false;}
    app.stop();
    world=new P.Container();detailsLayer=new P.Container();
    shapeLayer=new P.Container();shapeGraphics=new P.Graphics();
    shapeLayer.addChild(shapeGraphics);
    app.stage.addChild(world);world.addChild(shapeLayer,detailsLayer);
    textureSet=ELEMENTS.map((_,e)=>[0,1,2].map(v=>makeTexture(win,P,e,v)));
    const cv=app.canvas;cv.classList.add("wandrune-pixi-canvas");
    Object.assign(cv.style,{position:"absolute",pointerEvents:"none",zIndex:"2",display:"block",maxWidth:"none",maxHeight:"none"});
    stage.appendChild(cv);
    state.active=true;state.ready=true;state.loading=false;
    align();announce("PIXI8 SWARM · ON");
    return true;
   }catch(err){
    state.loading=false;state.active=false;state.error=String(err?.message||err);
    announce("PIXI UNAVAILABLE · PHASER SAFE");
    try{app?.destroy(true);}catch(_){}app=null;
    return false;
   }
  }
  function disable(reason){
   state.active=false;state.records.length=0;
   if(app?.canvas)app.canvas.style.display="none";
   shapeGraphics?.clear();state.formations=0;state.formationSegments=0;
   if(reason)state.error=String(reason);
   announce("PHASER SWARM · SAFE FALLBACK");
  }
  function begin(){
   if(!state.active||!app)return;
   state.records.length=0;
  }
  function paint(record){
   if(!state.active)return false;
   if(!record||!Number.isFinite(record.x)||!Number.isFinite(record.y))return false;
   state.records.push(record);
   return true;
  }
  function end(){
   if(!state.active||!app)return;
   try{
    state.frame++;heroUsed=0;
    for(const group of bulkGroups)if(group)group.used=0;
    let detailed=0,bulk=0;
    for(const r of state.records){
     const elem=classify(r),index=Math.max(0,Number(r.agentIndex)||0);
     const hero=(index%10===0)||(r.r>9&&index%4===0);
     const variant=(Math.floor(index/3)+elem)%3;
     const radius=clamp(Number(r.r),.6,80);
     const size=radius*(hero?6.0:4.3);
     // Original demonstrates the translucency problem for an honest A/B.
     // Bright and Formation restore the opacity missing from lightweight embers.
     const alpha=clamp(clamp(r.alpha??.65)*
      (state.look==="original"?(hero?.86:.62):(hero?1.12:1.22)));
     const visualTint=typeof r.color==="number"&&Number.isFinite(r.color)?(r.color&0xffffff):0xffffff;
     if(hero){
      const sprite=allocateHero();
      sprite.texture=textureSet[elem][variant];
      sprite.position.set(r.x,r.y);
      sprite.rotation=r.angle||0;
      sprite.width=size;sprite.height=size*1.55;
      sprite.alpha=alpha;sprite.visible=true;
      // Texture contains its own elemental glow, with bright hero accents.
      sprite.tint=visualTint;
      detailed++;
     }else{
      const particle=takeParticle(elem,variant);
      particle.x=r.x;particle.y=r.y;particle.rotation=r.angle||0;
      particle.scaleX=size/128;particle.scaleY=size*1.5/128;
      particle.alpha=alpha;
      particle.tint=visualTint;
      bulk++;
     }
    }
    // Never edits trajectory, collision, position or count: this is a
    // purely visual geometric interpretation of already-computed records.
    paintFormations();
    for(let i=heroUsed;i<spritePool.length;i++)spritePool[i].visible=false;
    for(const group of bulkGroups)if(group)for(let i=group.used;i<group.pool.length;i++)group.pool[i].alpha=0;
    align();app.render();
    state.drawn=state.records.length;state.details=detailed;state.bulk=bulk;
    state.records.length=0;
   }catch(err){console.error("Wandrune Pixi overlay failed; keeping gameplay intact",err);disable(err?.message||err);}
  }
  function destroy(){
   disposed=true;disable();
   try{app?.destroy(true,{children:true,texture:false,textureSource:false});}catch(_){}
   app=null;world=null;shapeLayer=null;shapeGraphics=null;bulkGroups=[];spritePool=[];state.ready=false;
  }
  return Object.assign(state,{enable,disable,begin,paint,end,destroy,align,setLook,ratio:DETAIL_RATIO,version:VERSION});
 }
 return Object.freeze({VERSION,CDN,loadPixi,wantPixi,classify,createBridge});
});