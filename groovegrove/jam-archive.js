/*
 * GrooveGrove's modest tape archive. These are REAL scheduled synthesizer
 * events, not audio rendered or inferred from a jam counter.
 * Only completed formal jam sessions are kept. No skill points or judging.
 */
const KINDS=['guitar','voice','violin','kick','snare','hat'];
const MUSICIANS=['Pip','Riff','Murmur'];
const COUNT=24,MAX_EVENTS=850,MAX_MS=125000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const valid=n=>Number.isFinite(n);
const cleanEvent=e=>{
 if(!e||!KINDS.includes(e.kind)||!valid(e.ms)||e.ms<0||e.ms>MAX_MS||
    !valid(e.volume)||e.volume<0||e.volume>3)return null;
 const pitched=['guitar','voice','violin'].includes(e.kind);
 if(pitched&&(!valid(e.freq)||e.freq<30||e.freq>2000))return null;
 const ev={kind:e.kind,source:MUSICIANS.includes(e.source)?e.source:'Pip',
   ms:Math.round(e.ms),volume:clamp(e.volume,0,3)};
 if(pitched){ev.freq=e.freq;ev.duration=clamp(valid(e.duration)?e.duration:.3,.04,4);}
 if((e.kind==='voice'||e.kind==='violin')&&e.expression&&typeof e.expression==='object'){
   ev.expression={...Object.fromEntries(Object.entries(e.expression).filter(([key,v])=>
     ['vowel','glide','attack','release','roughness','pressure','vibrato','voiceprint'].includes(key)&&
     (typeof v==='string'||valid(v)||(key==='voiceprint'&&v&&typeof v==='object'))))};
 }
 return ev;
};
export class JamArchive{
 constructor(saved=null){
  this.recordings=Array.isArray(saved?.recordings)?saved.recordings.slice(-COUNT).map(r=>{
   if(!r||!Number.isSafeInteger(r.startBar)||!Array.isArray(r.events))return null;
   const events=r.events.slice(0,MAX_EVENTS).map(cleanEvent).filter(Boolean);
   return {id:typeof r.id==='string'?r.id:'jam-'+r.startBar,
     startBar:r.startBar,endBar:Number.isSafeInteger(r.endBar)?r.endBar:r.startBar,
     durationMs:clamp(valid(r.durationMs)?r.durationMs:0,0,MAX_MS),
     participants:MUSICIANS.filter(n=>events.some(e=>e.source===n)),events};
  }).filter(r=>r&&r.events.length):[];
  this.active=null;
  this.deck=null;
  this.reviews=Object.fromEntries(MUSICIANS.map(n=>[n,{
   count:Math.max(0,Math.floor(saved?.reviews?.[n]?.count||0)),
   heardNotes:Math.max(0,Math.floor(saved?.reviews?.[n]?.heardNotes||0)),
   lastId:typeof saved?.reviews?.[n]?.lastId==='string'?saved.reviews[n].lastId:null,
   lastBar:Number.isSafeInteger(saved?.reviews?.[n]?.lastBar)?saved.reviews[n].lastBar:-1000
  }]));
 }
 snapshot(){return {version:1,
  recordings:this.recordings.map(r=>({...r,participants:[...r.participants],
    events:r.events.map(e=>({...e,expression:e.expression?{...e.expression}:undefined}))})),
  reviews:Object.fromEntries(MUSICIANS.map(n=>[n,{...this.reviews[n]}]))};
 }
 list(){return [...this.recordings].reverse().map(({events,...r})=>({...r,noteCount:events.length}));}
 get(id){return this.recordings.find(r=>r.id===id)||null;}
 begin(bar,time=null){
  if(!this.active)this.active={startBar:bar,firstAt:null,events:[]};
  if(this.active.firstAt==null&&valid(time))this.active.firstAt=time;
 }
 capture(kind,args,bar,space,members=null){
  const session=this.active;
  if(!session||!KINDS.includes(kind)||session.events.length>=MAX_EVENTS)return;
  const pitched=['guitar','voice','violin'].includes(kind);
  const at=pitched?args[1]:args[0];
  const meta=pitched?(kind==='voice'||kind==='violin'?args[5]:args[4]):args[2];
  const source=MUSICIANS.includes(meta?.player)?meta.player:
    kind==='voice'?'Murmur':kind==='guitar'?'Riff':'Pip';
  if(Array.isArray(members)&&members.length>=2&&!members.includes(source))return;
  if(!Array.isArray(members)&&source==='Murmur'&&space&&space.distance('Murmur','Pip')>410&&
    space.distance('Murmur','Riff')>410)return;
  if(!valid(at)||at<0)return;
  if(session.firstAt==null)session.firstAt=at;
  const ms=Math.max(0,Math.round((at-session.firstAt)*1000));
  const candidate={kind,source,ms,volume:pitched?args[2]:args[1]};
  if(pitched){candidate.freq=args[0];candidate.duration=args[3];}
  if(kind==='voice'||kind==='violin')candidate.expression=args[4];
  const cleaned=cleanEvent(candidate);
  if(cleaned)session.events.push(cleaned);
 }
 finish(bar){
  const a=this.active;this.active=null;
  if(!a||a.events.length===0)return null;
  // Scheduling across instruments is not necessarily chronological.
  a.events.sort((x,y)=>x.ms-y.ms);
  const endMs=Math.max(...a.events.map(e=>e.ms+Math.round((e.duration||.05)*1000)));
  const r={id:'jam-'+a.startBar+'-'+bar,startBar:a.startBar,endBar:bar,
   durationMs:Math.min(MAX_MS,endMs),
   participants:MUSICIANS.filter(n=>a.events.some(e=>e.source===n)),
   events:a.events};
  this.recordings.push(r);
  if(this.recordings.length>COUNT)this.recordings.shift();
  return r;
 }
 discard(){this.active=null;}
 // Voluntary room listening: a deck plays a real past recording into the
 // room, not into anyone's skill or simulation-performance counters.
 startListening(name,bar){
  const who=this.reviews[name];
  if(!who||!this.recordings.length||this.deck||bar-who.lastBar<32)return null;
  const choices=this.recordings.filter(r=>r.id!==who.lastId);
  const pool=choices.length?choices:this.recordings;
  const tape=pool[Math.floor(Math.random()*pool.length)];
  this.deck={id:tape.id,by:name,startAt:null,next:0};
  who.count++;who.lastId=tape.id;who.lastBar=bar;
  return tape;
 }
 playDeck(t,audio,space){
  const deck=this.deck;if(!deck)return;
  const tape=this.get(deck.id);
  if(!tape){this.deck=null;return;}
  if(deck.startAt==null)deck.startAt=t+.08;
  const horizon=t+.6;
  while(deck.next<tape.events.length){
   const e=tape.events[deck.next],when=deck.startAt+e.ms/1000;
   if(when>horizon)break;
   const marker={player:'Recording'};
   if(e.kind==='voice'||e.kind==='violin')
     audio[e.kind]?.(e.freq,when,e.volume,e.duration,e.expression||{},marker);
   else if(e.kind==='guitar')
     audio.guitar?.(e.freq,when,e.volume,e.duration,marker);
   else audio[e.kind]?.(when,e.volume,marker);
   // This is exposure to actual archival notes, NOT new instrument practice.
   for(const name of MUSICIANS){
     if(space?.at(name,'recording',102)&&!space.traveling(name))
       this.reviews[name].heardNotes++;
   }
   deck.next++;
  }
  if(deck.next>=tape.events.length&&t>deck.startAt+tape.durationMs/1000+.5)
    this.deck=null;
 }
}
