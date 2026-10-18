/* WANDRUNE 092 | Two-times swarm agent sizing
 * Shared by live drawn geometry and swept-circle world hit testing.
 * Affects the rendered physical footprint, not velocity, mass, damage, mana
 * or the 200-agent per-cast budget. Test-bench experiment only.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.WRKMAN_AGENT_SIZING=api;
})(typeof globalThis==="object"?globalThis:null,function(){
 "use strict";
 const FACTOR=2;
 const visualRadius=base=>base*FACTOR;
 const hitRadius=base=>base*FACTOR;
 // Rune.radius() is capped at 44 in swarm-runes 079; 48 is the previous
 // padded search bound for that branch. Preserve the safety slack at 2x.
 const searchPadding=runeCast=>(runeCast?48:3)*FACTOR;
 return Object.freeze({VERSION:"092-double-agent-footprint",FACTOR,
  visualRadius,hitRadius,searchPadding});
});
