/*
 * GrooveGrove Pass 003. A musician hears the scheduled note-onset stream
 * (not microphone audio), tries occasional motor variations, and saves
 * context-specific outcomes. Metrics describe timing and spacing; they are
 * NOT a claim that a machine has discovered objective musical taste.
 */
export const VARIATIONS=Object.freeze({
 Pip:Object.freeze({
  ghost:Object.freeze({label:'soft ghost snare',skill:null}),
  breath:Object.freeze({label:'breathing room',skill:null}),
  offbeat:Object.freeze({label:'offbeat kick',skill:'offbeatPulse'})
 }),
 Riff:Object.freeze({
  soft:Object.freeze({label:'gentle strum',skill:null}),
  breath:Object.freeze({label:'leave a rest',skill:null}),
  voicing:Object.freeze({label:'chord inversion',skill:'openChords'}),
  answer:Object.freeze({label:'answering phrase',skill:'callResponse'})
 })
});
const PEOPLE=['Pip','Riff'];
const cap=(n,min,max)=>Math.max(min,Math.min(max,n));
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const validNumber=(v,f=0)=>Number.isFinite(v)?v:f;
const safeRecord=r=>r && PEOPLE.includes(r.who) && typeof r.variant==='string' && typeof r.context==='string'
 && Number.isFinite(r.bar)&&Number.isFinite(r.cost)&&Number.isFinite(r.overlap)
 && Number.isFinite(r.attackCount)&&Number.isFinite(r.driftMs)&&Number.isFinite(r.coverage);
export class ListeningJournal{
 constructor(saved=null,random=Math.random){
  this.random=random;
  this.memory={Pip:[],Riff:[]};
  this.texture={Pip:'unknown',Riff:'unknown'};
  this.latest={Pip:null,Riff:null};
  this.active=null;
  this.events=[];
  this.decisions={Pip:null,Riff:null};
  this.experiments={Pip:0,Riff:0};
  this.newFindings=[];
  if(saved&&typeof saved==='object'){
   for(const who of PEOPLE){
    if(Array.isArray(saved.memory?.[who]))this.memory[who]=saved.memory[who].filter(safeRecord).slice(-64).map(x=>({
     who,variant:x.variant,context:x.context,bar:x.bar,cost:cap(x.cost,0,4),
     overlap:cap(x.overlap,0,1),attackCount:cap(x.attackCount,0,80),
     driftMs:cap(x.driftMs,0,500),coverage:cap(x.coverage,0,1),
     partnerAttacks:cap(validNumber(x.partnerAttacks),0,80)
    }));
    if(['quiet','open','busy','unknown'].includes(saved.texture?.[who]))this.texture[who]=saved.texture[who];
    this.latest[who]=this.memory[who].at(-1)||null;
    this.experiments[who]=this.memory[who].filter(r=>r.variant!=='steady').length;
   }
  }
 }
 snapshot(){return {memory:{Pip:[...this.memory.Pip],Riff:[...this.memory.Riff]},texture:{...this.texture}};}
 canTry(who,skills){
  return Object.entries(VARIATIONS[who]).filter(([,v])=>!v.skill || skills?.[who]?.includes(v.skill)).map(([id])=>id);
 }
 choose(who,context,skills){
  const options=this.canTry(who,skills);
  if(!options.length || this.random()>.29)return null;
  // Exploration remains possible even when experience favors a familiar variation.
  if(this.random()<.34)return options[Math.floor(this.random()*options.length)];
  const baseline=this.memory[who].filter(r=>r.variant==='steady'&&r.context===context).slice(-7);
  if(baseline.length<2)return options[Math.floor(this.random()*options.length)];
  const base=mean(baseline.map(r=>r.cost));
  const evaluations=options.map(v=>{
   const rows=this.memory[who].filter(r=>r.variant===v&&r.context===context).slice(-6);
   return {variant:v,samples:rows.length,delta:rows.length?mean(rows.map(r=>r.cost))-base:null};
  });
  // Untried ideas remain candidates, rather than assuming a lack of evidence
  // is evidence of poor music.
  const unexplored=evaluations.filter(x=>x.samples<2);
  if(unexplored.length && this.random()<.55)
   return unexplored[Math.floor(this.random()*unexplored.length)].variant;
  const plausible=evaluations.filter(x=>x.samples>=2&&x.delta<.04).sort((a,b)=>a.delta-b.delta);
  if(plausible.length)return plausible[0].variant;
  return null; // stick with the well-supported groove
 }
 beginBar({bar,mode,active,skills}){
  this.events=[];
  const current={bar,mode,active:{...active},choices:{Pip:null,Riff:null},contexts:{}};
  for(const who of PEOPLE){
   const context=mode+'/'+this.texture[who];
   current.contexts[who]=context;
   // One expressive change only every fourth bar. A stable groove is primary.
   if(active[who] && bar>0 && bar%4===0)current.choices[who]=this.choose(who,context,skills);
   this.decisions[who]=current.choices[who];
  }
  this.active=current;
 }
 variation(who){return this.decisions[who];}
 hear({who,kind,time,bar,beat,velocity=0,offsetMs=0,extra=false,pitch=null}){
  if(!this.active || this.active.bar!==bar || !this.active.active[who])return;
  if(!Number.isFinite(time)||!Number.isFinite(beat))return;
  this.events.push({who,kind,time,bar,beat,velocity:cap(validNumber(velocity),0,2),
    offsetMs:cap(validNumber(offsetMs),-500,500),extra:!!extra,
    pitch:Number.isFinite(pitch)?pitch:null});
  if(this.events.length>112)this.events.shift();
 }
 finishBar(bar){
  if(!this.active || this.active.bar!==bar)return [];
  const discoveries=[];
  for(const who of PEOPLE){
   const others=this.events.filter(e=>e.who!==who&&e.kind!=='hat');
   const own=this.events.filter(e=>e.who===who);
   if(!own.length){
    this.texture[who]=others.length===0?'quiet':others.length>=7?'busy':'open';
    continue;
   }
   const attacks=own.filter(e=>e.kind!=='hat');
   const hits=attacks.filter(e=>others.some(o=>Math.abs(o.time-e.time)<.085)).length;
   const overlap=attacks.length?hits/attacks.length:0;
   // Track overlapping attack energy separately: playing softer should be
   // distinguishable from merely scheduling the same onsets at lower volume.
   const pressure=attacks.length?mean(attacks.map(e=>{
     const coincident=others.filter(o=>Math.abs(o.time-e.time)<.085);
     return coincident.length?Math.min(1,e.velocity*Math.max(...coincident.map(o=>o.velocity))):0;
   })):0;
   const timing=attacks.filter(e=>!e.extra).map(e=>Math.abs(e.offsetMs));
   // How many of four beat cells contain a meaningful attack?
   const coverage=new Set(attacks.map(e=>Math.floor(e.beat)%4)).size/4;
   const driftMs=mean(timing);
   // A transparent, imperfect timing-and-spacing proxy. This isn't musical
   // goodness. Penalize dropped beats so "play nothing" cannot win by default.
   const cost=cap(.42*cap(driftMs/140,0,1)+.23*overlap+.15*pressure+.2*(1-coverage),0,2);
   const variant=this.active.choices[who]||'steady';
   const record={who,variant,context:this.active.contexts[who],bar,cost,overlap,
     attackCount:attacks.length,driftMs,coverage,partnerAttacks:others.length};
   this.memory[who].push(record);
   if(this.memory[who].length>64)this.memory[who].shift();
   this.latest[who]=record;
   this.texture[who]=others.length===0?'quiet':others.length>=7?'busy':'open';
   if(variant!=='steady'){
    this.experiments[who]++;
    discoveries.push({
      who,variant,label:VARIATIONS[who][variant]?.label||variant,
      driftMs,overlap,partnerAttacks:others.length,context:record.context,bar
    });
   }
  }
  this.active=null;
  if(discoveries.length)this.newFindings.push(...discoveries);
  if(this.newFindings.length>10)this.newFindings.splice(0,this.newFindings.length-10);
  return discoveries;
 }
 report(who){
  const records=this.memory[who]||[];
  const tested=records.filter(r=>r.variant!=='steady');
  const recent=tested.slice(-4).reverse();
  const preference={};
  for(const v of Object.keys(VARIATIONS[who])){
   const batches=tested.filter(r=>r.variant===v);
   preference[v]={trials:batches.length,averageCost:batches.length?mean(batches.map(x=>x.cost)):null};
  }
  return {name:who,observations:records.length,experiments:tested.length,
   partnerTexture:this.texture[who],latest:this.latest[who],recent,preference};
 }
}