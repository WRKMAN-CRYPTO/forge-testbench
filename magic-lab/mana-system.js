/* WANDRUNE 073 / Mana Cycle
 * Channeling, combat momentum and persistent Essence share one event-driven
 * resource model. Real combat events, not spell names, provide the reward.
 * Mana-positive spells are intentional, never throttled per agent/cast.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WRKMAN_MANA=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const SAVE_KEY='wandrune073-essence-v1',MAX_MANA=100,CHARGE_PER_SECOND=34;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const finite=(n,defaultValue=0)=>Number.isFinite(n)?n:defaultValue;
 const rewards={archivist:45,gravelhorn:10,charger:6,glassrunner:8,wisp:4};
 function create({storage}={}){
  let mana=MAX_MANA,essence=0,combo=0,lastHit=-Infinity,lastDodgeId=null,charging=false;
  const subscribers=new Map();
  try{essence=clamp(Math.floor(finite(Number(storage?.getItem(SAVE_KEY)))),0,Number.MAX_SAFE_INTEGER)}catch(_){}
  function save(){try{storage?.setItem(SAVE_KEY,String(essence))}catch(_){}}
  function on(event,fn){
   if(typeof fn!=='function')return ()=>{};
   const set=subscribers.get(event)||new Set();set.add(fn);subscribers.set(event,set);
   return ()=>{set.delete(fn);if(!set.size)subscribers.delete(event)};
  }
  function notify(event,data){
   for(const fn of subscribers.get(event)||[])try{fn(data,snapshot())}catch(error){console.warn('Mana subscriber error',error)}
   for(const fn of subscribers.get('*')||[])try{fn(event,data,snapshot())}catch(error){console.warn('Mana observer error',error)}
  }
  function gain(amount){
   const before=mana;
   mana=clamp(mana+Math.max(0,finite(amount)),0,MAX_MANA);
   return mana-before;
  }
  function cost(recipe){
   // One cast is at most 200 agents, not one global population budget.
   const settings=recipe?.settings||{},population=clamp(Math.round(finite(settings.population,200)),1,200);
   const delivery=settings.delivery==='world'?8:settings.delivery==='placed'?5:0;
   // Concentrating a spell into fewer real agents makes precision casting
   // affordable without raising the established 200-agent mana price.
   const Presence=typeof globalThis==='object'?globalThis.WRKMAN_SPELL_PRESENCE:null;
   return Math.ceil(12+population*.23+delivery-(Presence?.manaDiscount(population)||0));
  }
  function canCast(recipe){return mana+1e-8>=cost(recipe)}
  function spendForCast(recipe,time=0){
   const amount=cost(recipe);
   if(!canCast(recipe))return false;
   mana-=amount;charging=false;
   notify('cast',{amount,time,population:recipe?.settings?.population??200});
   return true;
  }
  function emit(event,data={}){
   const time=finite(data.time,0);
   if(event==='enemyDamaged'){
    const damage=Math.max(0,finite(data.damage));
    if(damage>0&&data.enemyType!=='mossling'){
     combo=time-lastHit<2400?combo+1:1;
     lastHit=time;
     // No hit-event cooldown. A self-sustaining swarm is a valid invention.
     gain(Math.max(.35,damage*.25)*Math.min(3.5,1+(combo-1)*.08));
    }
   }else if(event==='enemyDefeated'){
    if(data.enemyType!=='mossling'){
     gain(5);
     essence=clamp(essence+(rewards[data.enemyType]??5),0,Number.MAX_SAFE_INTEGER);
     save();
    }
   }else if(event==='perfectDodge'){
    const id=data.dashId;
    // The same dash can evade dozens of frame-level contact callbacks;
    // reward the maneuver once, not a physics reporting artifact.
    if(id!==undefined&&id!==lastDodgeId){
     lastDodgeId=id;
     combo=time-lastHit<2400?combo+2:2;lastHit=time;
     gain(18);
    }
   }else if(event==='playerDamaged'){
    charging=false;combo=0;
   }
   notify(event,data);
  }
  function startCharge(){charging=true;notify('chargeStart',{});}
  function stopCharge(){if(!charging)return;charging=false;notify('chargeStop',{});}
  function step(delta,time){
   if(time-lastHit>3200)combo=0;
   if(charging)gain(CHARGE_PER_SECOND*clamp(finite(delta),0,50)/1000);
  }
  function spendEssence(amount){
   amount=Math.floor(finite(amount,-1));
   if(amount<0||essence<amount)return false;
   essence-=amount;save();notify('essenceSpent',{amount});return true;
  }
  function addEssence(amount){
   amount=Math.floor(finite(amount,-1));
   if(amount<=0)return false;
   essence=clamp(essence+amount,0,Number.MAX_SAFE_INTEGER);
   save();notify('essenceAdded',{amount});return true;
  }
  function resetCombat(){mana=MAX_MANA;combo=0;lastHit=-Infinity;charging=false;lastDodgeId=null;}
  function snapshot(){return {mana,maxMana:MAX_MANA,essence,combo,charging};}
  return {on,emit,step,snapshot,cost,canCast,spendForCast,startCharge,stopCharge,
   resetCombat,spendEssence,addEssence};
 }
 return Object.freeze({create,MAX_MANA,CHARGE_PER_SECOND});
});
