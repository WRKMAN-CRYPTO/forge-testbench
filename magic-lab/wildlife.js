/* WRKMAN ARCANE LAB 032 / SPARK-DRAWER WILDLIFE
 * Tiny residents, not enemies. No health bars, spell identifiers, inventory,
 * navigation server, persistent storage, timers or Phaser dependencies.
 * They perceive only environmental measurements provided by the scene:
 * object motion, thermal gradients, brightness, obstacle contact, impulses.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_WILDLIFE=api;
})(typeof globalThis==="object"?globalThis:null,function(){
 "use strict";
 const MAX=18,TICK=80;
 const LIMIT={left:-800,right:1760,top:-520,bottom:1120};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hyp=Math.hypot;
 function reset(x=254,y=305,seed=310031){
  const w={creatures:[],seed:seed>>>0,acc:0,steps:0,recycled:0};
  // Fixed population and reproducible local personality, no global RNG use.
  const types=["ant","pillbug","moth"];
  const numbers=[8,5,5];
  for(let i=0;i<types.length;i++)for(let j=0;j<numbers[i];j++){
   const a=make(w,types[i],x,y,false);
   w.creatures.push(a);
  }
  return w;
 }
 function rand(w){
  w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0;
  return w.seed/4294967296;
 }
 function make(w,type,x,y,edge){
  const angle=rand(w)*Math.PI*2;
  const radius=edge?330+rand(w)*245:115+Math.sqrt(rand(w))*420;
  const px=clamp(x+Math.cos(angle)*radius,LIMIT.left+28,LIMIT.right-28);
  const py=clamp(y+Math.sin(angle)*radius*.69,LIMIT.top+28,LIMIT.bottom-28);
  const heading=rand(w)*Math.PI*2;
  return {type,x:px,y:py,vx:0,vy:0,targetX:0,targetY:0,kickX:0,kickY:0,tumbleUntil:0,recoverUntil:0,heading,turnAt:0,pauseUntil:0,
   alarm:0,nextRelayAt:0,fleeX:0,fleeY:0,curlUntil:0,
   crumb:type==="ant"&&rand(w)<.34,wing:rand(w)*6.28,
   shade:rand(w),age:rand(w)*3000};
 }
 function environmentSense(a,env,time){
  let urgency=0,fromX=0,fromY=0,heat=0,chill=0;
  let glowTarget=null,glowWeight=0;
  for(const o of env.motions||[]){
   const dx=a.x-o.x,dy=a.y-o.y,d=hyp(dx,dy);
   const range=o.range||76;
   if(d<range&&d>1){
    const strength=(1-d/range)*clamp(o.speed/7,.18,1);
    if(strength>urgency){urgency=strength;fromX=dx/d;fromY=dy/d;}
   }
  }
  for(const t of env.thermals||[]){
   const d=hyp(a.x-t.x,a.y-t.y),r=t.radius||100;
   if(d>r+95)continue;
   const influence=clamp(1-Math.max(0,d-r)/(95),0,1);
   if(t.heat>0){
    const h=clamp(t.heat,0,1)*influence;
    heat=Math.max(heat,h);
    if(a.type==="moth"&&h>.08&&h<.75&&h>glowWeight){
     glowTarget=t;glowWeight=h;
    }
   }else if(t.heat<0){chill=Math.max(chill,clamp(-t.heat,0,1)*influence);}
  }
  for(const light of env.lights||[]){
   const dx=a.x-light.x,dy=a.y-light.y,d=hyp(dx,dy),r=light.radius||90;
   if(d>r+95)continue;
   const intensity=clamp(light.intensity*(1-d/(r+95)),0,1);
   if(intensity>.78&&d<r*.85&&intensity>urgency){
    urgency=intensity;fromX=dx/Math.max(1,d);fromY=dy/Math.max(1,d);
   }else if(a.type==="moth"&&intensity>.11&&intensity>glowWeight){
    glowTarget=light;glowWeight=intensity;
   }
  }
  for(const shock of env.shocks||[]){
   const dx=a.x-shock.x,dy=a.y-shock.y,d=hyp(dx,dy),r=shock.radius||120;
   if(d>=r||d<1)continue;
   const s=(1-d/r)*clamp(shock.strength||1,0,1);
   if(s>urgency){urgency=s;fromX=dx/d;fromY=dy/d;}
  }
  const p=env.player;
  if(p){
   const dx=a.x-p.x,dy=a.y-p.y,d=hyp(dx,dy);
   const near=a.type==="pillbug"?64:a.type==="ant"?48:38;
   if(d<near&&d>1&&urgency<.36){
    urgency=.36;fromX=dx/d;fromY=dy/d;
   }
  }
  // Strong heat is danger to every creature, even light-seeking moths.
  if(heat>.78){urgency=Math.max(urgency,heat);const t=(env.thermals||[]).find(h=>h.heat>.78&&hyp(a.x-h.x,a.y-h.y)<(h.radius||100)+95);if(t){const d=Math.max(1,hyp(a.x-t.x,a.y-t.y));fromX=(a.x-t.x)/d;fromY=(a.y-t.y)/d;}}
  return {urgency,fromX,fromY,heat,chill,glowTarget,glowWeight};
 }
 function think(w,env,time,dt){
  w.steps++;
  const p=env.player||{x:254,y:305};
  const senses=w.creatures.map(a=>environmentSense(a,env,time));
  // Neighbors can become alarmed by a fleeing ant even when they never saw
  // the original disturbance. One propagation pass, no recursive search.
  for(let i=0;i<w.creatures.length;i++){
   const a=w.creatures[i],s=senses[i];
   if(a.type!=="ant"||s.urgency>.3||time<a.nextRelayAt)continue;
   for(const b of w.creatures){
    if(b===a||b.type!=="ant"||b.alarm<.56)continue;
    const d=hyp(a.x-b.x,a.y-b.y);
    if(d<85&&d>1){
     s.urgency=.53;s.fromX=(a.x-b.x)/d;s.fromY=(a.y-b.y)/d;
     a.nextRelayAt=time+2600;break;
    }
   }
  }
  for(let i=0;i<w.creatures.length;i++){
   const a=w.creatures[i],s=senses[i];
   const distance=hyp(a.x-p.x,a.y-p.y);
   // Relocate only well outside the wider 030 viewport. Population count
   // stays bounded while new regions acquire residents as the player walks.
   if(distance>940){
    const fresh=make(w,a.type,p.x,p.y,true);
    Object.assign(a,fresh);w.recycled++;continue;
   }
   a.age+=dt*1000;
   a.alarm=Math.max(0,a.alarm-dt*.43);
   if(s.urgency>.24){
    a.alarm=Math.max(a.alarm,clamp(s.urgency+.16,0,1));
    a.fleeX=s.fromX;a.fleeY=s.fromY;
    a.pauseUntil=0;
    if(a.type==="pillbug"&&s.urgency>.3)
     a.curlUntil=Math.max(a.curlUntil,time+1500);
   }
   if(time>a.turnAt){
    a.turnAt=time+600+rand(w)*2000;
    a.heading+=(-.8+rand(w)*1.6);
    if(a.type==="ant"&&rand(w)<.35&&a.alarm<.2)
     a.pauseUntil=time+250+rand(w)*700;
   }
   let dirX=Math.cos(a.heading),dirY=Math.sin(a.heading);
   if(a.alarm>.20){dirX=a.fleeX||dirX;dirY=a.fleeY||dirY;}
   if(a.type==="moth"&&s.glowTarget&&s.heat<.75&&a.alarm<.18){
    const d=Math.max(1,hyp(a.x-s.glowTarget.x,a.y-s.glowTarget.y));
    // Orbit light rather than suicidally fly into its center.
    const seek=d>55?1:-.28;
    dirX=dirX*.45+(s.glowTarget.x-a.x)/d*.55*seek;
    dirY=dirY*.45+(s.glowTarget.y-a.y)/d*.55*seek;
   }
   const obstacle=(env.obstacles||[]).find(o=>{
    const d=hyp(a.x-o.x,a.y-o.y);return d<(o.radius||24)+13;
   });
   if(obstacle){
    const dx=a.x-obstacle.x,dy=a.y-obstacle.y,d=Math.max(1,hyp(dx,dy));
    dirX+=dx/d*2;dirY+=dy/d*2;
    if(a.type==="pillbug"&&a.curlUntil>time){
     a.kickX+=dx/d*16;a.kickY+=dy/d*16;
    }
   }
   // Ambient acceleration acts directly on the body, not on its knowledge.
   // The little resident may roll in a force field without understanding it.
   for(const force of env.forces||[]){
    const dx=force.x-a.x,dy=force.y-a.y,d=Math.max(10,hyp(dx,dy));
    if(d<(force.radius||190)){
     const pull=(1-d/(force.radius||190))*clamp(force.strength||1,0,3);
     a.kickX+=dx/d*pull*8;a.kickY+=dy/d*pull*8;
     if(a.type==="pillbug"&&pull>.3)a.curlUntil=Math.max(a.curlUntil,time+1100);
    }
   }
   const rolled=a.type==="pillbug"&&time<a.curlUntil;
   const resting=time<a.pauseUntil&&!rolled&&a.alarm<.2;
   const chillFactor=1-s.chill*.65;
   const speed=(a.type==="ant"?34:a.type==="pillbug"?21:43)*
      (a.alarm>.2?2.1:1)*chillFactor;
   if(a.type==="moth"){
    dirX+=Math.sin(a.wing*.71)*.30;
    dirY+=Math.cos(a.wing*.59)*.24;
   }
   const d=Math.max(1,hyp(dirX,dirY));
   // Perception updates goals, not position. Frame-rate motion is separate.
   const recovering=time<a.recoverUntil;
   a.targetX=resting||rolled||recovering?0:dirX/d*speed;
   a.targetY=resting||rolled||recovering?0:dirY/d*speed;
   if(a.type==="ant"&&a.crumb&&a.alarm>.42)a.crumb=false;
   else if(a.type==="ant"&&!a.crumb&&a.alarm<.1&&rand(w)<.004)a.crumb=true;
  }
 }
 // Direct blast response: impact is physical, independent of whether the
 // creature noticed anything during its previous low-frequency sense tick.
 function impulse(w,x,y,radius=140,energy=100,time=0){
  if(!w)return 0;
  const r=Math.max(12,Number(radius)||140),strength=clamp(Number(energy)||0,0,200)/100;
  let count=0;
  for(let i=0;i<w.creatures.length;i++){
   const a=w.creatures[i],dx=a.x-x,dy=a.y-y,d=hyp(dx,dy);
   if(d>r+7)continue;
   const angle=(i+1)*2.39996323;
   const nx=d>.001?dx/d:Math.cos(angle),ny=d>.001?dy/d:Math.sin(angle);
   const fall=Math.pow(clamp(1-d/(r+7),0,1),.65);
   const speed=(a.type==="ant"?330:a.type==="pillbug"?240:285)*strength*fall;
   if(speed<3)continue;
   a.kickX=clamp(a.kickX+nx*speed,-450,450);
   a.kickY=clamp(a.kickY+ny*speed,-450,450);
   a.alarm=Math.max(a.alarm,.86);
   a.fleeX=nx;a.fleeY=ny;a.pauseUntil=0;
   a.tumbleUntil=Math.max(a.tumbleUntil,time+(a.type==="pillbug"?1050:a.type==="moth"?680:440));
   a.recoverUntil=Math.max(a.recoverUntil,time+(a.type==="pillbug"?1450:a.type==="moth"?960:720));
   if(a.type==="pillbug")a.curlUntil=Math.max(a.curlUntil,time+1700);
   if(a.type==="ant")a.crumb=false;
   count++;
  }
  return count;
 }
 // 60 FPS motion + wing animation; decisions and sensory searches stay 12.5Hz.
 function integrate(w,time,delta){
  const dt=clamp(Number(delta)||0,0,50)/1000;
  if(!dt)return;
  for(const a of w.creatures){
   const rolled=a.type==="pillbug"&&time<a.curlUntil;
   const recovering=time<a.recoverUntil;
   const factor=1-Math.pow(1-(rolled?.12:.22),dt/.08);
   a.vx+=((recovering?0:a.targetX)-a.vx)*factor;
   a.vy+=((recovering?0:a.targetY)-a.vy)*factor;
   // Explosion momentum is NOT blended away by an AI turning decision.
   const kx=a.kickX,ky=a.kickY;
   a.x+=(a.vx+kx)*dt;a.y+=(a.vy+ky)*dt;
   const drag=Math.pow(a.type==="pillbug"?.88:a.type==="ant"?.84:.86,dt/.08);
   a.kickX=kx*drag;a.kickY=ky*drag;
   if(a.type==="moth")a.wing+=dt*23*(time<a.tumbleUntil?.7:1);
   if(a.x<LIMIT.left+18||a.x>LIMIT.right-18){
    a.vx*=-.62;a.kickX*=-.55;a.heading=Math.PI-a.heading;
   }
   if(a.y<LIMIT.top+18||a.y>LIMIT.bottom-18){
    a.vy*=-.62;a.kickY*=-.55;a.heading=-a.heading;
   }
   a.x=clamp(a.x,LIMIT.left+18,LIMIT.right-18);
   a.y=clamp(a.y,LIMIT.top+18,LIMIT.bottom-18);
  }
 }
 function step(w,env,time,delta){
  if(!w||!Array.isArray(w.creatures))return;
  // Accept batched simulation ticks, but cap position integration per frame.
  const ms=clamp(Number(delta)||0,0,160);
  if(!ms)return;
  w.acc+=ms;
  if(w.acc>=TICK){
   const measured=Math.min(w.acc,160)/1000;
   w.acc%=TICK;
   think(w,env||{},time,measured);
  }
  integrate(w,time,ms);
 }
 function paint(w,g,time,p){
  if(!w)return 0;
  let painted=0;
  for(const a of w.creatures){
   if(p&&hyp(a.x-p.x,a.y-p.y)>810)continue;
   const tumbling=time<a.tumbleUntil;
   // Preserve subpixel travel. Only the creature SHAPES are pixel-sized;
   // rounding the entire creature every frame would reintroduce stepping.
   const x=tumbling?0:a.x,y=tumbling?0:a.y;
   if(tumbling){
    g.save();g.translateCanvas(a.x,a.y);
    g.rotateCanvas((a.tumbleUntil-time)*(a.type==="pillbug"?.024:a.type==="ant"?.035:.019));
   }
   // Tiny pixel-built silhouettes: few draws, still readable at 0.8 camera.
   if(a.type==="ant"){
    const flip=Math.cos(a.heading)>=0?1:-1;
    g.fillStyle(0x060d12,.25);g.fillRect(x-5,y+4,12,2);
    g.fillStyle(a.alarm>.35?0xe1985a:0x9e806a,.97);
    g.fillRect(x-6*flip,y-1,4,3);
    g.fillRect(x-1,y-2,4,4);
    g.fillRect(x+3*flip,y-1,4,3);
    g.fillStyle(0xc9af84,.8);
    g.fillRect(x+6*flip,y-4,1,3);g.fillRect(x+8*flip,y-3,1,2);
    if(a.crumb){g.fillStyle(0xf3d58e,.95);g.fillRect(x+10*flip,y,3,3);}
    if(a.alarm>.35){g.fillStyle(0xe6ab78,.8);g.fillRect(x,y-6,2,2);}
   }else if(a.type==="pillbug"){
    const curled=time<a.curlUntil;
    g.fillStyle(0x040c12,.35);g.fillRect(x-7,y+6,14,3);
    g.fillStyle(curled?0x698ea2:0x809b9b,1);
    if(curled){
     g.fillCircle(x,y,7);g.lineStyle(1,0xc3d5cb,.85);
     g.strokeCircle(x,y,5);g.lineBetween(x-4,y,x+4,y);
    }else{
     g.fillRoundedRect(x-10,y-5,20,11,5);
     g.lineStyle(1,0xc5d2c5,.7);
     for(let j=-6;j<=6;j+=4)g.lineBetween(x+j,y-4,x+j+2,y+4);
     g.fillStyle(0xe1e7c9);g.fillRect(x+7,y-2,2,2);
     g.fillStyle(0x6e8585);g.fillRect(x-7,y+5,3,3);g.fillRect(x+5,y+5,3,3);
    }
   }else{
    const wings=Math.abs(Math.sin(a.wing))*6+2;
    g.fillStyle(0x080f19,.3);g.fillRect(x-6,y+8,13,2);
    g.fillStyle(a.alarm>.4?0xf1b57f:0x79c9d8,.88);
    g.fillRect(x-3-wings,y-5,Math.round(wings),6);
    g.fillRect(x+3,y-5,Math.round(wings),6);
    g.fillStyle(0xe8f7e6,.95);g.fillRect(x-2,y-4,4,7);
    g.fillStyle(0x4b728f,.8);g.fillRect(x-1,y-8,1,4);g.fillRect(x+1,y-8,1,4);
    g.fillStyle(0xe6f9fe,.66);g.fillRect(x-1,y-2,2,2);
   }
   if(tumbling)g.restore();
   painted++;
  }
  return painted;
 }
 function snapshot(w){return w?{total:w.creatures.length,ants:w.creatures.filter(a=>a.type==="ant").length,
  pillbugs:w.creatures.filter(a=>a.type==="pillbug").length,moths:w.creatures.filter(a=>a.type==="moth").length,
  alarmed:w.creatures.filter(a=>a.alarm>.3).length,curled:w.creatures.filter(a=>a.type==="pillbug"&&a.curlUntil>0).length,
  recycled:w.recycled,steps:w.steps}:null;}
 return Object.freeze({reset,step,impulse,paint,snapshot,MAX,TICK});
});
