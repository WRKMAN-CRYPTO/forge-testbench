/* WANDRUNE 072 | Non-invasive Archivist legacy spell inheritance.
 * Wraps the existing decision system, preserving its reflexes and cooldowns.
 * Opening exchange and roughly every third attack may use inherited magic.
 */
(function(root,factory){
 const base=root?.WRKMAN_ARCHIVIST||
   (typeof require==="function"?require("./archivist-mind.js"):null);
 const legacy=root?.WRKMAN_ARCHIVIST_LEGACY||
   (typeof require==="function"?require("./archivist-legacy.js"):null);
 if(!base||!legacy)return;
 if(base.LEGACY_SPELLS){if(typeof module==="object"&&module.exports)module.exports=base;return;}
 const api=factory(base,legacy);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ARCHIVIST=api;
})(typeof window!=="undefined"?window:globalThis,function(base,legacy){
 "use strict";
 function decide(m,ob){
  const alreadyCasting=!!m.held;
  const intent=base.decide(m,ob);
  if(alreadyCasting||!intent?.tell||!m.held||m.held.kind||
     !(m.attacks===0||m.attacks%3===2))return intent;
  m.legacyIndex??=Math.max(0,Math.floor(m.prior?.encounters||0));
  const id=legacy.ORDER[m.legacyIndex++%legacy.ORDER.length];
  const original=m.held;
  // Keep all the original brain's thinking and eventual normal attack cost.
  // Force a single non-deceptive plan so no false extra counter-volley spawns.
  const plan={...original,kind:"legacy",legacy:id,
    name:legacy.SPELLS[id].name,tactic:"probe",feint:false,lead:false};
  m.held=plan;
  m.until=ob.time+168;
  m.quote="An inherited incantation: "+plan.name+".";
  return {...intent,tell:plan};
 }
 return Object.freeze({...base,decide,LEGACY_SPELLS:legacy.ORDER});
});
