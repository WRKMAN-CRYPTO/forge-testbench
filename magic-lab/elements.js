/* WRKMAN ELEMENTAL WORLD / 019
 * Matter is authoritative for bodies. This layer carries local temperature,
 * liquid water, ice, and moving vapor without checking spell-combo names.
 * Fixed finite budgets; no random numbers, persistent writes, networking,
 * dynamic code, or Spell-Language integration.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_ELEMENTS=api;
})(typeof globalThis==="object"?globalThis:null,function(){
 "use strict";
 const WORLD={left:90,right:870,top:90,bottom:510};
 const MAX_CLOUDS=14,MAX_FLASHES=14,MAX_BODIES=80;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const inside=(p,f,r)=>f&&dist(p,f)<(r??f.r??0);
 const waterFor=tag=>tag==="enemy"?.67:tag==="dummy"?.62:tag==="crate"?.38:tag==="pillar"?.30:tag==="debris"?.16:.24;
 function reset(s){
  s.elementWorld={states:new Map(),clouds:[],flashes:[],
   nextCloud:0,steamCount:0,discharges:0,iceCount:0};
  return s.elementWorld;
 }
 function stateFor(world,body){
  let m=world.states.get(body);
  if(!m){
   m={temperature:20,liquid:waterFor(body.gameTag),ice:0,steamReserve:0};
   world.states.set(body,m);
  }
  return m;
 }
 function emitCloud(world,x,y,mass,vx,vy,time){
  if(mass<=.01)return null;
  // Similar nearby parcels merge into one advected humidity region.
  const merge=world.clouds.find(c=>dist(c,{x,y})<Math.min(44,c.radius*.56)&&c.mass<2.5);
  if(merge){
   const total=merge.mass+mass;
   merge.x=(merge.x*merge.mass+x*mass)/total;
   merge.y=(merge.y*merge.mass+y*mass)/total;
   merge.vx=(merge.vx*merge.mass+vx*mass)/total;
   merge.vy=(merge.vy*merge.mass+vy*mass)/total;
   merge.mass=clamp(total,0,2.6);
   merge.heat=clamp((merge.heat+94)*.5,42,130);
   merge.until=Math.max(merge.until,time+3500);
   merge.radius=clamp(26+merge.mass*47,26,133);
   return merge;
  }
  // Evict by age rather than expanding without limit on phones.
  if(world.clouds.length>=MAX_CLOUDS)world.clouds.shift();
  const cloud={id:++world.nextCloud,x:clamp(x,WORLD.left,WORLD.right),
   y:clamp(y,WORLD.top,WORLD.bottom),vx,vy,mass,heat:94,
   born:time,until:time+4900,radius:clamp(26+mass*47,26,133),
   chargedUntil:0,nextScald:time+400};
  world.clouds.push(cloud);world.steamCount++;
  return cloud;
 }
 function step(s,time,delta,combat){
  const w=s.elementWorld||reset(s);
  // Simulate at most 50ms per frame; pause/resume doesn't fast-forward matter.
  const dt=clamp(Number(delta)||0,0,50)/1000;
  const active=new Set(),actors=(s.actors||[]).slice(0,MAX_BODIES);
  const cold=s.frosts||[],hot=s.combat?.fields||[];
  for(const a of actors){
   const b=a.body;
   if(!b||!b.position||b.labAlive===false)continue;
   active.add(b);
   const m=stateFor(w,b),p=b.position;
   const chill=cold.some(f=>inside(p,f)),heat=hot.some(f=>inside(p,f));
   // Temperature is a state variable; fields supply energy, not recipes.
   m.temperature+=((20-m.temperature)*.16+(heat?155:0)-(chill?104:0))*dt;
   m.temperature=clamp(m.temperature,-65,150);
   if(chill)m.liquid=clamp(m.liquid+dt*.22,0,1.4); // frost deposits moisture
   if(m.temperature< -7&&m.liquid>0){
    const transfer=Math.min(m.liquid,dt*(Math.abs(m.temperature)+7)*.044);
    m.liquid-=transfer;m.ice=clamp(m.ice+transfer,0,1.65);
   }
   if(m.temperature>5&&m.ice>0){
    const melt=Math.min(m.ice,dt*(m.temperature-5)*.060);
    m.ice-=melt;m.liquid=clamp(m.liquid+melt,0,1.6);
   }
   if(m.temperature>58&&m.liquid>0){
    const evaporate=Math.min(m.liquid,dt*(m.temperature-58)*.043);
    m.liquid-=evaporate;m.steamReserve+=evaporate;
    if(m.steamReserve>=.13){
     const amount=m.steamReserve;m.steamReserve=0;
     emitCloud(w,p.x,p.y-10,amount,
      clamp((b.velocity?.x||0)*.45,-4,4),clamp((b.velocity?.y||0)*.30-.3,-3,3),time);
    }
   }
   // Freeze changes momentum and AI intent, but cannot teleport the body.
   if(m.ice>.24){
    if(a.type&&a.alive) a.staggerUntil=Math.max(a.staggerUntil||0,time+65);
    if(!b.isStatic&&b.velocity){
     const damp=clamp(1-m.ice*.12, .74,.98);
     const bodyApi=s.matter?.world?.engine?.world?null:null;
     // Existing Matter Body method, not a new physics integration.
     const Body=typeof Phaser!=="undefined"?Phaser.Physics?.Matter?.Matter?.Body:null;
     if(Body?.setVelocity)Body.setVelocity(b,{x:b.velocity.x*damp,y:b.velocity.y*damp});
    }
   }
  }
  // Stale body state may not accumulate across multiple arena resets.
  for(const b of w.states.keys())if(!active.has(b))w.states.delete(b);
  let scaldHits=0;
  for(const c of w.clouds){
   const lifeLeft=c.until-time;
   if(lifeLeft<=0)continue;
   c.x=clamp(c.x+c.vx*dt*33,WORLD.left,WORLD.right);
   c.y=clamp(c.y+c.vy*dt*33-dt*7,WORLD.top,WORLD.bottom);
   c.vx*=Math.pow(.94,dt*60);c.vy*=Math.pow(.94,dt*60);
   const pull=(s.wells||[]).find(f=>inside(c,f, f.r+40));
   if(pull){
    const d=Math.max(25,dist(c,pull)),p=.8*(1-d/(pull.r+50));
    c.vx+=(pull.x-c.x)/d*p*dt*45;
    c.vy+=(pull.y-c.y)/d*p*dt*45;
   }
   c.heat+=(20-c.heat)*dt*.075;
   c.radius=clamp(26+c.mass*47+(time-c.born)*.0025,26,145);
   if(c.heat>63&&time>=c.nextScald&&combat&&scaldHits<10){
    c.nextScald=time+370;
    for(const e of (s.combat?.enemies||[])){
     if(!e.alive||!inside(e.body.position,c,c.radius))continue;
     const damage=clamp((c.heat-50)*.05,1,4)*clamp(c.mass,.4,1.2);
     combat.hitEnemy(s,e,damage,"hot vapor");
     scaldHits++;if(scaldHits>=10)break;
    }
   }
  }
  w.clouds=w.clouds.filter(c=>time<c.until);
  w.flashes=w.flashes.filter(f=>time<f.until);
  w.iceCount=actors.filter(a=>a.body&&w.states.get(a.body)?.ice>.24).length;
 }
 function impulse(s,x,y,energy=100){
  const w=s.elementWorld;if(!w)return;
  const radius=clamp(90+energy*.8,90,240);
  for(const c of w.clouds){
   const d=Math.max(16,Math.hypot(c.x-x,c.y-y));
   if(d>radius+c.radius)continue;
   const kick=(1-d/(radius+c.radius))*energy*.033;
   c.vx+=(c.x-x)/d*kick;
   c.vy+=(c.y-y)/d*kick;
  }
 }
 function discharge(s,x,y,combat){
  const w=s.elementWorld||reset(s),now=s.time?.now||0;
  const near=w.clouds.filter(c=>dist(c,{x,y})<=c.radius+30&&c.mass>=.12)
   .sort((a,b)=>dist(a,{x,y})-dist(b,{x,y}));
  const touched=[],visited=new Set();
  if(near.length){
   const queue=[near[0]];
   while(queue.length&&touched.length<6){
    const c=queue.shift();if(visited.has(c.id))continue;
    visited.add(c.id);touched.push(c);
    for(const other of w.clouds){
     if(visited.has(other.id)||other.mass<.12)continue;
     // Damp, overlapping regions can conduct; dry air gaps cannot.
     if(dist(c,other)<(c.radius+other.radius)*.84)queue.push(other);
    }
   }
  }
  const bubbles=touched.length?touched.map(c=>({x:c.x,y:c.y,r:clamp(c.radius+26,55,160)})):
   [{x:clamp(x,WORLD.left,WORLD.right),y:clamp(y,WORLD.top,WORLD.bottom),r:36}];
  let hits=0;
  const struck=new Set();
  for(const c of touched)c.chargedUntil=now+500;
  for(const b of bubbles){
   if(w.flashes.length>=MAX_FLASHES)w.flashes.shift();
   w.flashes.push({x:b.x,y:b.y,r:b.r,born:now,until:now+550,wet:touched.length>0});
   for(const e of s.combat?.enemies||[]){
    if(!e.alive||struck.has(e)||!inside(e.body.position,b,b.r+e.r*.5))continue;
    struck.add(e);
    const material=w.states.get(e.body),wetness=material?material.liquid+material.ice:0;
    const base=touched.length?17:7;
    if(combat)combat.hitEnemy(s,e,base*(1+clamp(wetness,0,1)*.40),"electric arc");
    hits++;
    const Body=typeof Phaser!=="undefined"?Phaser.Physics?.Matter?.Matter?.Body:null;
    const p=e.body.position,d=Math.max(12,dist(p,b));
    if(Body?.applyForce)Body.applyForce(e.body,p,{x:(p.x-b.x)/d*.003*e.body.mass,y:(p.y-b.y)/d*.003*e.body.mass});
   }
  }
  w.discharges++;
  return {vapor:touched.length,hits,radius:Math.max(...bubbles.map(b=>b.r))};
 }
 function paint(s,g,time){
  const w=s.elementWorld;if(!w)return;
  for(const c of w.clouds){
   const opacity=clamp((c.until-time)/1000,0,1)*clamp(c.mass*.65,.16,.52);
   const hot=clamp((c.heat-20)/90,0,1);
   g.fillStyle(hot>.4?0xbce7ed:0x90b6c4,opacity*.20);
   g.fillCircle(c.x,c.y,c.radius);
   g.lineStyle(1.4,hot>.4?0xe9fbff:0x93c4ce,opacity*.55);
   g.strokeCircle(c.x,c.y,c.radius*.88);
   for(let i=0;i<6;i++){
    const a=i*2.39996+c.id*.47+time*.0002;
    const d=c.radius*(.25+(i%3)*.23);
    g.fillStyle(i%2?0xb5e3f2:0xecfaff,opacity*.26);
    g.fillCircle(c.x+Math.cos(a)*d,c.y+Math.sin(a)*d,7+(i%3)*3);
   }
  }
  // Frost crystals are visual evidence of local stored ice, independent of
  // which spell deposited the temperature.
  for(const a of s.actors||[]){
   const b=a.body,m=b&&w.states.get(b);
   if(!m||m.ice<.24||!b.position||b.labAlive===false)continue;
   const r=clamp(16+m.ice*18,18,34),x=b.position.x,y=b.position.y;
   g.lineStyle(2,0xa6eaff,clamp(m.ice*.6,.2,.75));
   for(let i=0;i<4;i++){
    const angle=i*Math.PI/2+.25;
    g.lineBetween(x+Math.cos(angle)*r*.64,y+Math.sin(angle)*r*.64,
     x+Math.cos(angle)*r,y+Math.sin(angle)*r);
   }
  }
  for(const f of w.flashes){
   const fade=clamp((f.until-time)/550,0,1),p=1-fade;
   const r=f.r*(.35+p*.68);
   g.fillStyle(0x65bbff,fade*.12);g.fillCircle(f.x,f.y,r);
   g.lineStyle(4*fade+1,0xb8f3ff,.90*fade);g.strokeCircle(f.x,f.y,r);
   for(let i=0;i<10;i++){
    const a=i*Math.PI/5+f.x*.005,inner=r*.22,outer=r*(.75+(i%3)*.1);
    g.lineStyle(1.3+fade*2,i%2?0x80daff:0xedffff,fade*.88);
    g.lineBetween(f.x+Math.cos(a)*inner,f.y+Math.sin(a)*inner,
     f.x+Math.cos(a+.11*(i%2?1:-1))*outer,
     f.y+Math.sin(a+.11*(i%2?1:-1))*outer);
   }
  }
 }
 function snapshot(s){
  const w=s.elementWorld;if(!w)return {clouds:0,frozen:0,arcs:0};
  return {clouds:w.clouds.length,frozen:w.iceCount,arcs:w.discharges,
   volume:Number(w.clouds.reduce((n,c)=>n+c.mass,0).toFixed(2))};
 }
 return Object.freeze({reset,step,impulse,discharge,paint,snapshot,
  MAX_CLOUDS,MAX_FLASHES,MAX_BODIES});
});
