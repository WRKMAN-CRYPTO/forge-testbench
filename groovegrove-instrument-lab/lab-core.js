/*
 * GrooveGrove Instrument Lab. Intentionally independent of Grove simulation,
 * Railway memory, musicians, tape archives and any production renderer.
 * No note names are given to the agents: they cannot see or run this lab.
 */
import {SoundEngine} from './legacy-sound.js';

const CDN='https://cdn.jsdelivr.net/gh/';
export const ENGINE_URL='https://esm.sh/smplr@1.1.0';
// Human audition loudness calibration only. Not a musician volume decision,
// new playing skill, or a rewrite of an existing jam recording.
// The listener reported original violin ~2x louder despite the first +6 dB.
// Listener-confirmed balance is close enough at +18 dB; retain the human-only +6 to +18 trim.
// No model preferences, agent decisions, recordings or historical events change.
export const SAMPLE_TRIM_DB=Object.freeze({guitar:0,violin:18});
export const VIOLIN_TRIM_RANGE=Object.freeze({min:6,max:18,step:3});
export const gainForDecibels=db=>10**(db/20);
export const MODELS=Object.freeze({
 guitar:{
  family:'guitar',original:'Original Grove Guitar',sample:'VCSL Finger Strumstick',
  about:'Real finger-plucked, three-string Strumstick. A guitar-family alternative, not classical nylon.',
  license:'CC0-1.0',source:'https://github.com/sgossner/VCSL',
  preset:{
   samples:{baseUrl:CDN+'sgossner/VCSL@master/Chordophones/Composite%20Chordophones/Strumstick/Finger/',formats:['wav']},
   groups:[{regions:[
    {sample:'Strumstick_Finger_Str2_Main_D3_vl2_rr1',keyRange:[0,53],pitch:50},
    {sample:'Strumstick_Finger_Str3_Main_A3_vl2_rr1',keyRange:[54,60],pitch:57},
    {sample:'Strumstick_Finger_Str3_Main_E4_vl2_rr1',keyRange:[61,65],pitch:64},
    {sample:'Strumstick_Finger_Str3_Main_G4_vl2_rr2',keyRange:[66,127],pitch:67}
   ]}]
  }
 },
 violin:{
  family:'violin',original:'Original Grove Violin',sample:'VSCO Solo Violin Arco',
  about:'Recorded solo bowed violin, softly played. Sustained notes are inherently finite samples.',
  license:'CC0-1.0',source:'https://github.com/sgossner/VSCO-2-CE',
  preset:{
   samples:{baseUrl:CDN+'sgossner/VSCO-2-CE@440300901dfe9275fd84e0b7763af1f8443ae62e/Strings/Solo%20Violin/Arco%20Vib/',formats:['wav']},
   groups:[{regions:[
    {sample:'LLVln_ArcoVib_C4_p',keyRange:[0,62],pitch:60},
    {sample:'LLVln_ArcoVib_E4_p',keyRange:[63,65],pitch:64},
    {sample:'LLVln_ArcoVib_G4_p',keyRange:[66,68],pitch:67},
    {sample:'LLVln_ArcoVib_A4_p',keyRange:[69,127],pitch:69}
   ]}]
  }
 }
});
export const midi=freq=>Math.round(69+12*Math.log2(freq/440));
const note=(freq,at,duration,volume)=>({freq,at,duration,volume});
export const STUDIES=Object.freeze({
 guitar:{
  single:[note(220,0,.6,.35)],
  phrase:[note(196,0,.4,.36),note(246.94,.49,.4,.32),
    note(293.66,.98,.6,.4),note(246.94,1.72,.35,.3),note(220,2.2,.95,.34)],
  chord:[note(196,0,1.35,.29),note(246.94,.025,1.35,.27),
    note(293.66,.05,1.35,.26),note(220,1.65,.75,.3)]
 },
 violin:{
  single:[note(329.63,0,1.2,.24)],
  phrase:[note(261.63,0,.68,.24),note(293.66,.78,.9,.23),
    note(392,1.84,.72,.25),note(329.63,2.68,1.25,.23)],
  chord:[note(261.63,0,1.15,.23),note(392,.04,1.15,.21),
    note(440,1.38,.88,.23)]
 }
});
// Safari sometimes leaves AudioContext.resume() pending forever after an
// interruption, even with a valid tap. Bound that wait and allow a fresh
// context on the next user gesture; never strand the canvas in a busy state.
export async function waitForAudioResume(ctx,timeoutMs=2800){
 if(ctx.state==='running')return true;
 let timer;
 try{
  const attempted=ctx.resume(); // Invoke synchronously while the tap is active.
  await Promise.race([
   Promise.resolve(attempted).then(()=>true),
   new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})
  ]);
  return ctx.state==='running';
 }finally{clearTimeout(timer);}
}
export class InstrumentLabAudio{
 constructor(){
  this.engine=new SoundEngine();
  this.sampled=new Map();
  this.sampleGains=new Map();
  this.sampleTrimDb={...SAMPLE_TRIM_DB};
  this.loading=new Map();
  this.audioReady=false;
  this.rebuildOnNextEnable=false;
  this.resumeTimeoutMs=2800;
 }
 get context(){return this.engine.context;}
 getSampleTrimDb(family){return this.sampleTrimDb[family]??0;}
 setSampleTrimDb(family,db){
  if(family!=='violin'||!Number.isFinite(db))return this.getSampleTrimDb(family);
  const range=VIOLIN_TRIM_RANGE;
  // Quantize to the exact user-facing +/- steps: predictable A/B comparisons.
  const steps=Math.round((Math.max(range.min,Math.min(range.max,db))-range.min)/range.step);
  const value=range.min+steps*range.step;
  this.sampleTrimDb.violin=value;
  const gain=this.sampleGains.get('violin');
  if(gain){
   const target=gainForDecibels(value);
   // Smooth an active note's amplitude if adjusted while auditioning.
   if(gain.gain?.setTargetAtTime && this.context?.state==='running')
    gain.gain.setTargetAtTime(target,this.context.currentTime,.025);
   else gain.gain.value=target;
  }
  return value;
 }
 async enable(){
  // This method is invoked directly inside the pointerdown handler. Nothing
  // asynchronous may run before the unlock oscillator and resume() call.
  this.audioReady=false;
  try{
   // Production Grove uses the playback audio session on iOS. Match it here,
   // without touching the preserved legacy synthesizer baseline.
   try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
   if(this.rebuildOnNextEnable||!this.engine.context||
      this.engine.context.state==='closed'){
    this.engine.makeContext();
    // Sampled voices are linked to one AudioContext and cannot survive reset.
    for(const node of this.sampleGains.values())node.disconnect();
    this.sampleGains.clear();
    this.sampled.clear();this.loading.clear();
    this.rebuildOnNextEnable=false;
   }
   const ctx=this.context;
   if(ctx.state!=='running'){
    // Start an effectively silent oscillator during the actual gesture.
    // Safari/WebKit may not unlock audio from resume() alone.
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    gain.gain.value=.000001;
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+.025);
    const resumed=await waitForAudioResume(ctx,this.resumeTimeoutMs);
    if(!resumed)throw Error('iPhone audio did not unlock. Tap ENABLE AUDIO again.');
   }
   if(ctx!==this.context||ctx.state!=='running')
    throw Error('Audio is still '+ctx.state+'. Tap ENABLE AUDIO to retry.');
   this.audioReady=true;
   // Audible confirmation uses the untouched legacy synthesis path.
   this.engine.tone(587.33,ctx.currentTime+.035,.17,.065,'sine',0);
  }catch(error){
   this.audioReady=false;
   this.rebuildOnNextEnable=true;
   throw error;
  }
 }
 async ensureSample(family,onProgress=()=>{}){
  if(this.sampled.has(family))return this.sampled.get(family);
  if(this.loading.has(family))return this.loading.get(family);
  const work=(async()=>{
   onProgress('Loading sampler library…');
   const {Sampler}=await import(ENGINE_URL);
   onProgress('Fetching 4 CC0 recordings…');
   // Dedicated sampled-instrument trim before the usual family mix bus.
   // The original/legacy violin still connects directly to that bus and
   // is unaffected. Avoid raising all voices or weakening the master limiter.
   const trim=this.context.createGain();
   trim.gain.value=gainForDecibels(this.getSampleTrimDb(family));
   trim.connect(this.engine.mix[family]);
   try{
    const sampler=Sampler(this.context,{
     preset:MODELS[family].preset,
     destination:trim,
     volume:72,
     onLoadProgress:({loaded,total})=>onProgress('Sampled '+loaded+' / '+total+' loaded')
    });
    await sampler.ready;
    // If the listener adjusted the fader during loading, honor that choice.
    trim.gain.value=gainForDecibels(this.getSampleTrimDb(family));
    this.sampleGains.set(family,trim);
    this.sampled.set(family,sampler);
    onProgress('Recorded instrument ready');
    return sampler;
   }catch(error){
    trim.disconnect();
    throw error;
   }
  })();
  this.loading.set(family,work);
  try{return await work;}finally{this.loading.delete(family);}
 }
 async play(family,model,study,onProgress=()=>{}){
  if(!Object.hasOwn(MODELS,family)||!Object.hasOwn(STUDIES[family],study))
   throw Error('Unknown instrument or study');
  if(!this.audioReady||!this.context||this.context.state!=='running')
   throw Error('Tap ENABLE AUDIO first.');
  const sampler=model==='sample'?await this.ensureSample(family,onProgress):null;
  if(model!=='sample'&&model!=='legacy')throw Error('Unknown renderer');
  const begin=this.context.currentTime+.12;
  const events=STUDIES[family][study];
  for(const n of events){
   const at=begin+n.at;
   if(sampler){
    sampler.start({note:midi(n.freq),time:at,duration:n.duration,
     velocity:Math.max(1,Math.min(127,Math.round(32+n.volume*100)))});
   }else if(family==='violin'){
    this.engine.violin(n.freq,at,n.volume,n.duration,{roughness:.27,pressure:.58,vibrato:0});
   }else{
    this.engine.guitar(n.freq,at,n.volume,n.duration);
   }
  }
  return {family,model,study,notes:events.length,
   lengthSeconds:Math.max(...events.map(n=>n.at+n.duration))};
 }
}
