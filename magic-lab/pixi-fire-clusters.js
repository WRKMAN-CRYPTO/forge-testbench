/* WANDRUNE / FIRE COHESION 085 : PASS A (DETECTION ONLY)
 * Spatial relationships between ALREADY-RENDERED fire agents.
 * No physics imports; does not touch agent data, damage, spells or runes.
 * This module returns debug geometry only. It creates no gameplay bodies.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_FIRE_CLUSTERS=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="085-fire-cluster-pass-a",FIRE=1,CELL=32;
 const colorPalette=[0xffaa42,0x47e6dd,0xf56de0,0x8db4ff,0xf5de75,0xb7f291,0xeb9bff,0xff7268];
 function cross(o,a,b){return(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);}
 function hull(points){
  const p=points.map(a=>({x:a.x,y:a.y})).sort((a,b)=>a.x-b.x||a.y-b.y);
  if(p.length<3)return p;
  const lo=[],hi=[];
  for(const q of p){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}
  for(let k=p.length-1;k>=0;k--){const q=p[k];while(hi.length>=2&&cross(hi[hi.length-2],hi[hi.length-1],q)<=0)hi.pop();hi.push(q);}
  lo.pop();hi.pop();return lo.concat(hi);
 }
 function findClusters(records,options={}){
  const maxRadius=Number.isFinite(options.radius)?Math.min(32,Math.max(8,options.radius)):26;
  const minAlpha=Number.isFinite(options.minAlpha)?Math.max(0,options.minAlpha):.05;
  const margin=Number.isFinite(options.margin)?Math.max(0,options.margin):34;
  const bounds=options.bounds||null;
  const sets=new Map();
  let singles=0,candidates=0,checks=0,links=0;
  for(const r of records||[]){
   if(!r||r.element!==FIRE||!Number.isInteger(r.castIndex)||r.castIndex<0||
      !Number.isFinite(r.x)||!Number.isFinite(r.y)||!(r.alpha>minAlpha))continue;
   if(bounds&&(r.x<bounds.minX-margin||r.x>bounds.maxX+margin||
     r.y<bounds.minY-margin||r.y>bounds.maxY+margin))continue;
   let arr=sets.get(r.castIndex);
   if(!arr){arr=[];sets.set(r.castIndex,arr);}
   arr.push(r);
   candidates++;
  }
  const groups=[];
  for(const [castIndex,points] of sets){
   const n=points.length,parent=new Int32Array(n),weights=new Int32Array(n);
   for(let i=0;i<n;i++){parent[i]=i;weights[i]=1;}
   function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
   function join(a,b){
    let aa=root(a),bb=root(b);if(aa===bb)return false;
    if(weights[aa]<weights[bb]){const t=aa;aa=bb;bb=t;}
    parent[bb]=aa;weights[aa]+=weights[bb];return true;
   }
   // Look up only nearby 32px cells, never every unrelated agent.
   const grid=new Map(),edges=[];
   for(let i=0;i<n;i++){
    const p=points[i],gx=Math.floor(p.x/CELL),gy=Math.floor(p.y/CELL);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const members=grid.get((gx+dx)+":"+(gy+dy));if(!members)continue;
     for(const j of members){
      const q=points[j],ex=p.x-q.x,ey=p.y-q.y;
      checks++;
      // Agent size contributes to connection range, but never exceeds
      // one cell, preserving the spatial-hash 3x3 correctness.
      const s=Math.max(18,Math.min(maxRadius,3.7*(Math.max(.6,p.r||2)+Math.max(.6,q.r||2))));
      if(ex*ex+ey*ey<=s*s&&join(i,j)){
       // Spanning-forest edges, not quadratic all-to-all spaghetti.
       edges.push([i,j]);links++;
      }
     }
    }
    const key=gx+":"+gy;
    if(!grid.has(key))grid.set(key,[]);
    grid.get(key).push(i);
   }
   const parts=new Map();
   for(let i=0;i<n;i++){
    const key=root(i);
    if(!parts.has(key))parts.set(key,{members:[],edges:[]});
    parts.get(key).members.push(points[i]);
   }
   for(const [a,b] of edges){parts.get(root(a)).edges.push({a:points[a],b:points[b]});}
   for(const group of parts.values()){
    if(group.members.length<2){singles++;continue;}
    const members=group.members;let x=0,y=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of members){x+=p.x;y+=p.y;minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    const count=members.length;
    groups.push({castIndex,count,x:x/count,y:y/count,minX,minY,maxX,maxY,
      hull:hull(members),edges:group.edges,
      // This is DEBUG geometry, not the final plasma perimeter.
      radius:maxRadius});
   }
  }
  groups.sort((a,b)=>b.count-a.count||a.castIndex-b.castIndex||a.x-b.x);
  for(let i=0;i<groups.length;i++)groups[i].debugColor=colorPalette[(groups[i].castIndex+i)%colorPalette.length];
  return {version:VERSION,candidates,activeClusters:groups.length,singles,
    largest:groups[0]?.count||0,checks,links,groups};
 }
 return Object.freeze({VERSION,FIRE,CELL,findClusters,hull});
});