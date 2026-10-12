/* WRKMAN ARCANE LAB 049 / authoritative source-pixel spawning
 * Independent 32x32 birth layer. Grayscale still exclusively controls movement.
 * Each marked pixel is a spawn choice; the agent keeps its birth element.
 * No DOM, Phaser, hidden damage or randomness outside the supplied RNG.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.WRKMAN_ELEMENT_SOURCES=api;
})(typeof globalThis==='object'?globalThis:null,function(){
 'use strict';
 const N=32,TOTAL=N*N;
 const TYPES=Object.freeze([
  Object.freeze({id:0,key:'neutral',name:'NEUTRAL',color:'#ffffff',rgb:0xffffff}),
  Object.freeze({id:1,key:'fire',name:'FIRE',color:'#ff6b32',rgb:0xff6b32}),
  Object.freeze({id:2,key:'water',name:'WATER',color:'#44c9ed',rgb:0x44c9ed}),
  Object.freeze({id:3,key:'frost',name:'FROST',color:'#a7d8ff',rgb:0xa7d8ff}),
  Object.freeze({id:4,key:'lightning',name:'LIGHTNING',color:'#ffe65a',rgb:0xffe65a}),
  Object.freeze({id:5,key:'neutral-source',name:'NEUTRAL SOURCE',color:'#e5e6cd',rgb:0xe5e6cd})
 ]);
 const byId=id=>TYPES[id]||TYPES[0];
 function normalize(sources){
  if(sources===undefined||sources===null)return Array(TOTAL).fill(0);
  if(!Array.isArray(sources)||sources.length!==TOTAL)throw Error('Expected 32x32 source pixel overlay');
  return sources.map((v,i)=>{
   if(!Number.isInteger(v)||v<0||v>=TYPES.length)throw Error('Invalid elemental source at '+i);
   return v;
  });
 }
 function startingCells(values,sources,Motion){
  // A painted emitter layer is authoritative: movement's white/gray cells
  // remain physics instructions, NOT silent extra neutral births.
  // Without any explicit emitters, preserve legacy grayscale spawning.
  const painted=[];
  for(let index=0;index<TOTAL;index++){
   const source=sources[index];
   if(source!==0)painted.push({index,element:source===5?0:source});
  }
  if(painted.length)return painted;
  return Motion.startingCells(values).map(index=>({index,element:0}));
 }
 function spawn(values,starts,Motion,random=Math.random,home=0){
  if(!starts?.length){const agent=Motion.spawn(values,[],random,home);agent.element=0;return agent}
  const cell=starts[Math.min(starts.length-1,Math.floor(random()*starts.length))];
  const agent=Motion.spawn(values,[cell.index],random,home);
  agent.element=cell.element;
  return agent;
 }
 return Object.freeze({VERSION:'049',N,TOTAL,TYPES,byId,normalize,startingCells,spawn});
});
