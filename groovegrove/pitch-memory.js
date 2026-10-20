/*
 * GrooveGrove / pitch relationships, passive first milestone.
 * Observe genuine scheduled pitched notes only, after proximity/room acoustics
 * permit hearing. Musician and listener experiences stay separate. No note
 * names, twelve-tone rules, taste score, choices, motor skills or speech.
 * Transposition-invariant relationships are quantized in 25-cent bins solely
 * to tolerate imperfect execution, not to award theoretical knowledge.
 */
const NAMES=['Pip','Riff','Murmur'];
const PITCHED=new Set(['voice','guitar','violin']);
const MAX_PATTERNS=96,MAX_PENDING=1200;
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
const empty=()=>({heardNotes:0,playedNotes:0,patterns:new Map()});
export class PitchMemory{
 constructor(saved=null){
  this.people={};
  for(const name of NAMES){
   const old=saved?.people?.[name],p=empty();
   p.heardNotes=count(old?.heardNotes);p.playedNotes=count(old?.playedNotes);
   if(Array.isArray(old?.patterns))for(const raw of old.patterns.slice(0,MAX_PATTERNS)){
    const rec=entry(raw);if(rec)p.patterns.set(rec.key,rec);
   }
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
  const p=this.people[listener],m=p.patterns;
  let rec=m.get(key);
  if(rec){
   // One observation of a shape per bar, even for dense repeated chords.
   if(rec.lastBar===bar)return;
   rec.count=Math.min(1000000000,rec.count+1);
   rec.lastBar=bar;rec.from=source;
   if(source===listener)rec.played++;
   else rec.heard++;
   return;
  }
  if(m.size>=MAX_PATTERNS){
   let victim=null;
   for(const v of m.values())
     if(!victim||v.count<victim.count||
        (v.count===victim.count&&v.lastBar<victim.lastBar))victim=v;
   // One-off novelty doesn't wipe out well-observed relationships.
   if(victim.count>1)return;
   m.delete(victim.key);
  }
  rec={key,count:1,firstBar:bar,lastBar:bar,from:source,
    played:source===listener?1:0,heard:source===listener?0:1};
  m.set(key,rec);
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
  return {version:1,people:Object.fromEntries(NAMES.map(name=>{
   const p=this.people[name];
   return [name,{heardNotes:p.heardNotes,playedNotes:p.playedNotes,
     patterns:[...p.patterns.values()].map(x=>({...x}))}];
  }))};
 }
 report(name){
  const p=this.people[name];if(!p)return null;
  const rows=[...p.patterns.values()];
  const recurring=rows.filter(x=>x.count>=2);
  const newest=recurring.sort((a,b)=>b.lastBar-a.lastBar||b.count-a.count)[0]||null;
  return {heardNotes:p.heardNotes,playedNotes:p.playedNotes,
   shapes:rows.length,recurring:recurring.length,
   newest:newest?{...newest}:null};
 }
}
