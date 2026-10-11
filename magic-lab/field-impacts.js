/* WRKMAN Arcane Lab 039 / Solid Agent Contacts
 * Continuous swept-circle impacts. A lightweight game collision layer,
 * separate from the canonical Agent Field physical laws.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_FIELD_IMPACTS=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const CELL=96;
 // Relative movement catches both fast particles and moving targets.
 // Returns first intersection fraction or null.
 function sweep(ax,ay,bx,by,cx,cy,dx,dy,r){
  const x=ax-cx,y=ay-cy,vx=bx-ax-(dx-cx),vy=by-ay-(dy-cy);
  const c=x*x+y*y-r*r;if(c<=0)return 0;
  const a=vx*vx+vy*vy;if(a<1e-12)return null;
  const b=2*(x*vx+y*vy),disc=b*b-4*a*c;
  if(disc<0)return null;
  const t=(-b-Math.sqrt(disc))/(2*a);
  return t>=0&&t<=1?t:null;
 }
 function targets(scene,cast){
  const prev=cast.targetPrev||new Map(),next=new Map(),list=[];
  function add(kind,obj,key,r){
   if(obj?.alive===false||obj?.body?.labAlive===false)return;
   const p=obj?.body?.position;
   if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
   const now={x:p.x,y:p.y},old=prev.get(key);
   const from=old&&Math.hypot(now.x-old.x,now.y-old.y)<240?old:now;
   next.set(key,now);
   list.push({kind,obj,key,from,to:now,r,impacts:0,seen:0});
  }
  if(scene.combat){
   for(const e of scene.combat.enemies||[])add('enemy',e,'e'+e.id,e.r||18);
   for(const p of scene.combat.pillars||[])add('stone',p,'p'+p.id,p.r||29);
   for(const d of scene.combat.debris||[])add('debris',d,'d'+d.body?.id,d.r||9);
  }
  for(const a of scene.actors||[]){
   const tag=a?.body?.gameTag;
   if(tag==='crate'||tag==='dummy')add('solid',a,'b'+a.body.id,a.r||a.body.circleRadius||18);
  }
  cast.targetPrev=next;return list;
 }
 function process(scene,cast,time,Combat,fromCenter,project){
  cast.impactFX=cast.impactFX||[];
  cast.impactFX=cast.impactFX.filter(f=>time-f.born<300);
  if(!Combat)return 0;
  const all=targets(scene,cast);
  if(!all.length)return 0;
  const grid=new Map();
  for(const t of all){
   const r=t.r+3;
   const x0=Math.floor((Math.min(t.from.x,t.to.x)-r)/CELL);
   const x1=Math.floor((Math.max(t.from.x,t.to.x)+r)/CELL);
   const y0=Math.floor((Math.min(t.from.y,t.to.y)-r)/CELL);
   const y1=Math.floor((Math.max(t.from.y,t.to.y)+r)/CELL);
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const key=x+','+y,bucket=grid.get(key);
    if(bucket)bucket.push(t);else grid.set(key,[t]);
   }
  }
  const agents=cast.agents;
  let remaining=0,seq=0,consumed=0;
  for(let i=0;i<agents.length;i++){
   const a=agents[i];
   const before=project(cast,a,a.prevX,a.prevY,fromCenter);
   const after=project(cast,a);
   const x0=Math.floor(Math.min(before.x,after.x)/CELL);
   const x1=Math.floor(Math.max(before.x,after.x)/CELL);
   const y0=Math.floor(Math.min(before.y,after.y)/CELL);
   const y1=Math.floor(Math.max(before.y,after.y)/CELL);
   const stamp=++seq;
   let first=null,earliest=Infinity;
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const bucket=grid.get(x+','+y);
    if(!bucket)continue;
    for(const t of bucket){
     if(t.seen===stamp)continue;t.seen=stamp;
     const hit=sweep(before.x,before.y,after.x,after.y,
      t.from.x,t.from.y,t.to.x,t.to.y,t.r+3);
     if(hit!==null&&hit<earliest){earliest=hit;first=t}
    }
   }
   if(!first){agents[remaining++]=a;continue}
   first.impacts++;consumed++;
   // One small impact mark per subset. Never one Phaser emitter per agent.
   if(first.impacts<=3&&cast.impactFX.length<96){
    cast.impactFX.push({
     x:before.x+(after.x-before.x)*earliest,
     y:before.y+(after.y-before.y)*earliest,
     born:time,color:first.kind==='enemy'?0xffa768:0xe2d5b0});
   }
  }
  agents.length=remaining;
  cast.collisions=(cast.collisions||0)+consumed;
  cast.consumed=(cast.consumed||0)+consumed;
  // Damage and visual FX are bounded per target/frame, but EVERY contacting
  // agent was already consumed regardless of these caps or hit cooldowns.
  for(const t of all){
   if(!t.impacts)continue;
   if(t.kind==='enemy'&&Combat.hitEnemy)
    Combat.hitEnemy(scene,t.obj,Math.min(28,Math.max(2,Math.round(t.impacts*1.7))),'crafted-field');
   else if(t.kind==='stone'&&Combat.damagePillar)
    Combat.damagePillar(scene,t.obj,Math.min(30,Math.max(2,Math.round(t.impacts*2))),'crafted-field');
  }
  if(consumed){
   cast.free=0;cast.offscreen=0;
   for(const a of agents){
    if(a.free)cast.free++;
    if(a.x<0||a.x>=1||a.y<0||a.y>=1)cast.offscreen++;
   }
  }
  return consumed;
 }
 return Object.freeze({sweep,process});
});
