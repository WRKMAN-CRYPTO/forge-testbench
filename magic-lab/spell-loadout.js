/* WRKMAN / ARCANE LAB 026 — six-slot loadout, independent of combat.
 * No browser APIs here. UI and persistence are consumers of this module.
 */
(function(root,factory){
 "use strict";
 const mod=factory();
 if(typeof module==="object"&&module.exports)module.exports=mod;
 else if(root)root.WRKMAN_SPELL_LOADOUT=mod;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const KEY="wrkman-arcane-lab026-spell-loadout-v1";
 const LIBRARY=Object.freeze(["bolt","well","pulse","frost","flame","detonate","lightning"]);
 const DEFAULT=Object.freeze(["bolt","well","frost","flame","detonate","lightning"]);
 const GLYPH=Object.freeze({bolt:"✦",well:"◉",pulse:"◎",frost:"❄",flame:"♨",detonate:"✹",lightning:"⚡"});
 const SLOT_COUNT=6;
 function valid(slots){
  return Array.isArray(slots)&&slots.length===SLOT_COUNT&&
   slots.every(id=>LIBRARY.includes(id))&&new Set(slots).size===SLOT_COUNT;
 }
 function safe(slots){return valid(slots)?slots.slice():DEFAULT.slice();}
 function read(storage){
  try{return safe(JSON.parse(storage.getItem(KEY)||"null"));}catch(_){return DEFAULT.slice();}
 }
 function write(storage,slots){
  if(!valid(slots))return false;
  try{storage.setItem(KEY,JSON.stringify(slots));return true;}catch(_){return false;}
 }
 function assign(slots,index,id){
  const result=safe(slots);
  if(!Number.isInteger(index)||index<0||index>=SLOT_COUNT||!LIBRARY.includes(id))return result;
  const previous=result.indexOf(id);
  if(previous>=0&&previous!==index)result[previous]=result[index]; // swap
  result[index]=id;
  return result;
 }
 function unassigned(slots){const equip=new Set(safe(slots));return LIBRARY.filter(id=>!equip.has(id));}
 function pos(index,radius=87){
  const a=(-90+index*60)*Math.PI/180;
  return {x:Math.cos(a)*radius,y:Math.sin(a)*radius};
 }
 function gesture(dx,dy){
  const len=Math.hypot(dx,dy);
  if(len<40)return {action:"cast",index:-1};
  if(len<48||len>158)return {action:"cancel",index:-1};
  let best=-1,d=Infinity;
  for(let i=0;i<SLOT_COUNT;i++){
   const pt=pos(i);
   const a=Math.hypot(dx-pt.x,dy-pt.y);
   if(a<d){d=a;best=i;}
  }
  return d<70?{action:"select",index:best}:{action:"cancel",index:-1};
 }
 return Object.freeze({KEY,LIBRARY,DEFAULT,SLOT_COUNT,GLYPH,safe,valid,read,write,assign,unassigned,pos,gesture});
});
