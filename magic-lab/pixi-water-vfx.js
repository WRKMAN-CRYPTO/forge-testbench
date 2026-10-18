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
 const VERSION="091b-water-trailing-motion",SIDE=64;
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
  // 091b: device feedback established the visible forward axis is inverted.
  // We correct it in the visual pose, not world vectors or spell physics.
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
 function smoothstep(a,b,v){
  const t=clamp((v-a)/(b-a),0,1);
  return t*t*(3-2*t);
 }
 // Dedicated renderer history. Keys contain both cast and agent to avoid
 // conflating overlapping spells. History cannot change spell state.
 function makeMotionTracker(){
  const history=new Map();
  let frame=0;
  const keyOf=r=>Number.isInteger(r?.castIndex)&&r.castIndex>=0&&
   Number.isInteger(r?.agentIndex)&&r.agentIndex>=0?
    r.castIndex+":"+r.agentIndex:null;
  function beginFrame(){
   frame++;
   if(frame%24===0)for(const [key,h] of history)
    if(frame-h.frame>45)history.delete(key);
  }
  function sample(r){
   const key=keyOf(r),x=Number(r?.x),y=Number(r?.y),time=Number(r?.time);
   const neutral={speed:0,influence:0,valid:false};
   if(key===null||!finite(x)||!finite(y)||!finite(time))return neutral;
   const seed=Number(r.seed)||0;
   let h=history.get(key);
   if(!h||h.seed!==seed||time<h.time||time-h.time>220){
    history.set(key,{x,y,time,seed,speed:0,frame});
    return neutral;
   }
   if(time<=h.time){h.frame=frame;return {speed:h.speed,
    influence:smoothstep(35,240,h.speed),valid:h.speed>=45};}
   const dt=time-h.time,dist=Math.hypot(x-h.x,y-h.y);
   // Teleporting and cast resets must never produce giant water needles.
   const instantaneous=dist>100?0:Math.min(1200,dist*1000/dt);
   const ease=clamp(dt/(dt+36),0,1);
   const speed=h.speed+(instantaneous-h.speed)*ease;
   h.x=x;h.y=y;h.time=time;h.frame=frame;h.speed=speed;
   return {speed,influence:smoothstep(35,240,speed),valid:dist<=100&&speed>=45};
  }
  function reset(){history.clear();frame=0;}
  return {beginFrame,sample,reset,get size(){return history.size;}};
 }
 function dropPose(r,size,motion){
  const t=finite(r?.time)?r.time*.001:0;
  const seed=(Number(r?.seed)||0)*.69+(Number(r?.agentIndex)||0)*.11;
  const pulse=Math.sin(t*7.4+seed),sway=Math.sin(t*5.1+seed*1.9);
  const angle=finite(r?.angle)?r.angle:0;
  const stretch=clamp(Number(motion?.influence)||0,0,1);
  return {
   width:size*(.77+.045*pulse)*(1-.18*stretch),
   height:size*(1.19+.065*pulse)*(1+.52*stretch),
   // Screen-space correction is exactly PI from Pass 091.
   // The tip now visually LEADS; its broad tail drags behind velocity.
   rotation:angle-Math.PI/2+sway*.045
  };
 }
 // A short, tapered wake is distinct from the longer WATER STREAMS path.
 // Draw only a few credible, moving element-2 agents; no extra particles.
 function collectSmears(samples,opts={}){
  const limit=clamp(Math.floor(opts.maxSmears??72),0,100);
  const eligible=(samples||[]).filter(s=>s?.record?.element===2&&
   s.record.alpha>.035&&s.motion?.valid&&s.motion.influence>.12&&
   finite(s.record.x)&&finite(s.record.y)&&finite(s.record.angle));
  const stride=Math.max(1,Math.ceil(eligible.length/Math.max(1,limit)));
  const out=[];
  for(let i=0;i<eligible.length&&out.length<limit;i+=stride){
   const {record:r,motion:m}=eligible[i];
   const ux=Math.cos(r.angle),uy=Math.sin(r.angle);
   const length=clamp(3+23*m.influence,4,26);
   const width=clamp((Number(r.r)||2)*1.15,1.4,7);
   out.push({x:r.x,y:r.y,
    tailX:r.x-ux*length,tailY:r.y-uy*length,
    width,length,alpha:clamp(r.alpha,0,1)*clamp(.24+.50*m.influence,0,.74),
    castIndex:r.castIndex,agentIndex:r.agentIndex});
  }
  return out;
 }
 function drawSmears(g,smears){
  if(!g)return 0;
  let drawn=0;
  for(const s of smears||[]){
   if(s.alpha<=.001)continue;
   // Taper to a pinpoint at the old position so the wake never
   // looks like another detached agent or a cyan rocket exhaust.
   g.moveTo(s.tailX,s.tailY);
   g.lineTo(s.x,s.y);
   g.stroke({width:s.width,color:0x5ebde7,alpha:.18*s.alpha,
    cap:"round",join:"round"});
   g.moveTo(s.tailX+(s.x-s.tailX)*.35,s.tailY+(s.y-s.tailY)*.35);
   g.lineTo(s.x,s.y);
   g.stroke({width:s.width*.38,color:0xe4faff,alpha:.21*s.alpha,
    cap:"round",join:"round"});
   drawn++;
  }
  return drawn;
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
 return Object.freeze({VERSION,SIDE,makeDropTexture,makeMotionTracker,dropPose,collectSmears,drawSmears,validTrail,collectStreams,drawStreams});
});
