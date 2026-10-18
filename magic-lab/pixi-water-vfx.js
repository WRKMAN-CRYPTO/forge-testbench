/* WANDRUNE 091 | WATER LAB | isolated, rendering-only VFX.
 * Reuse element-2 agents, world-space trails and preexisting Pixi batching.
 * No fluid simulation, new agents, collisions, cast logic or game edits.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_WATER_VFX=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="091-liquid-droplets-and-streams",SIDE=64;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:a));
 const finite=x=>typeof x==="number"&&Number.isFinite(x);
 function makeDropTexture(win,P,source,variant=0){
  const canvas=win?.document?.createElement?.("canvas");
  if(!canvas)return null;
  canvas.width=canvas.height=SIDE;
  const g=canvas.getContext?.("2d");
  if(!g)return null;
  const v=((variant%3)+3)%3;
  g.clearRect(0,0,SIDE,SIDE);
  g.save();
  g.translate(32,32);g.rotate([-0.06,0,.07][v]);g.translate(-32,-32);
  // Thin blue caustic haze instead of additive fire-orange bloom.
  const halo=g.createRadialGradient(32,38,4,32,38,28);
  halo.addColorStop(0,"rgba(50,172,225,.20)");
  halo.addColorStop(.6,"rgba(60,181,231,.10)");
  halo.addColorStop(1,"rgba(32,149,227,0)");
  g.fillStyle=halo;g.fillRect(3,6,58,56);
  // Authored point is UP at (32,8); rounded water volume hangs behind.
  // A clockwise +90-degree rotation therefore faces a rightward velocity.
  const body=g.createLinearGradient(20,9,45,59);
  body.addColorStop(0,"rgba(208,250,255,.85)");
  body.addColorStop(.32,"rgba(57,190,228,.68)");
  body.addColorStop(.72,"rgba(30,133,193,.79)");
  body.addColorStop(1,"rgba(96,210,245,.50)");
  g.fillStyle=body;g.beginPath();
  g.moveTo(32,8);
  g.bezierCurveTo(38,22,49,33,48,43);
  g.bezierCurveTo(47,57,40,59,31,58);
  g.bezierCurveTo(19,59,14,52,17,43);
  g.bezierCurveTo(19,31,26,18,32,8);
  g.closePath();g.fill();
  // Glass-like edge rim, transparent core, a few clipped specular glints.
  g.strokeStyle="rgba(187,247,255,.62)";g.lineWidth=1.8;g.stroke();
  g.fillStyle="rgba(240,255,255,.70)";
  g.beginPath();g.ellipse(25,39,4.2,10,-.2,0,Math.PI*2);g.fill();
  g.fillStyle="rgba(235,255,255,.60)";
  g.beginPath();g.ellipse(37,49,2.1,4.2,.36,0,Math.PI*2);g.fill();
  // The canonical water atlas contributes pearlescent detail, once per
  // cached variant and never once per frame.
  if(source&&typeof g.drawImage==="function"){
   g.save();g.globalAlpha=.17;
   try{g.drawImage(source,25,38,17,17);}catch(_){}
   g.restore();
  }
  g.restore();
  return P.Texture.from(canvas);
 }
 function dropPose(r,size){
  const t=finite(r?.time)?r.time*.001:0;
  const seed=(Number(r?.seed)||0)*.69+(Number(r?.agentIndex)||0)*.11;
  const pulse=Math.sin(t*7.4+seed),sway=Math.sin(t*5.1+seed*1.9);
  const angle=finite(r?.angle)?r.angle:0;
  return {
   width:size*(.77+.045*pulse),
   height:size*(1.19+.065*pulse),
   rotation:angle+Math.PI/2+sway*.045
  };
 }
 function validTrail(r){
  if(!r||r.element!==2||!(r.alpha>.03)||!finite(r.x)||!finite(r.y)||
     !Array.isArray(r.trail)||r.trail.length<1)return null;
  const pts=[];
  // Existing path points are already world-space; no interpolation physics.
  for(let i=Math.max(0,r.trail.length-5);i<r.trail.length;i++){
   const p=r.trail[i];
   if(p&&finite(p.x)&&finite(p.y)){
    if(!pts.length||Math.hypot(p.x-pts.at(-1).x,p.y-pts.at(-1).y)>.6)
     pts.push({x:p.x,y:p.y});
   }
  }
  if(!pts.length)return null;
  const end={x:r.x,y:r.y};
  if(Math.hypot(end.x-pts.at(-1).x,end.y-pts.at(-1).y)>.6)pts.push(end);
  if(pts.length<2)return null;
  let length=0;
  for(let i=1;i<pts.length;i++)length+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  // Reject teleports and negligible 1-frame noise.
  if(length<2.4||length>165)return null;
  return {points:pts,length,radius:clamp(Number(r.r)||2,1,14),
   alpha:clamp(r.alpha,0,1),castIndex:r.castIndex,agentIndex:r.agentIndex};
 }
 function collectStreams(records,opts={}){
  const cap=clamp(Math.floor(opts.maxStreams??64),0,96);
  const water=(records||[]).filter(r=>r?.element===2&&r.alpha>.03);
  const stride=Math.max(1,Math.ceil(water.length/Math.max(1,cap)));
  const streams=[];
  for(let i=0;i<water.length&&streams.length<cap;i+=stride){
   const p=validTrail(water[i]);if(p)streams.push(p);
  }
  return streams;
 }
 function drawStreams(g,streams){
  if(!g)return 0;
  let count=0;
  for(const s of streams||[]){
   const pts=s.points;
   if(pts.length<2)continue;
   const main=clamp(s.radius*1.4,2.3,12),a=s.alpha;
   // Two related strokes give one watery volume and refractive glint.
   // No extra particles, no links between different agents or casts.
   for(const band of [
    {width:main*1.7,color:0x267fbc,alpha:.14*a},
    {width:main*.64,color:0xbdefff,alpha:.31*a}
   ]){
    g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.stroke({color:band.color,alpha:band.alpha,width:band.width,
     cap:"round",join:"round"});
   }
   count++;
  }
  return count;
 }
 return Object.freeze({VERSION,SIDE,makeDropTexture,dropPose,validTrail,collectStreams,drawStreams});
});
