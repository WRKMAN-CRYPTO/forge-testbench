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
  face:{x:-1,y:0},burn:null,hitAt:0,staggerUntil:0,
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
  relic:true,damageEvents:0,pairCollisions:new Map(),impactFX:[],blastFX:[],lastShake:-1000,wallHits:0,collisionHits:0,playerKnock:{x:0,y:0},playerStaggerUntil:0,playerHurtAt:-9999,playerHurtDir:{x:0,y:0}
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
 // The wizard is currently a kinematic sprite, not a Matter body.
 // Store a knockback velocity that the SAME movement integration consumes;
 // never teleport 23px on every hit.
 const dx=s.player.x-x,dy=s.player.y-y,d=Math.hypot(dx,dy);
 const nx=d>.001?dx/d:-s.aim?.x||1,ny=d>.001?dy/d:-s.aim?.y||0;
 const heavy=/golem|charg|wall|impact/i.test(source);
 const speed=heavy?15.2:/bolt/i.test(source)?10.5:8.4;
 c.playerKnock={x:nx*speed,y:ny*speed};
 c.playerStaggerUntil=time+(heavy?165:100);
 c.playerHurtAt=time;c.playerHurtDir={x:nx,y:ny};
 s.burst(s.player.x,s.player.y,0xffb19b,heavy?26:16,heavy?7:4);
 // Brief strong camera reaction and a visible ring mark a real impact.
 s.rings.push({x:s.player.x,y:s.player.y,r:12,life:340,born:time,c:0xffaa84});
 if(s.rings.length>36)s.rings.shift();
 s.cameras.main.shake(heavy?140:90,heavy?.005:.0033);
 if(c.hp===0){
  c.hp=100;c.invulnUntil=time+2000;
  s.player.x=245;s.player.y=304;
  c.playerKnock={x:0,y:0};c.playerStaggerUntil=0;
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
function impactFeedback(s,x,y,energy,nx,ny,wall=false){
 const c=s.combat;
 c.impactFX.push({x,y,energy:clamp(energy,4,65),nx,ny,born:now(s),life:380,wall});
 if(c.impactFX.length>24)c.impactFX.shift();
 s.burst(x,y,energy>19?0xffd1a0:0x80daff,clamp(Math.round(energy*.45),7,24),Math.min(8,2+energy*.12));
 if(energy>18&&now(s)-c.lastShake>220){
  s.cameras.main.shake(65+Math.min(90,energy*2),.0014+Math.min(.003,energy*.000025));
  c.lastShake=now(s);
 }
}
function blast(s,x,y,options={}){
 const radius=options.radius||140;
 const energy=options.energy??100;
 const depth=options.depth||0;
 const chainId=options.chainId||(++chainCounter);
 const chain=Boolean(options.chain);
 const c=s.combat;
 // Blast visuals are independent of damage, so even weak descendant bursts
 // remain legible without inflating their actual damage or chain range.
 c.blastFX.push({x,y,born:now(s),life:530,energy,chain});
 if(c.blastFX.length>24)c.blastFX.shift();
 s.rings.push({x,y,r:12,life:480,born:now(s),c:chain?0xffd47e:0xff8d43});
 s.burst(x,y,chain?0xffd37a:0xff8758,Math.min(48,18+Math.floor(energy/3)),8);
 if(energy>=45&&now(s)-c.lastShake>235){
  s.cameras.main.shake(chain?70:130,chain?.0018:.003);
  c.lastShake=now(s);
 }
 if(s.rings.length>36)s.rings.splice(0,s.rings.length-36);
 const origin={x,y};
 for(const a of [...s.actors,...s.projectiles]){
  const b=a.body;if(!b||!b.position||a.alive===false||b.labAlive===false)continue;
  const dx=b.position.x-x,dy=b.position.y-y,radialDist=Math.hypot(dx,dy);
  const d=Math.max(18,radialDist);
  if(d>radius||b.isStatic)continue;
  const falloff=Math.max(.08,1-d/radius);
  const type=b.gameTag==="enemy"?b.enemyRef.type:null;
  const weight=type==="charger"?.78:type==="wisp"?1.48:1.1;
  // A Gravity Well often puts foes precisely at the blast center.
  // Zero distance has no geometric outward vector: use a deterministic
  // per-body direction so the center never becomes a knockback dead zone.
  const angle=((b.id||a.id||1)*2.399963229728653)% (Math.PI*2);
  const nx=radialDist>.001?dx/radialDist:Math.cos(angle);
  const ny=radialDist>.001?dy/radialDist:Math.sin(angle);
  // Explosion = one instantaneous velocity impulse, NOT a weak force
  // applied for one physics tick. Matter frictionAir was dissipating the
  // old one-frame force before the Charger visibly moved.
  const strength=Math.sqrt(energy/100);
  const kick=(chain?13.4:19.2)*strength*falloff*weight;
  const vx=b.velocity?.x||0,vy=b.velocity?.y||0;
  const along=vx*nx+vy*ny;
  // The blast redirects incoming momentum and retains sideways motion.
  // A charging enemy can't completely swallow a close explosion.
  const outward=Math.max(along+kick,kick*.7);
  const change=outward-along;
  const maxSpeed=type==="charger"?17:25;
  const nextX=vx+nx*change,nextY=vy+ny*change;
  const magnitude=Math.hypot(nextX,nextY);
  const cap=Math.min(1,maxSpeed/Math.max(.001,magnitude));
  Body.setVelocity(b,{x:nextX*cap,y:nextY*cap});
  if(type){
   // Interrupt steering briefly while the rigid body travels under its
   // own inertia; the enemy is not glued to its AI path mid-explosion.
   const foe=b.enemyRef;
   foe.staggerUntil=Math.max(foe.staggerUntil,now(s)+(type==="charger"?320:420)*falloff);
   if(foe.phase==="windup"||foe.phase==="charge"){
    foe.phase="recover";foe.until=Math.max(foe.until,now(s)+360);
   }
  }
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
 b.gameTag="ember";b.labAlive=true;b.owner=e.id;b.labBorn=now(s);b.labDeflected=false;
 Body.setVelocity(b,{x:nx*6.3,y:ny*6.3});
 s.projectiles.push({body:b,born:now(s),trail:[]});
 s.burst(b.position.x,b.position.y,0xff7a4a,5,2);
}
function bodyCollision(s,a,b,collisionNormal){
 const aEnemy=a.gameTag==="enemy"?a.enemyRef:null;
 const bEnemy=b.gameTag==="enemy"?b.enemyRef:null;
 if((!aEnemy&&!bEnemy)||["bolt","ember"].includes(a.gameTag)||["bolt","ember"].includes(b.gameTag))return;
 if(aEnemy&&!aEnemy.alive||bEnemy&&!bEnemy.alive)return;
 if(!a.position||!b.position)return;
 const av=a.velocity||{x:0,y:0},bv=b.velocity||{x:0,y:0};
 const x=b.position.x-a.position.x,y=b.position.y-a.position.y;
 const d=Math.max(.01,Math.hypot(x,y));
 const normal=collisionNormal&&Number.isFinite(collisionNormal.x)&&Number.isFinite(collisionNormal.y)
  ?collisionNormal:{x:x/d,y:y/d};
 const nl=Math.max(.001,Math.hypot(normal.x,normal.y));
 const nx=normal.x/nl,ny=normal.y/nl;
 // The component of relative motion through the collision normal matters,
 // not sideways sliding. |.| also handles velocities after solver reflection.
 const closing=Math.abs((av.x-bv.x)*nx+(av.y-bv.y)*ny);
 if(closing<3.65)return;
 const ia=a.id??0,ib=b.id??0;
 const key=Math.min(ia,ib)+":"+Math.max(ia,ib);
 const c=s.combat;
 if(now(s)-(c.pairCollisions.get(key)??-Infinity)<430)return;
 c.pairCollisions.set(key,now(s));
 if(c.pairCollisions.size>180)c.pairCollisions.clear();
 c.collisionHits++;
 const staticA=Boolean(a.isStatic),staticB=Boolean(b.isStatic);
 const ma=staticA?Infinity:Math.max(.05,a.mass||1);
 const mb=staticB?Infinity:Math.max(.05,b.mass||1);
 const kinetic=clamp((closing-3.2)*5.1,2,62);
 const atWall=staticA||staticB;
 // Mass is a real advantage. A massive Charger delivers far more damage
 // to a light Wisp than it receives at identical relative impact velocity.
 const shareA=staticB?1:staticA?0:mb/(ma+mb);
 const shareB=staticA?1:staticB?0:ma/(ma+mb);
 const dmgA=kinetic*shareA*(aEnemy?.type==="charger"?.56:1);
 const dmgB=kinetic*shareB*(bEnemy?.type==="charger"?.56:1);
 // Snapshot statuses BEFORE applying impact damage so lethal hits can
 // produce the correct death-triggered combustion, once per chain.
 if(aEnemy&&bEnemy&&aEnemy.alive&&bEnemy.alive){
  const oldA=aEnemy.burn&&{...aEnemy.burn},oldB=bEnemy.burn&&{...bEnemy.burn};
  if(oldA&&oldA.depth<MAX_DEPTH)addBurn(s,bEnemy,oldA.energy*.68,oldA.chainId,oldA.depth+1);
  if(oldB&&oldB.depth<MAX_DEPTH)addBurn(s,aEnemy,oldB.energy*.68,oldB.chainId,oldB.depth+1);
 }
 if(aEnemy){
  if(kinetic>8)aEnemy.staggerUntil=Math.max(aEnemy.staggerUntil,now(s)+Math.min(aEnemy.type==="charger"?175:480,kinetic*(aEnemy.type==="charger"?3:10)));
  hitEnemy(s,aEnemy,dmgA,"kinetic-impact");
 }
 if(bEnemy){
  if(kinetic>8)bEnemy.staggerUntil=Math.max(bEnemy.staggerUntil,now(s)+Math.min(bEnemy.type==="charger"?175:480,kinetic*(bEnemy.type==="charger"?3:10)));
  hitEnemy(s,bEnemy,dmgB,"kinetic-impact");
 }
 const px=atWall?(aEnemy?a.position.x:b.position.x):(a.position.x+b.position.x)*.5;
 const py=atWall?(aEnemy?a.position.y:b.position.y):(a.position.y+b.position.y)*.5;
 impactFeedback(s,px,py,kinetic,nx,ny,atWall);
 if(atWall)c.wallHits++;
 if(kinetic>24)s.announceCombat(atWall?"WALL SLAM • Impact energy transferred.":"BODY COLLISION • Mass and velocity determine the damage.");
}

function collision(s,projectile,other){
 if(!projectile?.labAlive)return false;
 const tag=projectile.gameTag;
 // Prevent accidental spawn contact, but allow skillful reflected shots
 // to strike their own caster once the projectile has traveled away.
 if(tag==="ember"&&other.gameTag==="enemy"&&projectile.owner===other.enemyRef?.id&&now(s)-projectile.labBorn<280)return true;
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
 c.impactFX=c.impactFX.filter(f=>time-f.born<f.life);
 c.blastFX=c.blastFX.filter(f=>time-f.born<f.life);
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
  // Stagger suspends intent, not physics: sliding bodies continue to move
  // under their actual velocity, gravity and impacts.
  if(time<e.staggerUntil)continue;
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
 // Shock fronts + bright core flash provide visual mass without persistent
 // particles or a heavy post-processing pipeline on the iPhone.
 for(const fx of c.blastFX){
  const p=clamp((time-fx.born)/fx.life,0,1),fade=1-p;
  const radius=(fx.chain?84:116)*Math.sqrt(Math.max(.15,fx.energy/100));
  g.fillStyle(0xffe5ab,(fx.chain?.26:.38)*fade*fade);
  g.fillCircle(fx.x,fx.y,8+radius*p*.78);
  g.fillStyle(0xff8249,.13*fade);
  g.fillCircle(fx.x,fx.y,18+radius*p);
  g.lineStyle((fx.chain?4:6)*(1-p)+1,0xffd489,.92*fade);
  g.strokeCircle(fx.x,fx.y,8+radius*p);
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4+fx.x*.001,inner=8+radius*p*.57,outer=14+radius*p;
   g.lineStyle(1.8+2.4*fade,i%2?0xff7e4e:0xffeeac,.63*fade);
   g.lineBetween(fx.x+Math.cos(angle)*inner,fx.y+Math.sin(angle)*inner,
    fx.x+Math.cos(angle)*outer,fx.y+Math.sin(angle)*outer);
  }
 }
 for(const fx of c.impactFX){
  const p=clamp((time-fx.born)/fx.life,0,1),fade=1-p,extent=6+fx.energy*(.42+p*.67);
  g.lineStyle(2+3*fade,fx.wall?0xffb875:0xffe0a5,.9*fade);
  // Two short, opposing shock lines make the collision direction legible.
  const px=-fx.ny,py=fx.nx;
  for(const sign of [-1,1]){
   g.lineBetween(fx.x+px*sign*extent*.2,fx.y+py*sign*extent*.2,
    fx.x+px*sign*extent,fx.y+py*sign*extent);
  }
  g.lineStyle(3*fade+1,0xffffff,.48*fade);
  g.strokeCircle(fx.x,fx.y,3+extent*.55);
 }

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
