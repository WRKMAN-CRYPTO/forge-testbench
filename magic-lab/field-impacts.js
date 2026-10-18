/* WRKMAN Arcane Lab 050 / Mass-aware Rune Solid Agent Contacts
 * Continuous swept-circle impacts. A lightweight game collision layer,
 * separate from the canonical Agent Field physical laws.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_FIELD_IMPACTS=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const CELL=96,KEY_ORIGIN=65536,KEY_SPAN=131072;
 const Runes=typeof globalThis==='object'?globalThis.WRKMAN_SWARM_RUNES:null;
 const SIZE=typeof globalThis==='object'?globalThis.WRKMAN_AGENT_SIZING:null;
 const doubledHitRadius=r=>SIZE?.hitRadius?SIZE.hitRadius(r):r*2;
 const sizeSearchPad=hasRunes=>SIZE?.searchPadding?SIZE.searchPadding(hasRunes):(hasRunes?96:6);
 const Presence=typeof globalThis==='object'?globalThis.WRKMAN_SPELL_PRESENCE:null;
 const key=(x,y)=>(x+KEY_ORIGIN)*KEY_SPAN+(y+KEY_ORIGIN);
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
 function process(scene,cast,time,Combat,fromCenter){
  cast.impactFX=cast.impactFX||[];
  cast.impactFX=cast.impactFX.filter(f=>time-f.born<300);
  if(!Combat)return 0;
  const all=targets(scene,cast);
  const maxPad=sizeSearchPad(!!(Runes&&cast.runeCount));
  if(!all.length)return 0;
  const grid=new Map();let gridMinX=Infinity,gridMinY=Infinity,gridMaxX=-Infinity,gridMaxY=-Infinity;
  for(const t of all){
   const r=t.r+maxPad; // only broaden the search for rune-enabled casts
   const x0=Math.floor((Math.min(t.from.x,t.to.x)-r)/CELL);
   const x1=Math.floor((Math.max(t.from.x,t.to.x)+r)/CELL);
   const y0=Math.floor((Math.min(t.from.y,t.to.y)-r)/CELL);
   const y1=Math.floor((Math.max(t.from.y,t.to.y)+r)/CELL);
   gridMinX=Math.min(gridMinX,x0);gridMaxX=Math.max(gridMaxX,x1);
   gridMinY=Math.min(gridMinY,y0);gridMaxY=Math.max(gridMaxY,y1);
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const bin=key(x,y),bucket=grid.get(bin);
    if(bucket)bucket.push(t);else grid.set(bin,[t]);
   }
  }
  const agents=cast.agents;
  const world=cast.delivery==='world';
  const originX=world?cast.spawnX:.5,originY=world?cast.spawnY:.5;
  const xx=world?cast.right.x*cast.worldW:cast.scale;
  const yx=world?cast.forward.x*cast.worldH:0;
  const xy=world?cast.right.y*cast.worldW:0;
  const yy=world?cast.forward.y*cast.worldH:cast.scale;
  let remaining=0,seq=0,consumed=0,spentMass=0;
  for(let i=0;i<agents.length;i++){
   const a=agents[i];
   const bx=a.prevX-originX,by=a.prevY-originY;
   const fx=a.x-originX,fy=a.y-originY;
   const ax=fromCenter.x+bx*xx+by*yx,ay=fromCenter.y+bx*xy+by*yy;
   const tx=cast.center.x+fx*xx+fy*yx,ty=cast.center.y+fx*xy+fy*yy;
   const x0=Math.floor(Math.min(ax,tx)/CELL);
   const x1=Math.floor(Math.max(ax,tx)/CELL);
   const y0=Math.floor(Math.min(ay,ty)/CELL);
   const y1=Math.floor(Math.max(ay,ty)/CELL);
   if(x1<gridMinX||x0>gridMaxX||y1<gridMinY||y0>gridMaxY){agents[remaining++]=a;continue}
   const stamp=++seq;
   let first=null,earliest=Infinity;
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const bucket=grid.get(key(x,y));
    if(!bucket)continue;
    for(const t of bucket){
     if(t.seen===stamp)continue;t.seen=stamp;
     if((a.phaseUntil||0)>time&&t.kind!=='enemy')continue;
     const hit=sweep(ax,ay,tx,ty,
      t.from.x,t.from.y,t.to.x,t.to.y,t.r+doubledHitRadius(Runes?Runes.radius(a):3));
     if(hit!==null&&hit<earliest){earliest=hit;first=t}
    }
   }
   if(!first){agents[remaining++]=a;continue}
   first.impacts++;consumed++;
   const weight=Runes?Runes.mass(a):1;
   spentMass+=weight;
   first.massHits=(first.massHits||0)+weight;
   // Focus is energy per cast, not fabricated mass or an enlarged hitbox.
   // A single normal hex has meaningful precision impact when it connects.
   if(cast.focus?.impactBonus&&weight===1)
    first.focusHits=(first.focusHits||0)+cast.focus.impactBonus;
   if(!first.elements)first.elements=[0,0,0,0,0];
   const composition=Runes?Runes.composition(a):null;
   if(composition){for(let element=1;element<5;element++)first.elements[element]+=composition[element]}
   else if(a.element>=1&&a.element<=4)first.elements[a.element]+=weight;
   // One small impact mark per subset. Never one Phaser emitter per agent.
   if(first.impacts<=3&&cast.impactFX.length<96){
    const x=ax+(tx-ax)*earliest,y=ay+(ty-ay)*earliest;
    const color=a.element?([0,0xff6b32,0x44c9ed,0xa7d8ff,0xffe65a][a.element]||0xffa768):
      first.kind==='enemy'?0xffa768:0xe2d5b0;
    cast.impactFX.push({x,y,born:time,color});
    if(cast.focus?.focused){
     // Persist impact FX at scene scope, including when this was the last
     // live agent and the parent world cast is removed next frame.
     Presence?.accent(scene,'impact',x,y,time,color,cast.focus.population,
      Math.atan2(ty-ay,tx-ax));
     Presence?.play('impact',cast.focus.population,{
      enabled:scene.craftedAudioEnabled!==false,volume:scene.craftedAudioVolume??.65
     });
    }
   }
  }
  agents.length=remaining;
  cast.collisions=(cast.collisions||0)+consumed;
  cast.consumed=(cast.consumed||0)+consumed;
  cast.consumedMass=(cast.consumedMass||0)+spentMass;
  // Damage and visual FX are bounded per target/frame, but EVERY contacting
  // agent was already consumed regardless of these caps or hit cooldowns.
  for(const t of all){
   if(!t.impacts)continue;
   const Elements=typeof globalThis==='object'?globalThis.WRKMAN_ELEMENTS:null;
   if(t.elements&&Elements?.agentContacts){
    Elements.agentContacts(scene,t.obj.body,t.obj,t.elements,t.to.x,t.to.y,time,Combat);
   }
   if(t.kind==='enemy'&&Combat.hitEnemy)
    Combat.hitEnemy(scene,t.obj,Math.min(t.massHits>t.impacts?70:28,Math.max(2,Math.round(t.massHits*1.7))+(t.focusHits||0)),'crafted-field');
   else if(t.kind==='stone'&&Combat.damagePillar)
    Combat.damagePillar(scene,t.obj,Math.min(t.massHits>t.impacts?72:30,Math.max(2,Math.round(t.massHits*2))+(t.focusHits||0)),'crafted-field');
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
