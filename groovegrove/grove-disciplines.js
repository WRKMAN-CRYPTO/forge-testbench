/*
 * GrooveGrove: Musical Disciplines, pass 010.
 * People retain cross-instrument musicianship; instruments teach their own motor
 * technique. No fixed classes, level caps or mastery gates.
 */
export const INSTRUMENTS=Object.freeze(['drums','guitar','violin']);
export const MUSICIANS=Object.freeze(['Pip','Riff','Murmur']);
const DEFAULT=Object.freeze({Pip:'drums',Riff:'guitar',Murmur:'voice'});
const validInstrument=id=>INSTRUMENTS.includes(id)||id==='voice'||id==='none';
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const logProgress=(attempts,scale=1500)=>clamp(Math.log1p(Math.max(0,attempts||0))/Math.log1p(scale),0,1);
const emptyPractice=()=>({notes:0,seconds:0,holds:0,lastPitch:null,lastBar:null,
  firstNote:null,recent:[],motorBiasMs:0,motorJitterMs:42,measuredAttacks:0,
  lastArticulation:null});
const restoration=raw=>{
 const p=emptyPractice();
 p.notes=count(raw?.notes);p.seconds=clamp(finite(raw?.seconds),0,1e12);
 p.holds=count(raw?.holds);
 p.lastPitch=Number.isFinite(raw?.lastPitch)?raw.lastPitch:null;
 p.lastBar=Number.isSafeInteger(raw?.lastBar)?raw.lastBar:null;
 p.firstNote=raw?.firstNote&&Number.isSafeInteger(raw.firstNote.bar)?
   {...raw.firstNote}:null;
 p.motorBiasMs=clamp(finite(raw?.motorBiasMs),-130,130);
 p.motorJitterMs=clamp(finite(raw?.motorJitterMs,42),7,75);
 p.measuredAttacks=count(raw?.measuredAttacks);
 p.lastArticulation=typeof raw?.lastArticulation==='string'?raw.lastArticulation.slice(0,45):null;
 p.recent=Array.isArray(raw?.recent)?raw.recent.filter(x=>x&&
   Number.isSafeInteger(x.bar)&&Number.isFinite(x.pitch)).slice(0,12)
   .map(x=>({...x})):[];
 return p;
};
const safeChoice=(n,f)=>validInstrument(n)?n:f;
export class MusicalDisciplines {
 constructor(saved=null){
   this.people={};this.instruments={};
   const allocated=new Set();
   for(const name of MUSICIANS){
     const old=saved?.people?.[name];
     let current=safeChoice(old?.current,DEFAULT[name]);
     // A single violin/guitar/kit is never owned by two musicians.
     if(INSTRUMENTS.includes(current)&&allocated.has(current))
       current=name==='Murmur'?'voice':'none';
     if(INSTRUMENTS.includes(current))allocated.add(current);
     this.people[name]={
       current,interest:INSTRUMENTS.includes(old?.interest)||
         (name==='Murmur'&&old?.interest==='voice')||
         (name!=='Murmur'&&old?.interest==='none')?old.interest:null,
       lastSwitch:Number.isSafeInteger(old?.lastSwitch)?old.lastSwitch:-45,
       lastDecision:Number.isSafeInteger(old?.lastDecision)?old.lastDecision:-80,
       bowUntilBeat:Number.isSafeInteger(old?.bowUntilBeat)?old.bowUntilBeat:0,
       practice:Object.fromEntries(INSTRUMENTS.map(id=>[id,restoration(old?.practice?.[id])])),
       studies:Array.isArray(old?.studies)?old.studies.filter(x=>x&&
         typeof x.book==='string'&&typeof x.skill==='string').slice(0,30)
         .map(x=>({...x})):[],
       discoveries:Array.isArray(old?.discoveries)?old.discoveries.filter(x=>x&&
         typeof x.instrument==='string').slice(0,20).map(x=>({...x})):[]
     };
   }
   for(const id of INSTRUMENTS){
     const owner=MUSICIANS.find(n=>this.people[n].current===id)||null;
     this.instruments[id]={id,owner,home:'studio'};
   }
 }
 snapshot(){return {version:1,instruments:Object.fromEntries(INSTRUMENTS.map(id=>[id,{...this.instruments[id]}])),
   people:Object.fromEntries(MUSICIANS.map(n=>{const p=this.people[n];
     return [n,{current:p.current,interest:p.interest,lastSwitch:p.lastSwitch,
       lastDecision:p.lastDecision,bowUntilBeat:p.bowUntilBeat,
       practice:Object.fromEntries(INSTRUMENTS.map(id=>[id,{...p.practice[id],
         recent:p.practice[id].recent.map(x=>({...x})),
         firstNote:p.practice[id].firstNote?{...p.practice[id].firstNote}:null}])),
       studies:p.studies.map(x=>({...x})),
       discoveries:p.discoveries.map(x=>({...x}))}];
   }))};}
 current(name){return this.people[name]?.current||DEFAULT[name]||'voice';}
 study(name,{bar,book,skill,topic}){
   const p=this.people[name];if(!p||typeof book!=='string'||typeof skill!=='string')return;
   if(!p.studies.some(s=>s.book===book)){
     p.studies.unshift({bar,book,skill,topic:typeof topic==='string'?topic:'theory'});
     p.studies.length=Math.min(p.studies.length,30);
   }
 }
 // Musical experience belongs to people. A strong drummer can transfer timing
 // and articulations, not years of bow technique he has never actually done.
 // All derived strengths come from scheduled notes, learned books or measured
 // onset precision. Values describe potential vocabulary, not innate talent.
 transfer(name,grove){
   const p=this.people[name],knowledge=new Set(grove.library?.known?.[name]||[]);
   if(!p)return {rhythm:0,melody:0,bowing:0,timingMs:42,skills:knowledge};
   const rhythm=logProgress(p.practice.drums.notes,6000);
   const pitchedNotes=p.practice.guitar.notes+
     (name==='Murmur'?(grove.voiceJournal?.notes||0):0);
   const melody=logProgress(pitchedNotes,5400);
   const bowed=logProgress(p.practice.violin.notes,1800);
   // The original rhythm and guitar models carry real measured motor state.
   // A borrowed instrument gets the player's existing timing, not a fixed
   // per-character violin aptitude assignment.
   const original=name==='Pip'?grove.pip:name==='Riff'?grove.riff:null;
   const baseline=original&&
     ((name==='Pip'&&p.practice.drums.notes>0)||
      (name==='Riff'&&p.practice.guitar.notes>0))
       ?Math.hypot(original.biasMs||0,original.jitterMs||0):null;
   const currentMeasured=p.practice.drums.measuredAttacks>=12?
     Math.hypot(p.practice.drums.motorBiasMs,p.practice.drums.motorJitterMs):null;
   const timingMs=clamp(baseline??currentMeasured??(41-12*rhythm-5*melody),7,75);
   return {rhythm,melody,bowing,timingMs,skills:knowledge,
     rhythmNotes:p.practice.drums.notes,pitchNotes:pitchedNotes};
 }
 holder(id){return this.instruments[id]?.owner||null;}
 available(name,id){return INSTRUMENTS.includes(id) &&
   (!this.instruments[id].owner||this.instruments[id].owner===name);}
 wants(name,id,grove){
   const player=this.people[name],bar=grove.bar;
   const returnToVoice=name==='Murmur'&&id==='voice';
   const takeBreak=name!=='Murmur'&&id==='none';
   if(!player||(!INSTRUMENTS.includes(id)&&!returnToVoice&&!takeBreak)||
      id===player.current||(!returnToVoice&&!takeBreak&&!this.available(name,id))||player.interest||
      grove.library?.busy(name)||bar-player.lastSwitch<24)return false;
   player.interest=id;player.lastDecision=bar;
   grove.space.people[name].lastChoice=bar;
   grove.space.chooseDestination(name,'studio','wondering how '+id+' feels to play',bar);
   grove.space.people[name].purpose=returnToVoice?'returning to their voice':
     takeBreak?'taking a break from instruments':'going to try '+id+' in the studio';
   grove.push(name+(returnToVoice?' wants to sing again.':
     takeBreak?' decides to put their instrument down.':' becomes curious about the '+id+'.'));
   return true;
 }
 switchAtStudio(name,grove){
   const p=this.people[name],id=p?.interest;
   if(!id||(id!=='voice'&&id!=='none'&&!this.available(name,id)))return false;
   if(!grove.space.at(name,'studio',105)||grove.space.traveling(name))return false;
   const previous=p.current;
   if(INSTRUMENTS.includes(previous))this.instruments[previous].owner=null;
   if(INSTRUMENTS.includes(id))this.instruments[id].owner=name;
   p.current=id;p.interest=null;p.lastSwitch=grove.bar;
   p.bowUntilBeat=0;
   // The original guitarist's previous sustained note cannot silence a later
   // return to guitar, because the instrument itself has been set down.
   if(name==='Riff'&&previous==='guitar')grove.riffHoldUntilBeat=0;
   grove.space.people[name].lastChoice=grove.bar;
   grove.space.people[name].purpose='experimenting with '+id+' at the studio';
   if(name==='Murmur')grove.space.people.Murmur.ensembleIntent='solo';
   p.discoveries.unshift({bar:grove.bar,instrument:id,from:previous});
   p.discoveries.length=Math.min(20,p.discoveries.length);
   grove.push(name+(id==='voice'?' puts down '+previous+' and returns to singing.':
     id==='none'?' puts down '+previous+' to listen.':
     ' sets down '+previous+' and picks up the '+id+'.'));
   return true;
 }
 decide(grove){
   const bar=grove.bar;
   for(const name of MUSICIANS){
     const p=this.people[name],person=grove.space.people[name];
     if(p.interest){
       if(INSTRUMENTS.includes(p.interest)&&!this.available(name,p.interest)){
         p.interest=null;person.purpose='the instrument is in use';
       }else if(person.destination!=='studio' && !grove.library.busy(name))
         grove.space.chooseDestination(name,'studio','going to try '+p.interest,bar);
       if(p.interest)this.switchAtStudio(name,grove);
       continue;
     }
     if(grove.library.busy(name)||grove.space.traveling(name)||
        bar-p.lastSwitch<24||bar-p.lastDecision<12)continue;
     // Instrument choice arises from physically visiting the studio, or
     // following an actually heard violin back to its home.
     const inStudio=grove.space.at(name,'studio',112);
     const heard=person.lastHeardViolin;
     const heardViolin=heard&&bar-heard.bar<4 &&
       grove.space.canHear(name,heard.from,'violin')>.06;
     if(!inStudio && !heardViolin)continue;
     const curiosity=clamp(name==='Murmur'?grove.vocalist.curiosity:
       (name==='Pip'?grove.pip:grove.riff).curiosity,0,1);
     if(!inStudio && Math.random()>.08*curiosity)continue;
     // Being engaged in actual practice is a reason to continue, not a
     // level gate. A curious beginner can still change their mind any time.
     const lastPlay=p.current==='voice'&&name==='Murmur'?
       grove.vocalist.lastAttemptBar:p.practice[p.current]?.lastBar;
     const engaged=Number.isFinite(lastPlay)&&bar-lastPlay<=3;
     const desire=(.036+.068*curiosity)*(engaged?.35:1);
     if(inStudio && Math.random()>desire)continue;
     const offered=INSTRUMENTS.filter(id=>id!==p.current&&this.available(name,id));
     // Silence and the human voice require no equipment. They can always
     // relinquish a borrowed instrument without permission or a skill gate.
     if(p.current!=='voice'&&name==='Murmur')offered.push('voice');
     if(p.current!=='none'&&name!=='Murmur')offered.push('none');
     if(!offered.length)continue;
     // A violin can attract the curious, but every available instrument
     // is eligible. Nothing locks the musician into a prescribed sequence.
     const weights=offered.map(id=>{
       if(id==='violin')return 2;
       if(id==='voice'||id==='none')return p.current==='violin'?1.9:.27;
       const explored=p.practice[id].notes;
       return 1.1/(1+Math.log1p(explored)*.08);
     });
     let sum=weights.reduce((a,b)=>a+b,0),roll=Math.random()*sum,chosen=offered[0];
     for(let i=0;i<offered.length;i++){roll-=weights[i];if(roll<=0){chosen=offered[i];break;}}
     if(this.wants(name,chosen,grove))this.switchAtStudio(name,grove);
   }
 }
 record(name,id,{bar,pitch=null,duration=0,articulation=null}={}){
   const person=this.people[name];
   if(!person||person.current!==id||!person.practice[id])return false;
   const record=person.practice[id];
   const d=clamp(finite(duration),0,9);
   record.notes++;record.seconds+=d;
   if(d>=1)record.holds++;
   if(typeof articulation==='string')record.lastArticulation=articulation.slice(0,45);
   if(Number.isFinite(pitch))record.lastPitch=pitch;
   record.lastBar=bar;
   if(!record.firstNote)record.firstNote={bar,pitch,duration:Math.round(d*100)/100};
   if(Number.isFinite(pitch)){
     record.recent.unshift({bar,pitch:Math.round(pitch*100)/100,
       duration:Math.round(d*100)/100,
       articulation:record.lastArticulation});
     if(record.recent.length>12)record.recent.length=12;
   }
   return true;
 }
 play(grove,index,t,audio,{harmony}={}){
   const beat=index%4,bar=Math.floor(index/4);
   for(const name of MUSICIANS){
     const p=this.people[name],instrument=p.current;
     // Existing Pip/Riff/Murmur scores remain owned by the original systems.
     if(instrument==='voice' || (name==='Pip'&&instrument==='drums') ||
        (name==='Riff'&&instrument==='guitar') || grove.library.busy(name) ||
        grove.space.traveling(name)||grove.space.destination(name)==='pond')continue;
     const person=grove.space.people[name],stats=p.practice[instrument];
     const known=grove.library.known[name]||[];
     const offset=name==='Pip'?grove.pip.rhythmOffset()/1000:
       name==='Riff'?grove.riff.rhythmOffset()/1000:
       (Math.random()-.5)*.062;
     const time=t+offset;
     if(instrument==='violin'){
       if(typeof audio.violin!=='function'||index<p.bowUntilBeat||!(beat===0||beat===2)||
          Math.random()>.72)continue;
       const tones=Array.isArray(harmony)&&harmony.length?harmony:[196,246.94,293.66];
       const heard=person.lastHeardGuitar;
       const tuning=heard&&bar-heard.bar<=3&&Number.isFinite(heard.pitch)?
         heard.pitch:null;
       let intended=tuning&&Math.random()<.55?tuning:
         tones[Math.floor(Math.random()*tones.length)]*(Math.random()<.23?2:1);
       intended=clamp(intended,185,800);
       // Violin intonation improves only after real attempts. Transfer from
       // rhythmic/harmonic knowledge can help timing or note selection, not
       // magically grant bowing mastery.
       const acquired=stats.notes;
       const uncertainty=.52/(1+Math.log1p(acquired)*.23);
       const deviation=(Math.random()+Math.random()-1)*uncertainty;
       const pitch=intended*Math.pow(2,deviation/12);
       const duration=(Math.random()<.52?1:2)*(60/98)+
         (Math.random()-.5)*.13;
       const length=clamp(duration,.32,1.4);
       const roughness=clamp(.38/(1+Math.log1p(acquired)*.22)+Math.random()*.12,.015,.55);
       const pressure=clamp(.58+(Math.random()-.5)*.34,.25,.86);
       const expression={roughness,pressure,vibrato:Math.random()<.32?.0035:0};
       audio.violin?.(pitch,time,.24,length,expression,{player:name});
       grove.space.sound(name,'violin',bar,.67,pitch);
       this.record(name,'violin',{bar,pitch,duration:length});
       p.bowUntilBeat=index+Math.max(1,Math.ceil(length/(60/98)));
       if(grove.onNote)grove.onNote({agent:name,time,beat});
     }else if(instrument==='drums'){
       // A new drummer has access to the kit, not Pip's lifetime technique.
       if(beat===0||beat===2){
         audio.kick?.(time,beat===0?.5:.38,{player:name});
         grove.space.sound(name,'kick',bar,.47);
       }else{
         audio.snare?.(time,.41,{player:name});
         grove.space.sound(name,'snare',bar,.41);
       }
       audio.hat?.(time+.025,.31,{player:name});
       this.record(name,'drums',{bar,duration:0});
       if(grove.onNote)grove.onNote({agent:name,time,beat});
     }else if(instrument==='guitar'){
       const tones=Array.isArray(harmony)&&harmony.length?harmony:[196,246.94,293.66];
       if(beat===0||beat===2){
         const n=tones[Math.floor(Math.random()*tones.length)];
         const d=known.includes('openChords')&&Math.random()<.4?1.2:.38;
         audio.guitar?.(n,time,.3,d,{player:name});
         grove.space.sound(name,'guitar',bar,.3,n);
         this.record(name,'guitar',{bar,pitch:n,duration:d});
         if(grove.onNote)grove.onNote({agent:name,time,beat});
       }
     }
   }
 }
}
