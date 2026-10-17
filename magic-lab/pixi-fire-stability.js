/* WANDRUNE 085 / COHESION STABILITY
 * Pure presentation history. Never controls physics, agent lifetime, cast
 * counts, collisions or gameplay. Deterministic when supplied a clock.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_FIRE_STABILITY=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="085-stable-fire-masses";
 const DEFAULTS={maxSlots:3,fadeMs:180,minHoldMs:230,
  challengerRatio:1.33,challengeMs:170,missingMs:450,
  heatHoldMs:110,heatFadeMs:190};
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 function makeTracker(config={}){
  const cfg={...DEFAULTS,...config};
  const tracks=new Map();
  let counter=0,lastNow=null,swaps=0;
  function memberIds(group){
   const ids=new Set();
   for(const p of group.members||[]){
    if(Number.isInteger(p.agentIndex)&&p.agentIndex>=0)ids.add(p.agentIndex);
   }
   return ids;
  }
  function common(a,b){
   if(!a.size||!b.size)return 0;
   let count=0;
   for(const id of a.size<b.size?a:b)if((a.size<b.size?b:a).has(id))count++;
   return count;
  }
  function reset(){
   tracks.clear();counter=0;lastNow=null;swaps=0;
  }
  function step(groups,clock){
   const now=Number.isFinite(clock)?clock:0;
   const dt=lastNow===null?16.667:clamp(now-lastNow,0,65);
   lastNow=now;
   const list=(groups||[]).filter(g=>g&&g.count>=2&&Number.isInteger(g.castIndex))
    .map((group,i)=>({group,i,ids:memberIds(group)}));
   // 1-to-1 match across frames. Member identities dominate, centroid
   // continuity is a fallback for agents that lack stable indices.
   const options=[];
   for(const [id,t] of tracks){
    if(now-t.seenAt>cfg.missingMs)continue;
    for(const item of list){
     const g=item.group;
     if(t.castIndex!==g.castIndex)continue;
     const overlap=common(t.ids,item.ids);
     const d=Math.hypot(t.x-g.x,t.y-g.y);
     const gap=clamp(now-t.seenAt,0,cfg.missingMs);
     const maxJump=34+gap*.65;
     const similarSize=Math.min(t.count,g.count)/Math.max(t.count,g.count);
     // With IDs, allow legitimate movement and splitting, but never
     // merge unrelated casts. Without IDs, require spatial proximity.
     if(!overlap&&(d>maxJump||similarSize<.35))continue;
     const proportion=overlap/Math.max(1,Math.min(t.ids.size,item.ids.size));
     const score=(overlap?10000+proportion*2000+overlap*2:0)-d+
      (t.selected?35:0);
     options.push({id,item,score});
    }
   }
   options.sort((a,b)=>b.score-a.score||a.id-b.id||a.item.i-b.item.i);
   const matchedIds=new Set(),matchedItems=new Set();
   for(const p of options){
    if(matchedIds.has(p.id)||matchedItems.has(p.item.i))continue;
    const t=tracks.get(p.id),g=p.item.group;
    t.group={...g,trackId:t.id};
    t.ids=p.item.ids;t.x=g.x;t.y=g.y;t.count=g.count;t.seenAt=now;
    matchedIds.add(p.id);matchedItems.add(p.item.i);
   }
   for(const item of list){
    if(matchedItems.has(item.i))continue;
    const g=item.group,id=++counter;
    tracks.set(id,{id,castIndex:g.castIndex,group:{...g,trackId:id},
     ids:item.ids,x:g.x,y:g.y,count:g.count,seenAt:now,
     selected:false,retiring:false,alpha:0,selectedAt:-Infinity,
     challengerId:0,challengeAt:0,cache:null,
     heat:{hot:{level:0,until:0,paths:[]},
       peak:{level:0,until:0,paths:[]}}});
   }
   // Mark missed components but KEEP their last geometry for a short fade.
   for(const t of tracks.values())if(t.seenAt!==now)t.group=null;
   const current=[...tracks.values()].filter(t=>t.group);
   const sizeSort=(a,b)=>b.count-a.count||a.castIndex-b.castIndex||a.id-b.id;
   current.sort(sizeSort);
   function occupied(){
    return [...tracks.values()].filter(t=>t.selected);
   }
   // Reclaim slots only when the incumbent is fully faded. A departed
   // mass cannot hand its visual slot to another mass in a single frame.
   for(const t of occupied()){
    if((!t.group||t.retiring)&&t.alpha<=.001){
     t.selected=false;t.retiring=false;t.challengerId=0;
    }
   }
   let held=occupied();
   for(const t of current){
    if(held.length>=cfg.maxSlots)break;
    if(t.selected||t.retiring)continue;
    t.selected=true;t.retiring=false;t.selectedAt=now;
    held.push(t);
   }
   // A challenger must be substantially larger for a sustained interval.
   // First fade the old mass; do not exceed maxSlots during replacement.
   const challengers=current.filter(t=>!t.selected&&!t.retiring);
   const challenger=challengers[0];
   if(challenger&&held.length>=cfg.maxSlots){
    const incumbent=held.filter(t=>t.group&&!t.retiring)
     .sort((a,b)=>a.count-b.count||a.id-b.id)[0];
    if(incumbent&&now-incumbent.selectedAt>=cfg.minHoldMs&&
       challenger.count>=incumbent.count*cfg.challengerRatio){
     if(incumbent.challengerId!==challenger.id){
      incumbent.challengerId=challenger.id;incumbent.challengeAt=now;
     }else if(now-incumbent.challengeAt>=cfg.challengeMs){
      incumbent.retiring=true;swaps++;
     }
    }else if(incumbent){incumbent.challengerId=0;}
   }else for(const t of held)t.challengerId=0;
   for(const t of tracks.values()){
    const target=t.selected&&t.group&&!t.retiring?1:0;
    const delta=dt/cfg.fadeMs;
    t.alpha=clamp(t.alpha+(target?delta:-delta),0,1);
   }
   // Clean abandoned tracking history, even for no-longer-visible casts.
   for(const [id,t] of tracks){
    if(!t.selected&&now-t.seenAt>cfg.missingMs)tracks.delete(id);
   }
   held=occupied().sort((a,b)=>a.selectedAt-b.selectedAt||a.id-b.id);
   return {now,dt,slots:held.map(t=>({id:t.id,group:t.group,
     castIndex:t.castIndex,count:t.count,opacity:t.alpha,
     retiring:t.retiring,ghost:!t.group})),
    groups:current.length,selected:held.length,ghosts:held.filter(t=>!t.group).length,
    fading:held.filter(t=>t.retiring||!t.group||t.alpha<.999).length,
    swaps,tracked:tracks.size};
  }
  function apply(result,selection){
   const byId=new Map((result.shells||[]).map(s=>[s.trackId,s]));
   const output=[];
   let heldHot=0,cacheFrames=0;
   for(const slot of selection.slots){
    const track=tracks.get(slot.id);
    if(!track)continue;
    let shell=byId.get(slot.id);
    if(shell){track.cache=shell;}
    else if(track.cache){
     shell=track.cache;cacheFrames++;
    }
    if(!shell||slot.opacity<=.0001)continue;
    const bands=[];
    for(const kind of ["hot","peak"]){
     const prev=track.heat[kind];
     const source=(byId.get(slot.id)?.hotBands||[]).find(b=>b.kind===kind);
     if(source?.paths?.length){
      prev.paths=source.paths;prev.until=selection.now+cfg.heatHoldMs;
     }
     const on=prev.paths.length&&selection.now<=prev.until;
     prev.level=clamp(prev.level+(on?1:-1)*selection.dt/cfg.heatFadeMs,0,1);
     if(prev.level<=0&&!on)prev.paths=[];
     if(prev.level>0&&prev.paths.length){
      bands.push({kind,paths:prev.paths,opacity:prev.level});
      if(!source?.paths?.length)heldHot++;
     }
    }
    output.push({...shell,opacity:slot.opacity,
      hotBands:bands,trackId:slot.id});
   }
   return {...result,shells:output,visibleShells:output.length,
    cachedShells:cacheFrames,heldHot};
  }
  function diagnostics(){return{active:[...tracks.values()].filter(t=>t.selected).length,
   swaps,tracked:tracks.size};}
  return Object.freeze({step,apply,reset,diagnostics});
 }
 return Object.freeze({VERSION,DEFAULTS,makeTracker});
});