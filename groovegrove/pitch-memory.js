/*
 * GrooveGrove / pitch relationships, passive first milestone.
 * Observe genuine scheduled pitched notes only, after proximity/room acoustics
 * permit hearing. Musician and listener experiences stay separate. No note
 * names, twelve-tone rules, taste score, choices, motor skills or speech.
 * Transposition-invariant relationships are quantized in 25-cent bins solely
 * to tolerate imperfect execution, not to award theoretical knowledge.
 * Two bounded tiers: always-open recent working memory and durable recurring
 * relationships. Full long-term storage replaces the stalest relationship;
 * it never becomes a closed club. Old v1 memories are migrated intact.
 */
const NAMES=['Pip','Riff','Murmur'];
const PITCHED=new Set(['voice','guitar','violin']);
export const WORKING_LIMIT=160,LONG_TERM_LIMIT=256;
const MAX_PENDING=1200;
const valid=n=>Number.isFinite(n);
const count=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const bound=(n,a,b)=>Math.min(b,Math.max(a,n));
const cents=(a,b)=>1200*Math.log2(b/a);
const bin=n=>Math.round(bound(n,-2400,2400)/25)*25;
const entry=x=>{
 if(!x||typeof x.key!=='string'||!/^(seq[2-5]|together):[-0-9:]+$/.test(x.key))return null;
 if(!Number.isSafeInteger(x.firstBar)||x.firstBar<0||
   !Number.isSafeInteger(x.lastBar)||x.lastBar<x.firstBar)return null;
 return {key:x.key,count:bound(count(x.count),1,1000000000),
   firstBar:x.firstBar,lastBar:x.lastBar,
   from:NAMES.includes(x.from)?x.from:null,
   played:count(x.played),heard:count(x.heard)};
};
const empty=()=>({heardNotes:0,playedNotes:0,
  // patterns is the v1 long-term map; keep the field stable for migrations.
  patterns:new Map(),working:new Map(),evictedWorking:0,evictedLongTerm:0});
export class PitchMemory{
 constructor(saved=null){
  this.people={};
  for(const name of NAMES){
   const old=saved?.people?.[name],p=empty();
   p.heardNotes=count(old?.heardNotes);p.playedNotes=count(old?.playedNotes);
   // Original 96 entries were already recurring and must not be reset.
   // Treat every existing v1 record as long-term, including one-off entries.
   if(Array.isArray(old?.patterns))for(const raw of old.patterns.slice(0,LONG_TERM_LIMIT)){
    const rec=entry(raw);if(rec)p.patterns.set(rec.key,rec);
   }
   if(Array.isArray(old?.working))for(const raw of old.working.slice(0,WORKING_LIMIT)){
    const rec=entry(raw);
    if(rec&&!p.patterns.has(rec.key))p.working.set(rec.key,rec);
   }
   p.evictedWorking=count(old?.evictedWorking);
   p.evictedLongTerm=count(old?.evictedLongTerm);
   this.people[name]=p;
  }
  // Transient note queues never enter the persisted record. Safari and the
  // Railway server use different audio-clock origins after restarts.
  this.pending=[];this.flows=Object.fromEntries(NAMES.map(n=>[n,{}]));
  this.cross=Object.fromEntries(NAMES.map(n=>[n,null]));
 }
 enqueue({listener,source,kind,bar,at,pitch}){
  if(!NAMES.includes(listener)||!NAMES.includes(source)||!PITCHED.has(kind)||
     !Number.isSafeInteger(bar)||bar<0||!valid(at)||at<0||
     !valid(pitch)||pitch<40||pitch>2000)return;
  this.pending.push({listener,source,kind,bar,at,pitch});
  if(this.pending.length>MAX_PENDING)this.pending.shift();
 }
 flush(beforeAt=Infinity){
  const ready=[],waiting=[];
  for(const n of this.pending)(n.at<=beforeAt?ready:waiting).push(n);
  this.pending=waiting;
  ready.sort((a,b)=>a.at-b.at||NAMES.indexOf(a.source)-NAMES.indexOf(b.source));
  for(const n of ready)this.observe(n);
 }
 remember(listener,key,bar,source){
  const p=this.people[listener],long=p.patterns,short=p.working;
  let rec=long.get(key);
  if(rec){
   if(rec.lastBar===bar)return;
   rec.count=Math.min(1000000000,rec.count+1);
   rec.lastBar=bar;rec.from=source;
   if(source===listener)rec.played++;
   else rec.heard++;
   return;
  }
  rec=short.get(key);
  if(rec){
   // Only distinct observed bars count as repeated encounters.
   if(rec.lastBar===bar)return;
   rec.count=Math.min(1000000000,rec.count+1);
   rec.lastBar=bar;rec.from=source;
   if(source===listener)rec.played++;
   else rec.heard++;
   // Frequency of observation, NOT an assertion that the musician likes it.
   if(rec.count>=2){
    short.delete(key);
    if(long.size>=LONG_TERM_LIMIT){
     // No hard lock at capacity. Recency, not a taste or theoretical score,
     // decides which older record leaves the bounded permanent collection.
     let stale=null;
     for(const old of long.values())
      if(!stale||old.lastBar<stale.lastBar||
        (old.lastBar===stale.lastBar&&old.count<stale.count))stale=old;
     if(stale){long.delete(stale.key);p.evictedLongTerm++;}
    }
    long.set(key,rec);
   }
   return;
  }
  // Every new shape gets a chance in working memory, including after the
  // long-term catalog is full. We never reject novelty at the door.
  if(short.size>=WORKING_LIMIT){
   let oldest=null;
   for(const old of short.values())
    if(!oldest||old.lastBar<oldest.lastBar||
      (old.lastBar===oldest.lastBar&&old.firstBar<oldest.firstBar))oldest=old;
   if(oldest){short.delete(oldest.key);p.evictedWorking++;}
  }
  rec={key,count:1,firstBar:bar,lastBar:bar,from:source,
    played:source===listener?1:0,heard:source===listener?0:1};
  short.set(key,rec);
 }
 observe(n){
  const p=this.people[n.listener];
  if(n.listener===n.source)p.playedNotes++;
  else p.heardNotes++;
  // Cross-source simultaneous sounds can share a relationship even though
  // they belong to different melodic streams.
  const across=this.cross[n.listener];
  if(across&&across.source!==n.source&&
     Math.abs(n.at-across.at)<.13&&n.bar-across.bar<=1){
   this.remember(n.listener,'together:'+Math.abs(bin(cents(across.pitch,n.pitch))),
     n.bar,n.source);
  }
  this.cross[n.listener]=n;
  const flow=this.flows[n.listener],stream=flow[n.source]||(flow[n.source]=[]);
  const last=stream.at(-1);
  if(last){
   const dt=n.at-last.at;
   if(dt>=0&&dt<.13){
    this.remember(n.listener,'together:'+Math.abs(bin(cents(last.pitch,n.pitch))),
      n.bar,n.source);
    return; // simultaneous chord tones do not masquerade as a melody
   }
   if(dt<.15||dt>3.4)stream.length=0;
  }
  stream.push(n);
  if(stream.length>5)stream.shift();
  for(let len=2;len<=stream.length;len++){
   const seq=stream.slice(-len),steps=[];
   for(let i=1;i<seq.length;i++)steps.push(bin(cents(seq[i-1].pitch,seq[i].pitch)));
   this.remember(n.listener,'seq'+len+':'+steps.join(':'),n.bar,n.source);
  }
 }
 snapshot(){
  return {version:2,people:Object.fromEntries(NAMES.map(name=>{
   const p=this.people[name];
   return [name,{heardNotes:p.heardNotes,playedNotes:p.playedNotes,
     patterns:[...p.patterns.values()].map(x=>({...x})),
     working:[...p.working.values()].map(x=>({...x})),
     evictedWorking:p.evictedWorking,evictedLongTerm:p.evictedLongTerm}];
  }))};
 }
 report(name){
  const p=this.people[name];if(!p)return null;
  const rows=[...p.patterns.values()];
  const recurring=rows.filter(x=>x.count>=2);
  const newest=recurring.sort((a,b)=>b.lastBar-a.lastBar||b.count-a.count)[0]||null;
  return {heardNotes:p.heardNotes,playedNotes:p.playedNotes,
   shapes:rows.length+p.working.size,recurring:recurring.length,
   working:p.working.size,longTerm:p.patterns.size,
   workingLimit:WORKING_LIMIT,longTermLimit:LONG_TERM_LIMIT,
   evictedWorking:p.evictedWorking,evictedLongTerm:p.evictedLongTerm,
   newest:newest?{...newest}:null};
 }
}
