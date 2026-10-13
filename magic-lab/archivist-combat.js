/* WANDRUNE 060 | Archivist physical boss combat adapter.
 * Mind may decide and invent; only this layer is permitted to spawn projectiles.
 * The existing Matter and combat damage loops remain authoritative.
 */
(function(root,factory){
 "use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ARCHIVIST_COMBAT=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const M=typeof window!=="undefined"?window.WRKMAN_ARCHIVIST:
  typeof require==="function"?require("./archivist-mind.js"):null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const COLORS={arcane:0xcba5ff,frost:0xa7eefe,fire:0xffb76b,lightning:0xffed9f};
 function initialize(enemy,time){
  if(!M)return null;
  let storage=null;try{storage=localStorage}catch(_){}
  return M.make(storage,time);
 }
 function fire(s,e,plan,Body){
  if(!M||!e.alive||!plan||s.projectiles.length>=31)return false;
  const shots=M.planDirections(e.archivist,plan,e.body.position,s.player);
  const left=Math.min(35-s.projectiles.length,
   16-s.projectiles.filter(p=>p.body?.archive).length);
  if(left<=0)return false;
  for(let i=0;i<Math.min(shots.length,left);i++){
   const t=shots[i],dir={x:Math.cos(t),y:Math.sin(t)},p=e.body.position;
   const b=s.matter.add.circle(p.x+dir.x*47,p.y+dir.y*47,7,{
    restitution:.68,frictionAir:.002,density:.003
   });
   b.gameTag="ember";b.labAlive=true;b.owner=e.id;
   b.labBorn=s.time.now;b.labDeflected=false;
   b.archive={element:plan.element,motif:plan.motif,name:plan.name,
    damage:plan.element==="lightning"?15:plan.element==="frost"?11:13,
    color:COLORS[plan.element]};
   Body.setVelocity(b,{x:dir.x*plan.speed,y:dir.y*plan.speed});
   s.projectiles.push({body:b,born:s.time.now,trail:[]});
  }
  s.burst(e.body.position.x,e.body.position.y,COLORS[plan.element],13,4);
  s.announceCombat("THE ARCHIVIST INVENTS • "+plan.name.toUpperCase());
  return true;
 }
 function step(s,e,time,delta,Body,hitPlayer){
  if(!e.alive||!e.archivist||!M)return;
  const b=e.body,pos=b.position;
  if(time>=e.mindAt){
   e.mindAt=time+120;
   e.mindIntent=M.decide(e.archivist,{
    time,pos,velocity:b.velocity,radius:e.r,player:s.player,
    health:e.hp/e.maxHP,
    casts:[...(s.craftedShots||[]),s.craftedAura].filter(Boolean),
    shots:s.projectiles,
    obstacles:[
     ...(s.combat?.pillars||[]).filter(p=>p.alive!==false&&p.body?.position)
       .map(p=>({position:p.body.position,radius:p.r||30})),
     ...(s.combat?.debris||[]).filter(p=>p.alive!==false&&p.body?.position)
       .map(p=>({position:p.body.position,radius:p.r||12})),
     ...(s.actors||[]).filter(a=>a.body?.labAlive!==false&&
       ["crate","dummy"].includes(a.body?.gameTag))
       .map(a=>({position:a.body.position,radius:a.r||24}))
    ].slice(0,14)
   });
   if(e.mindIntent?.release)fire(s,e,e.mindIntent.release,Body);
  }
  const intent=e.mindIntent?.move||e.archivist.intent||{x:0,y:0,speed:0};
  if(e.mindIntent?.launch){
   // Reflex, not a speed buff: replace momentum with his existing walking speed.
   // Projectiles remain fully physical and can still hit during the sidestep.
   e.mindIntent.launch=false;
   const magnitude=Math.hypot(intent.x||0,intent.y||0)||1;
   Body.setVelocity(b,{x:(intent.x||0)/magnitude*(intent.speed||0),
    y:(intent.y||0)/magnitude*(intent.speed||0)});
   s.burst(pos.x,pos.y,0xabcaf5,7,2);
  }else{
   Body.applyForce(b,pos,{
    x:clamp((intent.x||0)*(intent.speed||0)-b.velocity.x,-4,4)*b.mass*.00035,
    y:clamp((intent.y||0)*(intent.speed||0)-b.velocity.y,-4,4)*b.mass*.00035
   });
  }
  if(Math.hypot(pos.x-s.player.x,pos.y-s.player.y)<e.r+21)
   hitPlayer(s,8,pos.x,pos.y,"archivist pressure");
 }
 function paint(s,e,g,time){
  const p=e.body.position,x=p.x,y=p.y,m=e.archivist;
  const pulse=.5+.5*Math.sin(time*.005+e.id),low=e.hp/e.maxHP<.25;
  g.fillStyle(0x6a5096,.11+.06*pulse);g.fillCircle(x,y,76);
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3+time*.00034*(i%2?1:-1);
   const tx=x+Math.cos(a)*50,ty=y+Math.sin(a)*50;
   g.lineStyle(1.5,0xb9acfb,.43);g.lineBetween(x,y,tx,ty);
   g.fillStyle(i%2?0xf4d8af:0x91d8f5,.91);
   g.fillTriangle(tx-7,ty-5,tx+8,ty,tx-4,ty+9);
   g.lineStyle(.8,0x24233c,.85);g.lineBetween(tx-2,ty-3,tx+3,ty+4);
  }
  // Hood, shifting runic mantles, luminous face enclosed in a cage of text.
  g.fillStyle(0x0c1127,.98);g.fillTriangle(x-28,y+31,x,y-48,x+28,y+31);
  g.fillStyle(low?0x9b618b:0x514675,.97);g.fillEllipse(x,y+5,44,57);
  g.fillStyle(0xcdbbfa,.86);g.fillEllipse(x,y-17,23,18);
  g.fillStyle(0x11182f,.96);g.fillTriangle(x-20,y-22,x,y-42,x+20,y-22);
  g.lineStyle(2.2,0xc2b1ec,.9);g.strokeCircle(x,y-13,12);
  g.fillStyle(0xffe9b7,1);g.fillCircle(x,y-14,5+pulse*1.2);
  g.lineStyle(2.2,0xddc1ff,.5+.3*pulse);
  g.strokeCircle(x,y,42+2*Math.sin(time*.004));
  if(m?.held){
   const tar=m.held.tellTarget||s.player,angle=Math.atan2(tar.y-y,tar.x-x)+(m.held.feint?.63:0);
   const fx=Math.cos(angle),fy=Math.sin(angle);
   g.lineStyle(3,m.held.feint?0xffbc86:0xb8d8ff,.68+.23*pulse);
   g.lineBetween(x,y,x+fx*240,y+fy*240);
   g.strokeCircle(x,y,47+13*pulse);
   for(let i=0;i<3;i++){
    const a=angle+(i-1)*.46;
    g.lineStyle(1.4,0xc2b5fc,.28+.3*pulse);
    g.lineBetween(x,y,x+Math.cos(a)*125,y+Math.sin(a)*125);
   }
  }
  if(m?.state==="evade-bolt"){
   // Player-facing cue: the Archivist is reading an ACTUAL visible bolt.
   // A quick amber/cyan annotation, not immunity or a fake projectile.
   const observed=m.boltSeen?.body;
   if(observed?.labAlive&&observed.position){
    g.lineStyle(1.3,0x9de9ff,.50+.25*pulse);
    g.lineBetween(x,y,observed.position.x,observed.position.y);
   }
   g.lineStyle(2,0x9de9ff,.42+.4*pulse);
   g.strokeCircle(x,y,36+4*pulse);
  }
  if(e.moodText?.active){
   const state=m?.state==="evade-bolt"?"READING ARC / EVADE":
    m?.state==="inscribe"?"INSCRIBING":
    m?.state==="mislead"?"A FALSE TELL":
    m?.state==="experiment"?"EXPERIMENTING":"STUDYING";
   e.moodText.setPosition(x,y-73);
   if(e.moodText.text!==state)e.moodText.setText(state);
   e.moodText.setColor(m?.state==="evade-bolt"?"#9beaff":m?.held?"#ffe0a8":"#d0c1fa");
  }
 }
 function damaged(e,amount,time){if(M&&e.archivist)M.onDamage(e.archivist,amount,time)}
 function defeated(e){return !!(M&&e.archivist&&M.remember(e.archivist,"defeat"))}
 function retreat(e){if(M&&e.archivist)M.remember(e.archivist,"retreat")}
 function projectileHit(s,shot){
  if(!M||!shot.archive)return;
  const e=s.combat.enemies.find(x=>x.id===shot.owner&&x.archivist);
  if(e)M.onHit(e.archivist,shot.archive);
 }
 return Object.freeze({initialize,fire,step,paint,damaged,defeated,retreat,projectileHit});
});
