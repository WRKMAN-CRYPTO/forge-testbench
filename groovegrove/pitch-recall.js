/*
 * GrooveGrove / voluntary pitch recall, first active milestone.
 *
 * A musician may revisit a SEQUENCE they genuinely heard or played and
 * remembered long term. No score for "good" music, genre classification,
 * fixed favorite, imposed performances, extra note onsets or motor skill boost.
 * The ear remains authoritative and read-only. Chord (together:) memories
 * stay observational for this milestone.
 */
const NAMES=['Pip','Riff','Murmur'],KINDS=['voice','guitar','violin'];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const safe=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const validBar=n=>Number.isSafeInteger(n)&&n>=0;
const safeLog=e=>e&&validBar(e.bar)&&KINDS.includes(e.kind)&&
  typeof e.key==='string'&&/^seq[2-5]:(?:-?\d+:)*-?\d+$/.test(e.key)?
  {bar:e.bar,kind:e.kind,key:e.key}:null;

/** Parse only bounded authentic relative melodic contours (in cents). */
export function parseContour(key){
 if(typeof key!=='string')return null;
 const match=/^seq([2-5]):(-?\d+(?::-?\d+)*)$/.exec(key);
 if(!match)return null;
 const length=Number(match[1]);
 const cents=match[2].split(':').map(Number);
 if(cents.length!==length-1||cents.some(c=>!Number.isSafeInteger(c)||
     c%25!==0||Math.abs(c)>900))return null;
 const offsets=[0];let current=0;
 for(const step of cents){
  current+=step;
  if(Math.abs(current)>1200)return null;
  offsets.push(current);
 }
 // A whole phrase of repeated notes is still valid, if it was observed.
 return offsets;
}
const tune=(pitch,step,min,max)=>{
 let n=pitch*Math.pow(2,step/1200);
 if(!Number.isFinite(n)||n<=0)return pitch;
 while(n<min)n*=2;
 while(n>max)n/=2;
 return n>=min&&n<=max?n:clamp(n,min,max);
};
export class PitchRecall{
 constructor(ear,saved=null,random=Math.random){
  this.ear=ear;
  this.random=random;
  this.people={};this.active={};
  for(const name of NAMES){
   const old=saved?.people?.[name];
   const recent=Array.isArray(old?.recent)?old.recent.map(safeLog).filter(Boolean).slice(0,12):[];
   const byKind=Object.fromEntries(KINDS.map(k=>[k,safe(old?.byKind?.[k])]));
   const counts=KINDS.reduce((sum,k)=>sum+byKind[k],0);
   const total=Math.max(safe(old?.revisits),counts,recent.length);
   this.people[name]={revisits:total,byKind,recent};
   this.active[name]=null;
  }
 }
 // Only one's own promoted long-term memory, never a combined group library.
 // Equal opportunity for eligible entries, not an invented taste hierarchy.
 choose(name,length=null,allowTransform=false){
  if(!NAMES.includes(name))return null;
  const long=this.ear?.people?.[name]?.patterns;
  if(!(long instanceof Map)||!long.size)return null;
  let picked=null,seen=0;
  for(const row of long.values()){
   const offsets=parseContour(row?.key);
   if(!offsets||(length!=null&&offsets.length!==length))continue;
   seen++;
   if(this.random()<1/seen)picked={key:row.key,offsets};
  }
  if(!picked||!allowTransform||this.random()>=.32)return picked;
  // Rework an actual memory rather than inventing a note sequence. Neither
  // inversion nor retrograde claims a new learned memory or improved motor skill.
  const original=picked.offsets;
  const variant=this.random()<.5?'inversion':'retrograde';
  const offsets=variant==='inversion'?original.map(v=>v===0?0:-v):
    [...original].reverse().map(v=>v-original.at(-1));
  if(offsets.some(v=>Math.abs(v)>1200))return picked;
  return {...picked,offsets,variant};
 }
 // Called only AFTER normal willingness and a multi-note vocal phrase exists.
 voice(name,steps,bar,allowTransform=false){
  if(!NAMES.includes(name)||!validBar(bar)||!Array.isArray(steps)||
    steps.length<2||steps.length>5)return null;
  const latest=this.people[name].recent[0];
  if(latest&&bar-latest.bar<6)return null;
  if(this.random()>=.25)return null;
  return this.choose(name,steps.length,allowTransform);
 }
 // Called only for an already-scheduled single pitched instrumental onset.
 // Future existing onsets carry successive steps; no additional notes appear.
 instrument(name,kind,pitch,bar,min,max,emit,allowTransform=false){
  // Caller supplies the existing note scheduling path. No callback means no
  // actual note, so no memory-use credit or instrument plan advancement.
  if(typeof emit!=='function')return pitch;
  if(!NAMES.includes(name)||!['guitar','violin'].includes(kind)||
    !validBar(bar)||!Number.isFinite(pitch)||pitch<min||pitch>max){
   emit(pitch);return pitch;
  }
  let a=this.active[name];
  if(a&&(a.kind!==kind||bar-a.lastBar>6||bar<a.lastBar)){
   this.active[name]=null;a=null;
  }
  if(!a){
   const recent=this.people[name].recent[0];
   let choice=null;
   if((!recent||bar-recent.bar>=6)&&this.random()<.16)
    choice=this.choose(name,null,allowTransform);
   // The first sounding note is always the artist's original chosen pitch.
   emit(pitch);
   if(choice)this.active[name]={kind,key:choice.key,offsets:choice.offsets,
     anchor:pitch,index:1,lastBar:bar,credited:false};
   return pitch;
  }
  const result=tune(a.anchor,a.offsets[a.index],min,max);
  emit(result); // If scheduling throws, neither progress nor credit occurs.
  a.index++;a.lastBar=bar;
  // Only a real second scheduled note is evidence of remembered use.
  if(!a.credited){
   this.record(name,{bar,kind,key:a.key});
   a.credited=true;
  }
  if(a.index>=a.offsets.length)this.active[name]=null;
  return result;
 }
 // Called after real vocal notes were scheduled, never on a proposed phrase.
 record(name,{bar,kind,key}){
  if(!NAMES.includes(name)||!validBar(bar)||!KINDS.includes(kind)||
    !parseContour(key))return false;
  const p=this.people[name];p.revisits++;p.byKind[kind]++;
  p.recent.unshift({bar,kind,key});
  if(p.recent.length>12)p.recent.length=12;
  return true;
 }
 snapshot(){
  return {version:1,people:Object.fromEntries(NAMES.map(name=>{
   const p=this.people[name];
   return [name,{revisits:p.revisits,byKind:{...p.byKind},
     recent:p.recent.map(x=>({...x}))}];
  }))};
 }
 report(name){
  const p=this.people[name];
  return p?{revisits:p.revisits,byKind:{...p.byKind},last:p.recent[0]?{...p.recent[0]}:null}:null;
 }
}
