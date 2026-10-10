/* WRKMAN / ARCANE LAB 029 — six-slot loadout + quarter-fan aiming, independent of combat.
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
 // Coordinates are relative to the CAST orb, not the old wheel center.
 // Two three-rune arcs fit entirely in the upper-left quadrant.
 // The bottom-left strip remains empty so DASH stays accessible.
 const FAN=Object.freeze([
  {degrees:-90,radius:112},{degrees:-120,radius:112},{degrees:-150,radius:112},
  {degrees:-90,radius:165},{degrees:-120,radius:165},{degrees:-150,radius:165}
 ].map(p=>Object.freeze(p)));
 function pos(index){
  const p=FAN[index];
  if(!p)return {x:0,y:0};
  const a=p.degrees*Math.PI/180;
  return {x:Math.cos(a)*p.radius,y:Math.sin(a)*p.radius};
 }
 function gesture(dx,dy){
  const len=Math.hypot(dx,dy);
  if(len<40)return {action:"cast",index:-1};
  // Only the inward upper-left quarter can select a rune. Small boundary
  // tolerance lets a finger land on the vertical/top-edge rune.
  if(dx>12||dy>8||len<70||len>201)return {action:"cancel",index:-1};
  let closest=-1,distance=Infinity;
  for(let i=0;i<SLOT_COUNT;i++){
   const point=pos(i),d=Math.hypot(dx-point.x,dy-point.y);
   if(d<distance){distance=d;closest=i;}
  }
  return distance<=40?{action:"select",index:closest}:{action:"cancel",index:-1};
 }
 return Object.freeze({KEY,LIBRARY,DEFAULT,SLOT_COUNT,GLYPH,FAN,safe,valid,read,write,assign,unassigned,pos,gesture});
});
