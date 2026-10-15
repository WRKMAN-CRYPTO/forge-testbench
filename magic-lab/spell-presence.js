/* WANDRUNE 076 / Focused casting.
 * Pure presentation profile + optional low-population feedback.
 * A lone hex stays one real agent of mass 1. No hidden steering, births,
 * homing or simulation changes. Behemoth remains its own rune.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WRKMAN_SPELL_PRESENCE=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const MAX_FOCUS_POP=12,MAX_FX=64,TAU=Math.PI*2;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
 const ELEMENT_COLORS=[0xc8b4ff,0xff973e,0x67d7ff,0xbbeaff,0xffe889];
 function profile(population){
  const count=clamp(Math.round(finite(population,200)),1,200);
  const fraction=count<=MAX_FOCUS_POP?(MAX_FOCUS_POP-count)/(MAX_FOCUS_POP-1):0;
  const focus=fraction*fraction;
  return Object.freeze({
   population:count,
   focused:focus>0,
   focus,
   radiusBonus:4.1*focus, // visual visibility only, NOT a physical hitbox or mass
   impactBonus:Math.round(16*focus),
   trailAlpha:.075+.62*focus,
   launchStrength:.45+.55*focus
  });
 }
 function manaDiscount(population){
  // Preserves the already tested 200-agent mana price and rewards precision.
  const count=clamp(Math.round(finite(population,200)),1,200);
  return 6*(1-Math.sqrt(count/200));
 }
 let audio=null,lastSoundAt=-Infinity;
 function play(kind,population,{enabled=true,volume=.65}={}){
  const p=profile(population);
  if(!enabled||!p.focused||p.focus<.1)return false;
  const Ctx=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
  if(!Ctx)return false;
  try{
   if(!audio)audio=new Ctx();
   if(audio.state==='suspended'){audio.resume().catch(()=>{});}
   const now=audio.currentTime;
   // Only one brief phrase per actual cast/hit, not one oscillator per frame.
   if(now-lastSoundAt<.055)return false;lastSoundAt=now;
   const gain=audio.createGain(),osc=audio.createOscillator();
   const duration=kind==='impact'?.13:.19;
   const start=kind==='impact'?185:420,end=kind==='impact'?82:720;
   osc.type=kind==='impact'?'triangle':'sine';
   osc.frequency.setValueAtTime(start,now);
   osc.frequency.exponentialRampToValueAtTime(end,now+duration);
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.exponentialRampToValueAtTime(Math.max(.0002,.024*clamp(volume,0,1)*(.5+.5*p.focus)),now+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
   osc.connect(gain);gain.connect(audio.destination);
   osc.start(now);osc.stop(now+duration+.01);
   osc.onended=()=>{try{osc.disconnect();gain.disconnect()}catch(_){}};
   return true;
  }catch(_){return false}
 }
 function accent(scene,kind,x,y,time,color,population,angle=0){
  const p=profile(population);
  if(!p.focused||!Number.isFinite(x)||!Number.isFinite(y))return;
  const list=scene.craftedAccentFX||(scene.craftedAccentFX=[]);
  list.push({kind,x,y,born:time,color:finite(color,ELEMENT_COLORS[0]),
   force:p.launchStrength,angle});
  if(list.length>MAX_FX)list.splice(0,list.length-MAX_FX);
 }
 function step(scene,time){
  if(scene.craftedAccentFX?.length)
   scene.craftedAccentFX=scene.craftedAccentFX.filter(f=>time-f.born<(f.kind==='impact'?470:330));
 }
 function paintAccents(scene,g,time){
  for(const f of scene.craftedAccentFX||[]){
   const life=f.kind==='impact'?470:330;
   const t=clamp((time-f.born)/life,0,1),fall=Math.pow(1-t,1.35);
   if(f.kind==='impact'){
    const radius=7+(23+f.force*12)*Math.sqrt(t);
    g.lineStyle(1+4*fall,0xffffff,fall*.8);
    g.strokeCircle(f.x,f.y,radius*.36);
    g.lineStyle(1.5+2*fall,f.color,fall*.95);
    g.strokeCircle(f.x,f.y,radius);
    for(let i=0;i<7;i++){
     const a=i*TAU/7+f.angle;
     const d=radius*.65;
     g.lineStyle(1.1+2*fall,i%2?0xffffff:f.color,fall*.8);
     g.lineBetween(f.x+Math.cos(a)*d,f.y+Math.sin(a)*d,
      f.x+Math.cos(a)*(d+9*fall),f.y+Math.sin(a)*(d+9*fall));
    }
    g.fillStyle(0xffffff,fall*.7);g.fillCircle(f.x,f.y,5*fall+.2);
   }else{
    const radius=8+(16+f.force*14)*t;
    g.lineStyle(2.7*fall+.5,0xffffff,fall*.5);
    g.strokeCircle(f.x,f.y,radius*.52);
    g.lineStyle(2+2*fall,f.color,fall*.72);
    g.strokeCircle(f.x,f.y,radius);
   }
  }
 }
 function paintFocused(g,{x,y,r,time=0,seed=0,angle=0,element=0,color=0xc8b4ff,profile:shape}){
  if(!shape?.focused)return;
  const f=shape.focus;
  const tint=ELEMENT_COLORS[element]||color;
  const breath=.89+.11*Math.sin(time*.008+seed);
  const rr=r+2+f*3.5;
  g.fillStyle(tint,.04+.12*f);
  g.fillCircle(x,y,rr*2.1*breath);
  g.lineStyle(.6+f*1.05,tint,.14+.43*f);
  g.strokeCircle(x,y,rr*(1.06+.07*Math.sin(time*.006+seed)));
  // Forward-facing highlight makes a solo agent legible while moving.
  g.lineStyle(.55+f*.85,0xffffff,.30+.47*f);
  g.lineBetween(x-Math.cos(angle)*rr*.2,y-Math.sin(angle)*rr*.2,
   x+Math.cos(angle)*rr*.65,y+Math.sin(angle)*rr*.65);
 }
 return Object.freeze({MAX_FOCUS_POP,profile,manaDiscount,play,accent,step,paintAccents,paintFocused});
});
