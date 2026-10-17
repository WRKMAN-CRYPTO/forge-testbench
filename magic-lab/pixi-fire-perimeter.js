/* WANDRUNE / FIRE COHESION 085 : PASS B (SOFT SHARED PERIMETER)
 * Pure visual scalar-field sampling + marching squares.
 * Input: groups from pixi-fire-clusters.js (already computed agent records).
 * Output: lightweight world-coordinate contours. No spell/gameplay mutation.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_FIRE_PERIMETER=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const VERSION="085-fire-perimeter-pass-b",BUCKET=40;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const nodeKey=(x,y,edge)=>edge===0?"h:"+x+":"+y:
  edge===1?"v:"+(x+1)+":"+y:
  edge===2?"h:"+x+":"+(y+1):"v:"+x+":"+y;
 function buildOne(group,opts={}){
  const members=group?.members;
  if(!members||members.length<2)return null;
  const threshold=clamp(Number(opts.threshold)||.52,.28,.95);
  const padding=38;
  const minX=group.minX-padding,minY=group.minY-padding;
  const width=(group.maxX-group.minX)+2*padding,height=(group.maxY-group.minY)+2*padding;
  const maxSamples=clamp(Math.floor(opts.maxSamples||3200),400,5000);
  const step=Math.max(4.0,width/104,height/78,Math.sqrt(width*height/maxSamples));
  const nx=Math.max(3,Math.ceil(width/step)+1),ny=Math.max(3,Math.ceil(height/step)+1);
  const dx=width/(nx-1),dy=height/(ny-1);
  // Max 2σ support is small relative to bucket size. Query a 5×5 grid
  // to keep every influence exact within our chosen 2.9σ cutoff.
  const buckets=new Map(),agents=[];
  for(const p of members){
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.r))continue;
   const alpha=clamp(Number(p.alpha)||0,0,1);
   if(alpha<=.05)continue;
   const sigma=clamp(8+p.r*1.9,10,19);
   const a={x:p.x,y:p.y,sigma,inv:1/(2*sigma*sigma),
    cutoff:(2.7*sigma)**2,weight:alpha};
   agents.push(a);
   const key=Math.floor(a.x/BUCKET)+":"+Math.floor(a.y/BUCKET);
   if(!buckets.has(key))buckets.set(key,[]);
   buckets.get(key).push(a);
  }
  if(agents.length<2)return null;
  const values=new Float32Array(nx*ny);
  let work=0;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
   const px=minX+i*dx,py=minY+j*dy;
   const bx=Math.floor(px/BUCKET),by=Math.floor(py/BUCKET);
   let density=0;
   for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){
    const cell=buckets.get((bx+ox)+":"+(by+oy));
    if(!cell)continue;
    for(const a of cell){
     const ex=px-a.x,ey=py-a.y,d2=ex*ex+ey*ey;
     work++;
     if(d2<a.cutoff)density+=a.weight*Math.exp(-d2*a.inv);
    }
   }
   values[j*nx+i]=Math.min(6,density);
  }
  // Each marching-square edge has one stable grid-edge ID. Contour
  // assembly joins ONLY matching edge IDs, never distant agent heads.
  const points=new Map(),segments=[];
  function intersect(i,j,edge,v){
   const key=nodeKey(i,j,edge);
   if(points.has(key))return key;
   const corner=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]];
   const a=edge,b=(edge+1)%4;
   const va=v[a],vb=v[b];
   const t=clamp((threshold-va)/(vb-va||1e-9),0,1);
   const x=minX+(corner[a][0]+(corner[b][0]-corner[a][0])*t)*dx;
   const y=minY+(corner[a][1]+(corner[b][1]-corner[a][1])*t)*dy;
   points.set(key,{x,y});
   return key;
  }
  for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
   const index=j*nx+i,v=[
    values[index],values[index+1],values[index+nx+1],values[index+nx]];
   const cuts=[];
   for(let e=0;e<4;e++){
    const next=(e+1)%4;
    if((v[e]>=threshold)!==(v[next]>=threshold))
     cuts.push(intersect(i,j,e,v));
   }
   if(cuts.length===2)segments.push([cuts[0],cuts[1]]);
   else if(cuts.length===4){
    // Ambiguous saddle: choose separation from the bilinear cell center.
    // Either case gives two independent paths with no X-shaped crossings.
    const center=(v[0]+v[1]+v[2]+v[3])/4;
    if(center>=threshold){
     segments.push([cuts[0],cuts[1]],[cuts[2],cuts[3]]);
    }else{
     segments.push([cuts[0],cuts[3]],[cuts[1],cuts[2]]);
    }
   }
  }
  if(!segments.length)return {count:agents.length,paths:[],samples:nx*ny,work};
  const adjacent=new Map();
  for(let i=0;i<segments.length;i++){
   for(const key of segments[i]){
    if(!adjacent.has(key))adjacent.set(key,[]);
    adjacent.get(key).push(i);
   }
  }
  const used=new Uint8Array(segments.length),loops=[];
  function walk(start){
   let current=start,previous=-1;
   const keys=[current],limit=segments.length+2;
   for(let k=0;k<limit;k++){
    const choices=adjacent.get(current)||[];
    const next=choices.find(e=>!used[e]&&e!==previous);
    if(next===undefined)break;
    used[next]=1;
    const pair=segments[next];
    current=pair[0]===current?pair[1]:pair[0];
    keys.push(current);previous=next;
    if(current===start)break;
   }
   return keys;
  }
  // Open contour fragments first; then the closed loops.
  for(const [key,edges] of adjacent)if(edges.length===1&&edges.some(e=>!used[e])){
   const p=walk(key);if(p.length>2)loops.push(p);
  }
  for(let i=0;i<segments.length;i++)if(!used[i]){
   const p=walk(segments[i][0]);if(p.length>2)loops.push(p);
  }
  const result=[];
  for(const keys of loops){
   const closed=keys[0]===keys[keys.length-1];
   let path=keys.map(key=>points.get(key)).filter(Boolean);
   if(path.length<4)continue;
   const stride=Math.max(1,Math.ceil(path.length/190));
   if(stride>1)path=path.filter((_,i)=>i%stride===0);
   if(closed&&path.length>=3){
    const first=path[0],last=path[path.length-1];
    if(first.x!==last.x||first.y!==last.y)path.push(first);
   }
   let length=0;
   for(let k=1;k<path.length;k++)
    length+=Math.hypot(path[k].x-path[k-1].x,path[k].y-path[k-1].y);
   if(length<10)continue;
   result.push({points:path,closed,length});
  }
  // Small islands and holes can be legitimate. Do not bridge them.
  // Prefer long visible shells if a cluster is unusually fragmented.
  result.sort((a,b)=>b.length-a.length);
  return {count:agents.length,paths:result.slice(0,16),samples:nx*ny,work,
   bounds:{minX,minY,maxX:minX+width,maxY:minY+height}};
 }
 function buildPerimeters(groups,opts={}){
  const maxGroups=clamp(Math.floor(opts.maxGroups??8),0,12);
  const budget=clamp(Math.floor(opts.sampleBudget??16000),0,24000);
  const chosen=[],statistics={groups:0,paths:0,vertices:0,samples:0,work:0,
   skipped:0,budget,version:VERSION};
  for(const group of groups||[]){
   if(!group||group.count<2)continue;
   if(chosen.length>=maxGroups||statistics.samples+400>budget){statistics.skipped++;continue;}
   const remaining=budget-statistics.samples;
   const shell=buildOne(group,{maxSamples:Math.min(3200,remaining),threshold:opts.threshold});
   if(!shell||!shell.paths.length)continue;
   if(statistics.samples+shell.samples>budget){statistics.skipped++;continue;}
   statistics.samples+=shell.samples;statistics.work+=shell.work;
   statistics.groups++;statistics.paths+=shell.paths.length;
   for(const path of shell.paths)statistics.vertices+=path.points.length;
   chosen.push({castIndex:group.castIndex,count:group.count,paths:shell.paths});
  }
  return {...statistics,shells:chosen};
 }
 return Object.freeze({VERSION,buildOne,buildPerimeters});
});