/*
 * GrooveGrove voiceprints. A name is a creation-time seed, never an ongoing
 * control over someone's voice. Once born, the profile is saved with the world.
 * Murmur's existing synthesizer and vocal memories remain strictly legacy.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const birth=name=>{
  let seed=2166136261;
  for(const char of name)seed=Math.imul(seed^char.codePointAt(0),16777619)>>>0;
  let state=seed;
  const roll=()=>{
    state=(Math.imul(state^state>>>16,2246822507)+0x9e3779b9)>>>0;
    return state/4294967296;
  };
  return {version:1,seedName:name,seed,
    formant:Math.round((.88+roll()*.25)*1000)/1000,
    brightness:Math.round((.64+roll()*.74)*1000)/1000,
    warmth:Math.round((.72+roll()*.6)*1000)/1000,
    air:Math.round((.63+roll()*.77)*1000)/1000,
    register:Math.round((.85+roll()*.36)*1000)/1000};
};
const keys=['formant','brightness','warmth','air','register'];
export function restoreVoiceprints(saved){
  // Do not infer a new timbre for Murmur: his pre-upgrade sound stays intact.
  const output={Murmur:{version:1,legacy:true}};
  for(const name of ['Pip','Riff']){
    const existing=saved?.[name];
    if(existing?.version===1&&Number.isInteger(existing.seed)&&
       keys.every(k=>Number.isFinite(existing[k])&&existing[k]>.4&&existing[k]<1.7)){
      output[name]={version:1,seedName:typeof existing.seedName==='string'?existing.seedName:name,
        seed:existing.seed,...Object.fromEntries(keys.map(k=>[k,existing[k]]))};
    }else output[name]=birth(name);
  }
  return output;
}
