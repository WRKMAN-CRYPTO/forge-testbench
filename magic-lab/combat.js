/* WRKMAN ARCANE LAB 006 | Living targets, status physics, and bounded combustion.
   Standalone Phaser/Matter encounter module. No networking or permanent game saves. */
(()=>{
"use strict";
const Body=Phaser.Physics.Matter.Matter.Body;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const WORLD={left:90,right:870,top:90,bottom:510};
const CHAIN_FRACTION=.60,CHAIN_THRESHOLD=15,MAX_DEPTH=5,MAX_QUEUE=64,MAX_EVENTS_PER_FRAME=8;
let chainCounter=0,enemyCounter=0;
const now=s=>s.time.now;
function spawn(s,type,x,y){
 const heavy=type==="charger";
 const r=heavy?26:18;
 const body=s.matter.add.circle(x,y,r,{
  frictionAir:heavy?.075:.09,restitution:heavy?.4:.68,
  density:heavy?.016:.002,slop:.02
 });
 const enemy={
  id:++enemyCounter,body,r,type,alive:true,
  hp:heavy?165:80,maxHP:heavy?165:80,
  phase:"stalk",until:0,nextAttack:now(s)+1000+Math.random()*800,
  face:{x:-1,y:0},burn:null,hitAt:0,
  orbit:Math.random()<.5?-1:1
 };
 body.gameTag="enemy";
 body.enemyRef=enemy;
 s.actors.push(enemy);
 s.combat.enemies.push(enemy);
 return enemy;
}
function reset(s){
 // Reset is invoked only after old Matter bodies are removed by Lab.resetLab.
 s.combat={
  hp:100,kills:0,invulnUntil:0,enemyShots:0,
  enemies:[],fields:[],pending:[],seen:new Map(),
  relic:true,damageEvents:0,pairCollisions:new Map()
 };
 spawn(s,"charger",585,205);
 spawn(s,"charger",620,410);
 spawn(s,"wisp",760,174);
 spawn(s,"wisp",753,426);
 heads(s);
}
function heads(s){
 if(!s.combat)return;
 const c=s.combat;
 const h=document.getElementById("playerHP");
 const k=document.getElementById("kills");
 const e=document.getElementById("enemies");
 const relic=document.getElementById("relic");
 if(h)h.textContent=Math.max(0,Math.round(c.hp))+"%";
 if(k)k.textContent=String(c.kills);
 if(e)e.textContent=String(c.enemies.filter(x=>x.alive).length);
 if(relic){
  relic.textContent="✹ CINDERHEART "+(c.relic?"ON":"OFF");
  relic.setAttribute("aria-pressed",c.relic?"true":"false");
  relic.classList.toggle("on",c.relic);
 }
}
function toggleRelic(s){
 if(!s?.combat)return;
 s.combat.relic=!s.combat.relic;
 heads(s);
}
function hitPlayer(s,amount,x,y,source){
 const c=s.combat,time=now(s);
 if(time<c.invulnUntil||time<s.dashUntil)return;
 c.hp=Math.max(0,c.hp-amount);
 c.invulnUntil=time+850;
 const dx=s.player.x-x,dy=s.player.y-y,d=Math.max(1,Math.hypot(dx,dy));
 s.player.x=clamp(s.player.x+dx/d*23,90,870);
 s.player.y=clamp(s.player.y+dy/d*23,90,510);
 s.burst(s.player.x,s.player.y,0xff9691,11,4);
 s.cameras.main.shake(70,.003);
 if(c.hp===0){
  c.hp=100;c.invulnUntil=time+2000;
  s.player.x=245;s.player.y=304;
  s.burst(s.player.x,s.player.y,0x8edafa,26,6);
  s.announceCombat("WIZARD RECOVERED • Keep experimenting.");
 } else {
  s.announceCombat("HIT BY "+source.toUpperCase()+" • Dodge or redirect the attack.");
 }
 heads(s);
}
function seenSet(s,chainId){
 let set=s.combat.seen.get(chainId);
 if(!set){set=new Set();s.combat.seen.set(chainId,set);}
 return set;
}
function addBurn(s,e,energy,chainId,depth){
 if(!e.alive||energy<CHAIN_THRESHOLD)return false;
 if(seenSet(s,chainId).has(e.id))return false;
 const time=now(s);
 const existing=e.burn;
 if(existing&&existing.until>time){
  // Preserve the strongest existing ignition. Same-source field contact
  // keeps the burn alive; propagated chains cannot downgrade it.
  if(existing.energy>energy&&existing.chainId!==chainId)return false;
  if(existing.chainId===chainId){
   existing.until=Math.max(existing.until,time+1750);
   return true;
  }
 }
 e.burn={energy,chainId,depth,until:time+(depth?1350:1850),nextTick:time+360};
 return true;
}
function queueBurnDetonation(s,e,burn){
 if(!burn||!s.combat.relic||burn.energy<CHAIN_THRESHOLD)return;
 if(burn.depth>=MAX_DEPTH)return;
 const already=seenSet(s,burn.chainId);
 if(already.has(e.id))return;
 already.add(e.id);
 if(s.combat.pending.length>=MAX_QUEUE)return;
 s.combat.pending.push({
  x:e.body.position.x,y:e.body.position.y,
  chainId:burn.chainId,depth:burn.depth,
  energy:burn.energy,source:e.id
 });
}
function hitEnemy(s,e,amount,kind){
 if(!e?.alive||!Number.isFinite(amount)||amount<=0)return false;
 e.hp=Math.max(0,e.hp-amount);
 e.hitAt=now(s);
 if(e.hp>0)return false;
 e.alive=false;
 s.combat.kills++;
 queueBurnDetonation(s,e,e.burn);
 e.burn=null;
 s.removal.push(e.body);
 s.burst(e.body.position.x,e.body.position.y,e.type==="charger"?0xffaa77:0x8aefff,20,6);
 if(s.combat.enemies.every(x=>!x.alive))s.announceCombat("CHAMBER CLEARED • RESET revives the encounter.");
 heads(s);
 return true;
}
function blast(s,x,y,options={}){
 const radius=options.radius||140;
 const energy=options.energy??100;
 const depth=options.depth||0;
 const chainId=options.chainId||(++chainCounter);
 const chain=Boolean(options.chain);
 const c=s.combat;
 s.rings.push({x,y,r:12,life:480,born:now(s),c:chain?0xffd47e:0xff8d43});
 s.burst(x,y,chain?0xffd37a:0xff8758,Math.min(35,12+Math.floor(energy/5)),7);
 if(s.rings.length>36)s.rings.splice(0,s.rings.length-36);
 const origin={x,y};
 for(const a of [...s.actors,...s.projectiles]){
  const b=a.body;if(!b||!b.position||a.alive===false||b.labAlive===false)continue;
  const d=Math.max(18,distance(b.position,origin));
  if(d>radius)continue;
  const falloff=Math.max(.08,1-d/radius);
  const impulse=(.020+energy*.00013)*b.mass*falloff*(b.gameTag==="enemy"&&b.enemyRef.type==="charger"?.55:1);
  Body.applyForce(b,b.position,{x:(b.position.x-x)/d*impulse,y:(b.position.y-y)/d*impulse});
  if(b.gameTag==="enemy"){
   const foe=b.enemyRef;
   const dmg=(chain?11:31)*falloff*(energy/100);
   // Ignite first: if the blast immediately defeats the target,
   // its Burn can still fuel a later, attenuated explosion.
   if(chain){
    const nextEnergy=energy*CHAIN_FRACTION;
    if(nextEnergy>=CHAIN_THRESHOLD)addBurn(s,foe,nextEnergy,chainId,depth+1);
   }
   hitEnemy(s,foe,dmg,chain?"burn-expire":"detonation");
  }else if(b.gameTag==="dummy"){
   s.dummyHP=Math.max(0,s.dummyHP-(chain?8:25)*falloff);
   if(s.dummyHP<=0)s.dummyHP=400;
   s.updateHeads();
  }
 }
 if(!chain)s.announceCombat("DETONATION • Knockback transferred to every nearby body.");
}
function flame(s,x,y){
 const c=s.combat;
 const chainId=++chainCounter;
 const f={x:clamp(x,90,870),y:clamp(y,90,510),r:129,born:now(s),life:4050,
  nextTick:now(s),chainId};
 c.fields.push(f);
 if(c.fields.length>6)c.fields.shift();
 s.burst(f.x,f.y,0xffa465,24,5);
 s.announceCombat("FLAME FIELD • Exposure hurts and leaves a Burn.");
}
function ember(s,e){
 if(!e.alive||s.projectiles.length>=35)return;
 const p=e.body.position;
 const dx=s.player.x-p.x,dy=s.player.y-p.y;
 const d=Math.max(1,Math.hypot(dx,dy));
 const nx=dx/d,ny=dy/d;
 const b=s.matter.add.circle(p.x+nx*38,p.y+ny*38,8,{
  restitution:.65,frictionAir:.002,density:.004
 });
 b.gameTag="ember";b.labAlive=true;b.owner=e.id;b.labDeflected=false;
 Body.setVelocity(b,{x:nx*6.3,y:ny*6.3});
 s.projectiles.push({body:b,born:now(s),trail:[]});
 s.burst(b.position.x,b.position.y,0xff7a4a,5,2);
}
function bodyCollision(s,a,b){
 const aEnemy=a.gameTag==="enemy"?a.enemyRef:null;
 const bEnemy=b.gameTag==="enemy"?b.enemyRef:null;
 if((!aEnemy&&!bEnemy)||a.gameTag==="bolt"||b.gameTag==="bolt"||a.gameTag==="ember"||b.gameTag==="ember")return;
 if(aEnemy&&!aEnemy.alive||bEnemy&&!bEnemy.alive)return;
 // A thrown body retains real momentum. Damage and Burn transfer happen only
 // after a meaningful impact, not when entities gently touch each other.
 const av=a.velocity||{x:0,y:0},bv=b.velocity||{x:0,y:0};
 const speed=Math.hypot(av.x-bv.x,av.y-bv.y);
 if(speed<4.4)return;
 const idA=Math.min(a.id||0,b.id||0),idB=Math.max(a.id||0,b.id||0);
 const key=idA+":"+idB;
 const recent=s.combat.pairCollisions.get(key)||0;
 if(now(s)-recent<460)return;
 s.combat.pairCollisions.set(key,now(s));
 if(s.combat.pairCollisions.size>180)s.combat.pairCollisions.clear();
 const force=clamp((speed-3.5)*2.9,2,32);
 // Transfer the original Burn states before damage. A fatal impact can
 // therefore still leave an ignited body that explodes on death.
 if(aEnemy&&bEnemy&&aEnemy.alive&&bEnemy.alive){
  const burnA=aEnemy.burn&&{...aEnemy.burn},burnB=bEnemy.burn&&{...bEnemy.burn};
  if(burnA&&burnA.depth<MAX_DEPTH)
   addBurn(s,bEnemy,burnA.energy*.68,burnA.chainId,burnA.depth+1);
  if(burnB&&burnB.depth<MAX_DEPTH)
   addBurn(s,aEnemy,burnB.energy*.68,burnB.chainId,burnB.depth+1);
 }
 if(aEnemy)hitEnemy(s,aEnemy,force*(aEnemy.type==="charger"?.48:1),"impact");
 if(bEnemy)hitEnemy(s,bEnemy,force*(bEnemy.type==="charger"?.48:1),"impact");
 if(aEnemy||bEnemy){
  const ax=a.position?.x??0,ay=a.position?.y??0,bx=b.position?.x??0,by=b.position?.y??0;
  s.burst((ax+bx)/2,(ay+by)/2,0xffc387,7,Math.min(6,speed*.5));
 }
}

function collision(s,projectile,other){
 if(!projectile?.labAlive)return false;
 const tag=projectile.gameTag;
 if(tag==="ember"&&other.gameTag==="enemy"&&projectile.owner===other.enemyRef?.id)return true;
 if(tag!=="bolt"&&tag!=="ember")return false;
 // Enemy missiles can be deflected into their own allies and crates.
 if(tag==="bolt"&&other.gameTag==="enemy"){
  hitEnemy(s,other.enemyRef,29,"arc-bolt");
 }
 if(tag==="ember"&&other.gameTag==="enemy"){
  hitEnemy(s,other.enemyRef,14,"friendly-fire");
 }
 if(other.gameTag==="enemy"||tag==="ember"){
  projectile.labAlive=false;
  s.removal.push(projectile);
  s.burst(projectile.position.x,projectile.position.y,tag==="ember"?0xff774d:0xffdfa1,12,4);
  return true;
 }
 return false;
}
function step(s,time,delta){
 const c=s.combat;if(!c)return;
 const dt=Math.min(delta,48)/16.667;
 c.fields=c.fields.filter(f=>time-f.born<f.life);
 for(const f of c.fields){
  if(time<f.nextTick)continue;
  f.nextTick=time+260;
  for(const e of c.enemies){
   if(!e.alive||distance(e.body.position,f)>f.r+e.r)continue;
   addBurn(s,e,100,f.chainId,0);
   hitEnemy(s,e,3.2,"flame");
  }
 }
 for(const e of c.enemies){
  if(!e.alive)continue;
  const b=e.body,pos=b.position;
  if(e.burn){
   const burn=e.burn;
   if(time>=burn.nextTick){
    burn.nextTick=time+380;
    hitEnemy(s,e,2.2*(burn.energy/100),"burn");
   }
   if(e.alive&&e.burn===burn&&time>=burn.until){
    e.burn=null;queueBurnDetonation(s,e,burn);
   }
  }
  if(!e.alive)continue;
  const dx=s.player.x-pos.x,dy=s.player.y-pos.y;
  const d=Math.max(1,Math.hypot(dx,dy));
  if(e.type==="charger"){
   if(e.phase==="charge"){
    if(time>=e.until){e.phase="recover";e.until=time+640;e.nextAttack=time+650;}
    if(d<e.r+20)hitPlayer(s,18,pos.x,pos.y,"charging golem");
    // Charger physically damages lighter enemies it slams into at speed.
    if(b.speed>5.4)for(const other of c.enemies){
     if(other===e||!other.alive||distance(pos,other.body.position)>e.r+other.r+3)continue;
     if(other.hitAt&&time-other.hitAt<500)continue;
     hitEnemy(s,other,23,"charging collision");
     const ox=other.body.position.x-pos.x,oy=other.body.position.y-pos.y,dd=Math.max(1,Math.hypot(ox,oy));
     Body.applyForce(other.body,other.body.position,{x:ox/dd*other.body.mass*.033,y:oy/dd*other.body.mass*.033});
    }
   }else if(e.phase==="windup"){
    Body.setVelocity(b,{x:b.velocity.x*.88,y:b.velocity.y*.88});
    if(time>=e.until){
     e.phase="charge";e.until=time+700;
     Body.setVelocity(b,{x:e.face.x*11.7,y:e.face.y*11.7});
     s.burst(pos.x,pos.y,0xffb06f,12,3);
    }
   }else if(e.phase==="recover"){
    if(time>=e.until)e.phase="stalk";
   }else{
    if(d<430&&time>=e.nextAttack){
     e.phase="windup";e.until=time+620;
     e.face={x:dx/d,y:dy/d};
    }else if(d>80&&d<480){
     const accel=.00036*b.mass;
     Body.applyForce(b,pos,{x:dx/d*accel,y:dy/d*accel});
    }
   }
  }else{
   // Wisp prefers to orbit the wizard at range; forced movement remains real.
   const desired=210,approach=(d>desired+35?1:d<desired-40?-1:0);
   const tx=(-dy/d)*e.orbit,ty=(dx/d)*e.orbit;
   const strength=.00034*b.mass;
   Body.applyForce(b,pos,{x:(dx/d*approach*.95+tx*.6)*strength,y:(dy/d*approach*.95+ty*.6)*strength});
   if(d<390&&time>=e.nextAttack){
    ember(s,e);
    e.nextAttack=time+1550+Math.random()*850;
   }
  }
  if(d<e.r+15&&time>c.invulnUntil){
   if(e.type==="charger"&&e.phase!=="charge")hitPlayer(s,7,pos.x,pos.y,"contact");
   if(e.type==="wisp")hitPlayer(s,5,pos.x,pos.y,"ember wisp");
  }
 }
 // Player is not a Matter body. Test enemy missiles against their actual
 // position, independent of collisions between the other physical bodies.
 for(const p of s.projectiles){
  const b=p.body;
  if(!b?.labAlive||b.gameTag!=="ember")continue;
  if(distance(b.position,s.player)<24){
   b.labAlive=false;s.removal.push(b);
   hitPlayer(s,12,b.position.x,b.position.y,"ember bolt");
   s.burst(b.position.x,b.position.y,0xff9258,11,4);
  }
 }
 // Burning enemies become delayed blast sources; queue capped so a crowd
 // cannot recursively explode and hang the main thread.
 let count=0;
 while(c.pending.length&&count++<MAX_EVENTS_PER_FRAME){
  const q=c.pending.shift();
  blast(s,q.x,q.y,{radius:110,chain:true,energy:q.energy,depth:q.depth,chainId:q.chainId});
 }
 // The per-chain ledger cannot grow forever during long lab sessions.
 if(c.seen.size>90){
  const oldest=c.seen.keys().next().value;c.seen.delete(oldest);
 }
 heads(s);
}
function paint(s,g,time){
 const c=s.combat;if(!c)return;
 for(const f of c.fields){
  const life=clamp((f.life-(time-f.born))/450,0,1);
  const pulse=.5+Math.sin(time*.006)*.5;
  g.fillStyle(0xff5c27,.14*life);g.fillCircle(f.x,f.y,f.r);
  g.lineStyle(3,0xffae62,(.48+.24*pulse)*life);g.strokeCircle(f.x,f.y,f.r);
  for(let i=0;i<19;i++){
   const a=i*2.4+time*.00048,rad=15+(i*29)%f.r;
   const x=f.x+Math.cos(a)*rad,y=f.y+Math.sin(a)*rad;
   g.fillStyle(i%2?0xffd46b:0xff7444,(.2+.35*pulse)*life);
   g.fillEllipse(x,y-3,4+(i%3)*3,9+(i%4)*3);
  }
 }
 for(const e of c.enemies){
  if(!e.alive)continue;
  const p=e.body.position,x=p.x,y=p.y;
  g.fillStyle(0x030a11,.5);g.fillEllipse(x,y+e.r*.7,e.r*2.1,e.r*.72);
  if(e.type==="charger"){
   const warning=e.phase==="windup";
   if(warning){
    g.lineStyle(3,0xff9a61,.7);g.lineBetween(x,y,x+e.face.x*120,y+e.face.y*120);
    g.lineStyle(2,0xffd691,.6);g.strokeCircle(x,y,31+Math.sin(time*.035)*3);
   }
   if(e.phase==="charge"){
    g.fillStyle(0xff7c43,.2);g.fillCircle(x,y,39);
   }
   g.fillStyle(0x55616b);g.fillCircle(x,y,26);
   g.fillStyle(warning?0xe2a263:0x8b8790);g.fillTriangle(x-29,y-13,x-17,y-35,x-5,y-10);
   g.fillTriangle(x+5,y-10,x+17,y-35,x+29,y-13);
   g.lineStyle(3,0xaeb9bd);g.strokeCircle(x,y,23);
   g.fillStyle(0xfabf73);g.fillCircle(x-8,y-4,3.5);g.fillCircle(x+8,y-4,3.5);
   g.lineStyle(3,0x253a49);g.lineBetween(x-8,y+11,x+8,y+11);
  }else{
   const bob=Math.sin(time*.004+e.id)*3;
   g.fillStyle(0xff9953,.12);g.fillCircle(x,y+bob,27);
   g.fillStyle(0xfd8b4f,.75);g.fillCircle(x,y+bob,18);
   g.fillStyle(0xffdf91,.9);g.fillCircle(x,y+bob,11);
   g.fillStyle(0xfff3d6);g.fillCircle(x-4,y+bob-2,2);g.fillCircle(x+4,y+bob-2,2);
   g.lineStyle(2,0xffc27c,.65);g.strokeCircle(x,y+bob,20+2*Math.sin(time*.008));
  }
  if(e.burn){
   g.fillStyle(0xffba47,.66);g.fillTriangle(x-8,y-e.r+4,x,y-e.r-17,x+7,y-e.r+4);
   g.fillStyle(0xffed88,.85);g.fillCircle(x,y-e.r-1,3);
  }
  const w=e.type==="charger"?52:39;
  g.fillStyle(0x0a1c26,.92);g.fillRoundedRect(x-w/2,y-e.r-15,w,5,2);
  g.fillStyle(e.burn?0xffa267:0x8fe7d8);g.fillRoundedRect(x-w/2,y-e.r-15,w*(e.hp/e.maxHP),5,2);
  if(time-e.hitAt<140){
   g.lineStyle(3,0xfff7dc,.8);g.strokeCircle(x,y,e.r+3);
  }
 }
}
window.WRKMAN_COMBAT={reset,heads,toggleRelic,hitEnemy,hitPlayer,flame,blast,collision,bodyCollision,step,paint,spawn};
})();
