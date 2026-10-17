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
 const VERSION="085-nonblocking-fire-masses";
 const DEFAULTS={maxSlots:3,fadeMs:180,missingMs:450,
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
   // A small occupancy bonus helps equal-size blobs keep their look, but
   // no old mass can BLOCK a bigger newcomer. Expiring images live in a
   // separate cheap fade queue, not in the THREE expensive field slots.
   current.sort((a,b)=>{
    const as=a.count*(a.selected?1.10:1);
    const bs=b.count*(b.selected?1.10:1);
    return bs-as||b.count-a.count||a.castIndex-b.castIndex||a.id-b.id;
   });
   const selected=new Set(current.slice(0,cfg.maxSlots).map(t=>t.id));
   const lastSelected=[...tracks.values()].filter(t=>t.selected);
   const incoming=current.slice(0,cfg.maxSlots).filter(t=>!t.selected).length;
   if(lastSelected.length===cfg.maxSlots)swaps+=incoming;
   for(const t of tracks.values()){
    const chosen=selected.has(t.id);
    if(chosen){
     // An entirely new eligible mass should not spend 180ms invisible.
     // Smoothing is for departures and heat thresholds, not starving
     // the arrival of visible mass.
     if(!t.selected)t.alpha=Math.max(t.alpha,.82);
     t.selected=true;t.retiring=false;
     t.selectedAt=now;
     t.alpha=clamp(t.alpha+dt/Math.max(60,cfg.fadeMs*.45),0,1);
    }else{
     if(t.selected)t.retiring=true;
     t.selected=false;
     t.alpha=clamp(t.alpha-dt/cfg.fadeMs,0,1);
     if(t.alpha<=.001)t.retiring=false;
    }
   }
   const active=current.filter(t=>t.selected);
   // No field work for fading afterimages. Bound cached ghosts separately
   // to three cheap graphics draws; they never occupy a field-sampling slot.
   const ghosts=[...tracks.values()].filter(t=>!t.selected&&t.retiring&&
      t.alpha>.001&&t.cache).sort((a,b)=>b.alpha-a.alpha).slice(0,cfg.maxSlots);
   for(const [id,t] of tracks){
    if(!t.selected&&!t.retiring&&now-t.seenAt>cfg.missingMs)
     tracks.delete(id);
   }
   const visible=active.concat(ghosts);
   return {now,dt,slots:visible.map(t=>({id:t.id,
     group:t.selected?t.group:null,castIndex:t.castIndex,count:t.count,
     opacity:t.alpha,retiring:t.retiring,ghost:!t.selected})),
    groups:current.length,selected:active.length,ghosts:ghosts.length,
    fading:visible.filter(t=>t.retiring||t.alpha<.999).length,
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