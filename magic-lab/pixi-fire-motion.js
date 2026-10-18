/* WANDRUNE 088 | MOTION-ALIGNED FLAMES
 * Renderer-only memory of positions and presentation headings.
 * Never modifies world coordinates, physics velocity, cast records, or lifespan.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_FIRE_MOTION=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="088-motion-aligned-flames",PI=Math.PI,TWO_PI=PI*2;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
 function interpolateAngle(start,target,weight){
  return wrap(start+wrap(target-start)*clamp(weight,0,1));
 }
 function smoothstep(a,b,v){
  const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);
 }
 // Each draw submits fresh *references* to the original visual records;
 // never copies or edits any physics agent.
 function countNearbyFire(records){
  const grid=new Map(),out=new WeakMap(),size=28;
  const fire=[];
  for(const r of records||[]){
   if(!r||r.element!==1||!Number.isInteger(r.castIndex)||r.castIndex<0||
      !(r.alpha>.001)||!Number.isFinite(r.x)||!Number.isFinite(r.y))continue;
   const cx=Math.floor(r.x/size),cy=Math.floor(r.y/size);
   const key=r.castIndex+":"+cx+":"+cy;
   if(!grid.has(key))grid.set(key,[]);
   grid.get(key).push(r);
   fire.push([r,cx,cy]);
  }
  for(const [r,cx,cy] of fire){
   let nearby=0;
   for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const bucket=grid.get(r.castIndex+":"+(cx+ox)+":"+(cy+oy));
    if(!bucket)continue;
    for(const b of bucket){
     if(b===r)continue;
     const dx=r.x-b.x,dy=r.y-b.y;
     if(dx*dx+dy*dy<24*24){nearby++;if(nearby>=8)break;}
    }
    if(nearby>=8)break;
   }
   out.set(r,nearby);
  }
  return out;
 }
 function makeTracker(){
  const tracks=new Map();
  let frame=0;
  const keyOf=r=>Number.isInteger(r.castIndex)&&r.castIndex>=0&&
   Number.isInteger(r.agentIndex)&&r.agentIndex>=0?
    r.castIndex+":"+r.agentIndex:null;
  function beginFrame(){
   frame++;
   // Ignore old casts/occluded agents. No global rendering limit or
   // per-cast agent cap: this is only a stale *visual-history* cleanup.
   if(frame%24===0)for(const [key,item] of tracks)
    if(frame-item.frame>45)tracks.delete(key);
  }
  function sample(r,neighbors=0,idleAngle=0){
   const key=keyOf(r),t=Number(r?.time),x=Number(r?.x),y=Number(r?.y);
   const neutral={rotation:idleAngle,stretch:1,width:1,influence:0,speed:0,
    neighbors:neighbors||0,aligned:false};
   if(key===null||!Number.isFinite(t)||!Number.isFinite(x)||!Number.isFinite(y))
    return neutral;
   const seed=Number(r.seed)||0;
   let old=tracks.get(key);
   if(!old||old.seed!==seed||t-old.t>180||t<old.t){
    tracks.set(key,{seed,t,x,y,angle:idleAngle,speed:0,heading:idleAngle,
     frame});
    return neutral;
   }
   const dt=t-old.t;
   if(dt<=0){old.frame=frame;return{
    ...neutral,rotation:old.angle,speed:old.speed,
    neighbors};}
   const dx=x-old.x,dy=y-old.y,dist=Math.hypot(dx,dy);
   const measured=dist>95?0:dist*1000/dt;
   // Frame-rate independent easing, no velocity noise from subpixel drift.
   const response=clamp(dt/(dt+38),0,1);
   const speed=old.speed+(Math.min(1200,measured)-old.speed)*response;
   let heading=old.heading;
   if(dist>.10&&dist<=95)heading=Math.atan2(dy,dx)+PI/2;
   // Dense material is allowed to billow rather than looking like arrows.
   const crowd=clamp(Number(neighbors)||0,0,8);
   const spacing=crowd<=1?1:1-.79*smoothstep(1,7,crowd);
   const influence=smoothstep(24,225,speed)*spacing;
   const target=interpolateAngle(idleAngle,heading+idleAngle*.16,influence);
   const turnResponse=clamp(dt/(dt+(influence>.5?30:65)),0,1);
   const rotation=interpolateAngle(old.angle,target,turnResponse);
   old.t=t;old.x=x;old.y=y;old.frame=frame;
   old.speed=speed;old.heading=heading;old.angle=rotation;
   return {rotation,stretch:1+.39*influence,width:1-.12*influence,
    influence,speed,neighbors:crowd,aligned:influence>.12};
  }
  function reset(){tracks.clear();frame=0;}
  return {beginFrame,sample,reset,get size(){return tracks.size;}};
 }
 return Object.freeze({VERSION,interpolateAngle,smoothstep,countNearbyFire,makeTracker});
});
