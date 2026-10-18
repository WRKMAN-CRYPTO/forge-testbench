/*
 * GrooveGrove live-note conductor.
 *
 * Stable musical time comes from the SERVER'S stamped note onsets, not from
 * the arrival time of each HTTP response. The Web Audio clock schedules
 * future notes with a small jitter cushion; packets can arrive irregularly
 * without introducing artificial swing or changing musician decisions.
 *
 * This module owns no simulation state. It only plays real server notes.
 */
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const SOUND_KINDS=new Set(['guitar','kick','snare','hat']);

export class LiveNoteConductor {
 constructor({delayMs=1900}={}){
  this.delayMs=clamp(delayMs,1000,3500);
  this.reset(true);
 }
 reset(retainStats=true){
  this.ctx=null;
  this.serverAnchor=0;
  this.audioAnchor=0;
  this.lastSequence=0;
  this.synced=false;
  this.lastNetworkMs=0;
  if(!retainStats){this.scheduled=0;this.late=0;this.invalid=0;this.resyncs=0;}
  else{
   this.scheduled=this.scheduled||0;this.late=this.late||0;
   this.invalid=this.invalid||0;this.resyncs=this.resyncs||0;
  }
 }
 get stats(){return {delayMs:this.delayMs,scheduled:this.scheduled,late:this.late,
  invalid:this.invalid,resyncs:this.resyncs,lastNetworkMs:this.lastNetworkMs,
  synced:this.synced};}
 receive(packet,{context,sentAtMs,receivedAtMs,play,onNote}){
  if(!context || context.state!=='running' || !packet || !Number.isFinite(packet.serverNow))return 0;
  if(this.ctx!==context){
   this.ctx=context;
   this.synced=false;
   this.resyncs++;
  }
  const rtt=clamp(receivedAtMs-sentAtMs,0,4000);
  this.lastNetworkMs=rtt;
  // Server timestamp is sampled immediately before its response. Estimate
  // the one-way transit conservatively; never use Date.now() as a shared
  // audio clock because the phone and Railway wall clocks may differ.
  const serverNow=packet.serverNow+Math.min(rtt/2,450);
  const now=context.currentTime;
  if(!this.synced){
   this.serverAnchor=serverNow;
   this.audioAnchor=now+this.delayMs/1000;
   this.synced=true;
  }else{
   const mappingError=(now+this.delayMs/1000) -
    (this.audioAnchor+(serverNow-this.serverAnchor)/1000);
   if(Math.abs(mappingError)>1){
    // iOS suspends AudioContext's clock during calls/backgrounding. The old
    // timebase is invalid on return; drop old music, not the agents' state.
    this.serverAnchor=serverNow;
    this.audioAnchor=now+this.delayMs/1000;
    this.resyncs++;
   }else{
    // Slowly compensate clock drift without re-timing one response at a time.
    this.audioAnchor+=clamp(mappingError,-0.0015,0.0015);
   }
  }
  const events=Array.isArray(packet.events)?packet.events:[];
  let played=0;
  for(const event of events){
   if(!event || !Number.isSafeInteger(event.seq) || event.seq<=this.lastSequence)continue;
   this.lastSequence=event.seq;
   if(!SOUND_KINDS.has(event.kind) || !Number.isFinite(event.atMs) ||
      !Number.isFinite(event.volume) || event.volume<0 ||
      (event.kind==='guitar' && (!Number.isFinite(event.freq)||event.freq<=0))){
    this.invalid++;continue;
   }
   const when=this.audioAnchor+(event.atMs-this.serverAnchor)/1000;
   // One stalled network request must never flush a rapid pile of
   // historical drum hits into the speakers.
   if(when < now+0.035){this.late++;continue;}
   if(when > now+4){this.invalid++;continue;}
   play(event,when);
   this.scheduled++;
   played++;
   if(onNote)onNote(event,when);
  }
  return played;
 }
}