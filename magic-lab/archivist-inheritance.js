/* WANDRUNE 072 | Non-invasive Archivist legacy spell inheritance.
 * Wraps the existing decision system, preserving its reflexes and cooldowns.
 * Every third planned attack uses one original spell as an alternative.
 */
(function(root,factory){
 const base=root?.WRKMAN_ARCHIVIST||
   (typeof require==="function"?require("./archivist-mind.js"):null);
 const legacy=root?.WRKMAN_ARCHIVIST_LEGACY||
   (typeof require==="function"?require("./archivist-legacy.js"):null);
 if(!base||!legacy)return;
 const api=factory(base,legacy);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_ARCHIVIST=api;
})(typeof window!=="undefined"?window:globalThis,function(base,legacy){
 "use strict";
 function decide(m,ob){
  const intent=base.decide(m,ob);
  if(!intent?.tell||!m.held||m.held.kind||m.attacks<2||
     m.attacks%3!==2)return intent;
  m.legacyIndex??=0;
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
