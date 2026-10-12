/* WRKMAN Arcane Lab 045 / Mossling behavioral field test.
 * Real creatures have needs and reactions. The mind does NOT assume the
 * player is an enemy. No Phaser, timer, network, or DOM dependencies.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_CREATURE_MIND=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const WORLD={left:-800,right:1760,top:-520,bottom:1120};
 const STATES=Object.freeze(['graze','investigate','alert','flee','defend']);
 function make(id,x,y,now=0){
  const seed=(Math.imul(id+7,2654435761)>>>0)||7;
  return {id,seed,home:{x,y},state:'graze',since:now,
   inspect:null,inspectUntil:0,threat:null,threatUntil:0,hurtAt:-1e9,
   roam:{x,y},nextRoam:now,defendAt:-1e9,decisions:0};
 }
 function random(m){
  m.seed=(Math.imul(m.seed,1664525)+1013904223)>>>0;
  return m.seed/4294967296;
 }
 const delta=(a,b)=>({x:a.x-b.x,y:a.y-b.y,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))});
 function target(x,y,speed,mode){const m=Math.hypot(x,y);return {x:m>1?x/m:0,y:m>1?y/m:0,speed,state:mode}}
 function danger(m,pos,x,y,time){
  m.threat={x,y};m.threatUntil=Math.max(m.threatUntil,time+4000);
 }
 function injured(m,pos,source,time){
  m.hurtAt=time;
  danger(m,pos,source?.x??pos.x,source?.y??pos.y,time);
 }
 function decide(m,input){
  const {time,pos,player}=input,health=clamp(input.health??1,0,1);
  let mode='graze',intent=null;
  const hx=pos.x-m.home.x,hy=pos.y-m.home.y,hd=Math.hypot(hx,hy);
  const nearPlayer=player?delta(pos,player):{x:1,y:0,d:Infinity};
  // Short-term stimulus memory, not clairvoyance or global aggro. The
  // creature reacts only to disturbances that can reach its location.
  let strongest=null,best=0;
  for(const s of input.signals||[]){
   const age=time-s.at;if(age<0||age>2300)continue;
   const dx=pos.x-s.x,dy=pos.y-s.y,d=Math.hypot(dx,dy);
   const reach=110+clamp(s.power,0,2)*150;
   const score=clamp(1-d/reach,0,1)*s.power*(1-age/2600);
   if(score>best){best=score;strongest=s}
  }
  if(strongest&&best>.11){
   if((strongest.kind==='blast'||strongest.kind==='danger')&&best>.34){
    danger(m,pos,strongest.x,strongest.y,time);
   }else if(time>=m.threatUntil&&time>=m.inspectUntil-420){
    m.inspect={x:strongest.x,y:strongest.y};
    m.inspectUntil=time+1700;
   }
  }
  for(const e of input.hazards||[]){
   const p=e?.body?.position||e;
   if(!p||e?.alive===false)continue;
   const d=delta(pos,p);
   if(d.d<145){danger(m,pos,p.x,p.y,time);break}
  }
  const hurtRecently=time-m.hurtAt<4500;
  const threatened=time<m.threatUntil||health<.34;
  if(threatened){
   const from=m.threat||player||m.home;
   const d=delta(pos,from);
   // A frightened animal can lash out if the wizard corners it.
   if(hurtRecently&&nearPlayer.d<48&&health>.16&&time-m.defendAt>1300){
    mode='defend';m.defendAt=time;
    intent=target(d.x,d.y,3.6,mode);intent.attack=true;
   }else{
    mode='flee';intent=target(d.x+(hd>280?-hx*.35:0),d.y+(hd>280?-hy*.35:0),5.0,mode);
   }
  }else if(nearPlayer.d<93){
   mode='alert';
   // Warning stance, short retreat, not automatic combat.
   intent=target(nearPlayer.x,nearPlayer.y,nearPlayer.d<58?2.3:.65,mode);
  }else if(m.inspect&&time<m.inspectUntil){
   const d=delta(m.inspect,pos);
   mode='investigate';
   intent=d.d<44?target(0,0,0,mode):target(d.x,d.y,1.65,mode);
  }else{
   if(time>=m.nextRoam||hd>235){
    const angle=random(m)*Math.PI*2,r=25+random(m)*140;
    m.roam={x:clamp(m.home.x+Math.cos(angle)*r,WORLD.left+35,WORLD.right-35),
     y:clamp(m.home.y+Math.sin(angle)*r,WORLD.top+35,WORLD.bottom-35)};
    m.nextRoam=time+2500+random(m)*2400;
   }
   const d=delta(m.roam,pos);
   mode='graze';
   intent=d.d<22?target(0,0,0,mode):target(d.x,d.y,.85,mode);
  }
  if(mode!==m.state){m.state=mode;m.since=time}
  m.decisions++;
  // Gently herd the animal inward without teleporting it.
  if(pos.x<WORLD.left+42)intent.x=Math.max(.5,intent.x);
  if(pos.x>WORLD.right-42)intent.x=Math.min(-.5,intent.x);
  if(pos.y<WORLD.top+42)intent.y=Math.max(.5,intent.y);
  if(pos.y>WORLD.bottom-42)intent.y=Math.min(-.5,intent.y);
  return intent;
 }
 return Object.freeze({STATES,make,decide,injured,danger});
});
