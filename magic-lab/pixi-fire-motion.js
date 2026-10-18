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
 const VERSION="088b-direction-lock",PI=Math.PI;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
 function interpolateAngle(start,target,weight){
  return wrap(start+wrap(target-start)*clamp(weight,0,1));
 }
 function smoothstep(a,b,v){
  const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);
 }
 // Last meaningful world-space trail segment is preferred over noisy
 // frame-to-frame displacement. The source already passes trail coordinates
 // from physics; here they are READ ONLY. Ignore the most recent point if it
 // happens to coincide with the current agent position.
 function trailHeading(r){
  const trail=r?.trail;
  if(!Array.isArray(trail)||trail.length===0)return null;
  for(let i=trail.length-1;i>=0;i--){
   const p=trail[i];
   if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
   const dx=r.x-p.x,dy=r.y-p.y,dist=Math.hypot(dx,dy);
   if(dist>=1.1&&dist<=90)return {dx,dy,dist,angle:Math.atan2(dy,dx)+PI/2};
  }
  return null;
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
    const path=trailHeading(r);
    const angle=path?wrap(path.angle+idleAngle*.03):idleAngle;
    tracks.set(key,{seed,t,x,y,angle,speed:0,heading:path?.angle??idleAngle,
     frame});
    return {...neutral,rotation:angle,aligned:!!path};
   }
   const dt=t-old.t;
   if(dt<=0){old.frame=frame;return{
    ...neutral,rotation:old.angle,speed:old.speed,
    neighbors};}
   const dx=x-old.x,dy=y-old.y,dist=Math.hypot(dx,dy);
   const measured=dist>95?0:dist*1000/dt;
   // Use true scene elapsed time. The visual heading gets its own smoothing;
   // only the stretch/width responds to measured speed, never to art wobble.
   const response=clamp(dt/(dt+32),0,1);
   const speed=old.speed+(Math.min(1200,measured)-old.speed)*response;
   const path=trailHeading(r);
   const measuredValid=dist>=.45&&dist<=95;
   let heading=old.heading;
   if(path){
    heading=path.angle;
    // During reversals, a three-frame-old path can be stale. Use current
    // displacement when its vector clearly disagrees with the recent trail.
    if(measuredValid&&(dx*path.dx+dy*path.dy)/(dist*path.dist)<.35)
     heading=Math.atan2(dy,dx)+PI/2;
   }else if(measuredValid)heading=Math.atan2(dy,dx)+PI/2;
   // Most important correction: speed LOCKS orientation, not just a gentle
   // nudge from idle. Even a mid-speed moving agent must visibly face travel.
   // Density damps *stretch* and body deformation, not heading accuracy.
   const crowd=clamp(Number(neighbors)||0,0,8);
   const spacing=crowd<=1?1:1-.79*smoothstep(1,7,crowd);
   const influence=smoothstep(24,225,speed)*spacing;
   const hasDirection=(path!==null||measuredValid)&&dist<=95;
   const lock=smoothstep(5,38,speed)*(hasDirection?1:.82);
   const target=interpolateAngle(idleAngle,heading+idleAngle*.035,lock);
   // 12ms angular lag for confident motion; slower relaxation at rest.
   const turnResponse=clamp(dt/(dt+(lock>.5?12:42)),0,1);
   const rotation=interpolateAngle(old.angle,target,turnResponse);
   old.t=t;old.x=x;old.y=y;old.frame=frame;
   old.speed=speed;old.heading=heading;old.angle=rotation;
   return {rotation,stretch:1+.39*influence,width:1-.12*influence,
    influence,speed,neighbors:crowd,aligned:lock>.6};
  }
  function reset(){tracks.clear();frame=0;}
  return {beginFrame,sample,reset,get size(){return tracks.size;}};
 }
 return Object.freeze({VERSION,interpolateAngle,smoothstep,trailHeading,countNearbyFire,makeTracker});
});
