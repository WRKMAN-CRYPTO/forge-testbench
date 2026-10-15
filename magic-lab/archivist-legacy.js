/* WANDRUNE 072 | Inherited non-swarm spell repertoire */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ARCHIVIST_LEGACY=api;
})(typeof window!=="undefined"?window:globalThis,function(){
 "use strict";
 const ORDER=Object.freeze(["bolt","well","pulse","frost","flame","detonate","lightning"]);
 const SPELLS=Object.freeze({
  bolt:{name:"Arc Bolt",r:8,color:0xffdc8d},
  well:{name:"Gravity Well",r:208,color:0xb994ff},
  pulse:{name:"Kinetic Pulse",r:204,delay:390,color:0x84ecdb},
  frost:{name:"Frost Field",r:152,delay:400,color:0x96d8ff},
  flame:{name:"Flame Field",r:129,delay:450,color:0xff8c43},
  detonate:{name:"Detonation",r:146,delay:480,color:0xffd084},
  lightning:{name:"Spark",r:36,delay:450,color:0x94e4ff}
 });
 const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function cast(s,e,plan,Body){
  const type=plan?.legacy,v=SPELLS[type];
  if(!v||!e?.alive||!e.archivist)return false;
  const time=s.time.now,p=e.body.position,target=plan.target||plan.tellTarget||s.player;
  const range=Math.max(1,d(p,target)),dir={x:(target.x-p.x)/range,y:(target.y-p.y)/range};
  if(type==="bolt"){
   if(s.projectiles.length>=35)return false;
   const b=s.matter.add.circle(p.x+dir.x*28,p.y+dir.y*28,8,{restitution:.65,frictionAir:.0015,density:.005});
   b.gameTag="ember";b.labAlive=true;b.owner=e.id;b.labBorn=time;b.labDeflected=false;
   b.archive={legacy:true,element:"arcane",motif:"legacy-bolt",tactic:"legacy",
    name:v.name,damage:12,color:v.color};
   Body.setVelocity(b,{x:dir.x*13,y:dir.y*13});
   s.projectiles.push({body:b,born:time,trail:[]});
   s.burst?.(b.position.x,b.position.y,v.color,7,2.5);
  }else if(type==="well"){
   s.wells??=[];
   s.wells.push({x:target.x,y:target.y,r:208,born:time,life:4800,
    phase:time*.003,hostile:true,owner:e.id});
   if(s.wells.length>12)s.wells.shift();
   s.burst?.(target.x,target.y,v.color,20,4);
  }else{
   const center=(type==="pulse"||type==="frost")?p:target;
   e.archivist.legacyEffects??=[];
   e.archivist.legacyEffects.push({type,x:center.x,y:center.y,r:v.r,
    born:time,due:time+v.delay,resolved:false});
   if(e.archivist.legacyEffects.length>10)e.archivist.legacyEffects.shift();
  }
  e.archivist.legacyCounts??={};
  e.archivist.legacyCounts[type]=(e.archivist.legacyCounts[type]||0)+1;
  s.announceCombat?.("ARCHIVIST CASTS "+v.name.toUpperCase());
  return true;
 }
 function resolve(s,e,fx,time,Body,hitPlayer){
  const player=s.player,v=SPELLS[fx.type],inside=d(player,fx)<=v.r+12;
  if(fx.type==="pulse"){
   for(const a of [...(s.actors||[]),...(s.projectiles||[])]){
    const b=a.body;if(!b?.position||b.isStatic)continue;
    const range=Math.max(28,d(b.position,fx));if(range>=204)continue;
    const force=(1-range/204)*.028*(b.mass||1);
    Body?.applyForce?.(b,b.position,{x:(b.position.x-fx.x)/range*force,
     y:(b.position.y-fx.y)/range*force});
   }
   if(inside)hitPlayer(s,8,fx.x,fx.y,"Archivist Kinetic Pulse");
   s.rings?.push({x:fx.x,y:fx.y,r:12,life:500,born:time,c:v.color});
   s.burst?.(fx.x,fx.y,v.color,28,8);
  }else if(fx.type==="frost"){
   s.frosts??=[];
   s.frosts.push({x:fx.x,y:fx.y,r:152,born:time,life:2000,hostile:true,owner:e.id});
   s.burst?.(fx.x,fx.y,v.color,18,4);
  }else if(fx.type==="flame"){
   s.combat.fields??=[];
   s.combat.fields.push({x:fx.x,y:fx.y,r:129,born:time,life:4050,
    nextTick:time,hostile:true,owner:e.id,nextPlayerTick:time});
   if(s.combat.fields.length>8)s.combat.fields.shift();
   s.burst?.(fx.x,fx.y,v.color,24,5);
  }else if(fx.type==="detonate"){
   s.combat.blastFX??=[];
   s.combat.blastFX.push({x:fx.x,y:fx.y,born:time,life:530,energy:100,chain:false,hostile:true});
   if(s.combat.blastFX.length>24)s.combat.blastFX.shift();
   s.rings?.push({x:fx.x,y:fx.y,r:12,life:480,born:time,c:v.color});
   if(inside)hitPlayer(s,19,fx.x,fx.y,"Archivist Detonation");
   s.burst?.(fx.x,fx.y,v.color,40,8);
   s.cameras?.main?.shake?.(115,.0025);
  }else if(fx.type==="lightning"){
   const Element=typeof window!=="undefined"?window.WRKMAN_ELEMENTS:null;
   if(Element?.discharge)Element.discharge(s,fx.x,fx.y,null,{
    hostile:true,hitPlayer:(amount,x,y)=>hitPlayer(s,amount,x,y,"Archivist Spark")
   });else{
    if(inside)hitPlayer(s,7,fx.x,fx.y,"Archivist Spark");
    s.elementWorld?.flashes?.push({x:fx.x,y:fx.y,r:36,born:time,until:time+550,wet:false});
   }
   s.burst?.(fx.x,fx.y,v.color,14,3);
  }
 }
 function tick(s,e,time,Body,hitPlayer){
  const m=e?.archivist;if(!m)return;
  for(const fx of (m.legacyEffects||[])){
   if(fx.resolved||time<fx.due)continue;
   fx.resolved=true;fx.resolvedAt=time;
   resolve(s,e,fx,time,Body,hitPlayer);
  }
  m.legacyEffects=(m.legacyEffects||[]).filter(f=>!f.resolved||time-f.resolvedAt<260);
  const c=s.combat,p=s.player;if(!c||!p)return;
  for(const w of (s.wells||[])){
   if(!w.hostile||w.owner!==e.id||time-w.born>=w.life)continue;
   const range=Math.max(18,d(p,w));if(range>=w.r)continue;
   const influence=Math.pow(1-range/w.r,1.35);
   c.playerKnock??={x:0,y:0};
   const factor=.18*influence*clamp(time-(w.lastPullAt??time-16),0,50)/16.667;
   c.playerKnock.x=clamp(c.playerKnock.x+(w.x-p.x)/range*factor,-2.1,2.1);
   c.playerKnock.y=clamp(c.playerKnock.y+(w.y-p.y)/range*factor,-2.1,2.1);
   w.lastPullAt=time;
  }
  for(const f of (s.frosts||[])){
   if(f.hostile&&f.owner===e.id&&time-f.born<f.life&&d(f,p)<=f.r+12)
    c.playerFrostSlowUntil=Math.max(c.playerFrostSlowUntil||0,time+130);
  }
  for(const f of (c.fields||[])){
   if(!f.hostile||f.owner!==e.id||time-f.born>=f.life)continue;
   if(d(f,p)>f.r+12||time<f.nextPlayerTick)continue;
   f.nextPlayerTick=time+350;
   hitPlayer(s,5,f.x,f.y,"Archivist Flame Field");
  }
 }
 return Object.freeze({ORDER,SPELLS,cast,tick});
});
