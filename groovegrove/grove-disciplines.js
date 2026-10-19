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
       guitarUntilBeat:Number.isSafeInteger(old?.guitarUntilBeat)?old.guitarUntilBeat:0,
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
       lastDecision:p.lastDecision,bowUntilBeat:p.bowUntilBeat,guitarUntilBeat:p.guitarUntilBeat,
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
   return {rhythm,melody,bowing:bowed,timingMs,skills:knowledge,
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
   p.bowUntilBeat=0;p.guitarUntilBeat=0;
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
       if(id==='violin'){
         const profile=this.transfer(name,grove);
         // The interesting new sound can appeal to players carrying years
         // of rhythm or harmony, without requiring or assigning violin mastery.
         return 1.65+profile.rhythm*.72+profile.melody*.28;
       }
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
 // Borrowed drum timing develops from actual scheduled strikes, especially
 // when another musician is audible as a reference. No instant mastery bonus.
 observeMotor(name,errorMs,reference){
   const p=this.people[name]?.practice.drums;
   if(!p||!Number.isFinite(errorMs))return;
   const learning=reference?.03:.012;
   p.motorBiasMs=clamp(p.motorBiasMs-errorMs*learning,-110,110);
   p.motorJitterMs=clamp(p.motorJitterMs*(reference?.9989:.9996),9,75);
   p.measuredAttacks++;
 }
 play(grove,index,t,audio,{harmony}={}){
   const beat=index%4,bar=Math.floor(index/4),beatDur=60/98;
   const harmonyNotes=Array.isArray(harmony)&&harmony.length?harmony:[196,246.94,293.66];
   const hasSound=(person,kind)=>person&&
     bar-person.bar<=3&&Number.isFinite(person.pitch)&&person.pitch>0 &&
     grove.space.canHear(person.listener||'Pip',person.from,kind)>.07;
   for(const name of MUSICIANS){
     const p=this.people[name],instrument=p.current;
     // Original, well-developed Pip drum, Riff guitar and Murmur voice
     // performances remain authored in the established musical engines.
     if(!p || !INSTRUMENTS.includes(instrument) ||
        (name==='Pip'&&instrument==='drums')||
        (name==='Riff'&&instrument==='guitar')||
        grove.library.busy(name)||grove.space.traveling(name)||
        grove.space.destination(name)==='pond')continue;
     const person=grove.space.people[name],stats=p.practice[instrument];
     const known=grove.library.known[name]||[],skills=new Set(known);
     const transfer=this.transfer(name,grove);
     const rhythmic=transfer.rhythm,melodic=transfer.melody;
     // Reuse the original musician's demonstrated motor timing when known.
     // Everyone else's instrument pulse starts less steady and can develop.
     let offsetMs;
     if(name==='Pip')offsetMs=grove.pip.rhythmOffset();
     else if(name==='Riff')offsetMs=grove.riff.rhythmOffset();
     else{
       const jitter=clamp(p.practice.drums.motorJitterMs*(1-.16*melodic),12,62);
       const impulse=(Math.random()+Math.random()+Math.random()-1.5)*1.2;
       offsetMs=clamp(p.practice.drums.motorBiasMs+jitter*impulse,-145,145);
     }
     const time=t+offsetMs/1000;
     const heard=[person.lastHeardGuitar,person.lastHeardViolin,person.lastHeardVoice]
       .filter(h=>h&&Number.isFinite(h.pitch)&&bar-h.bar<=3&&
         grove.space.canHear(name,h.from,h.kind)>.065)
       .sort((a,b)=>b.bar-a.bar);
     const partner=heard[0]||null;
     const silence=skills.has('deliberateSpace')&&beat===3&&bar%4===1;
     if(instrument==='violin'){
       if(typeof audio.violin!=='function'||index<p.bowUntilBeat||silence)continue;
       // A drummer's reliable timing and accents become rhythmic *bow strokes*.
       // The new bow and violin pitch remain unfamiliar until actually played.
       const offbeat=beat%2!==0;
       const rhythmVocabulary=skills.has('offbeatPulse')||skills.has('syncopation')||
         skills.has('ghostNotes');
       const offbeatChance=(.035+rhythmic*.27+
         (rhythmVocabulary?.16:0))*(beat===3?.72:1);
       if(offbeat && Math.random()>offbeatChance)continue;
       if(!offbeat && Math.random()>.78)continue;
       const phraseSkill=skills.has('breathPhrasing');
       const contourSkill=skills.has('melodicContours');
       const listenSkill=skills.has('partnerListening');
       const vowelSkill=skills.has('vowelShapes');
       const pitchKnowledge=melodic*(1+(contourSkill?.18:0));
       const longBowChance=clamp(.46+pitchKnowledge*.32+(phraseSkill?.16:0)-
         rhythmic*.29-(offbeat?.35:0),.07,.86);
       const longBow=!offbeat&&Math.random()<longBowChance;
       const articulation=longBow?'sustained phrase':
         offbeat?'offbeat bow accent':rhythmic>.5?'rhythmic bow pulse':'short bow attempt';
       const available=harmonyNotes.map(n=>clamp(n*(Math.random()<.2?2:1),185,800));
       const candidate=partner&&(listenSkill||melodic>.38)&&Math.random()<.66?
         clamp(partner.pitch,185,800):available[Math.floor(Math.random()*available.length)];
       let intended=candidate;
       if((contourSkill||melodic>.56)&&Number.isFinite(stats.lastPitch)&&
          Math.random()<.46){
         const step=[-3,-2,0,2,3][Math.floor(Math.random()*5)];
         intended=clamp(stats.lastPitch*Math.pow(2,step/12),185,800);
       }
       // Violin-specific pitch and bow skill only follows *violin practice*.
       // Prior guitar/singing helps hear targets, not magically fret a violin.
       const acquired=stats.notes,uncertainty=
         .52/(1+Math.log1p(acquired)*.23)*(1-.2*clamp(pitchKnowledge,0,1));
       const pitch=intended*Math.pow(2,
         ((Math.random()+Math.random()-1)*uncertainty)/12);
       let duration=longBow?beatDur*(1.45+Math.random()*.7):
         beatDur*(.28+Math.random()*.32);
       if(offbeat)duration*=.78;
       duration=clamp(duration,.14,1.52);
       const bowSkill=Math.log1p(acquired);
       let roughness=clamp(.38/(1+bowSkill*.22)+Math.random()*.12,.015,.55);
       if(vowelSkill)roughness*=.92; // vowel shaping informs tonal color
       const precision=clamp(1-transfer.timingMs/80,0,1);
       const pressure=clamp(.58+(Math.random()-.5)*(.36-.15*precision)+
         (offbeat?.07:0),.25,.9);
       const volume=.24*(offbeat?.83:1)*(longBow?.95:1);
       const expression={roughness,pressure,vibrato:
         (longBow&&(skills.has('vowelShapes')||pitchKnowledge>.5)&&Math.random()<.45)
           ?.0025+Math.random()*.003:0};
       audio.violin(pitch,time,volume,duration,expression,{player:name});
       grove.space.sound(name,'violin',bar,volume*2.75,pitch);
       this.record(name,'violin',{bar,pitch,duration,articulation});
       if(grove.onNote)grove.onNote({agent:name,time,beat});
       p.bowUntilBeat=index+Math.max(1,Math.ceil(duration/beatDur));
       // Two short, controlled bow attacks within a beat are a transfer
       // of real rhythmic vocabulary, not a fictitious violin level.
       const secondAccent=!offbeat&&duration<beatDur*.63&&
         (skills.has('offbeatPulse')||skills.has('syncopation')||rhythmic>.72)&&
         Math.random()<.12+rhythmic*.38;
       if(secondAccent){
         const secondAt=time+beatDur*.53;
         const secondDuration=beatDur*(.22+.16*Math.random());
         const nextPitch=clamp(pitch*(skills.has('melodicContours')?Math.pow(2,2/12):1),185,800);
         audio.violin(nextPitch,secondAt,volume*.76,secondDuration,
           {...expression,pressure:clamp(pressure*.83,.22,.78)},
           {player:name});
         grove.space.sound(name,'violin',bar,volume*2,nextPitch);
         this.record(name,'violin',{bar,pitch:nextPitch,duration:secondDuration,
           articulation:'rhythmic second bow stroke'});
         p.bowUntilBeat=Math.max(p.bowUntilBeat,index+1);
         if(grove.onNote)grove.onNote({agent:name,time:secondAt,beat});
       }
     }else if(instrument==='drums'){
       // Alternate drummers borrow the real kit, never Pip's achieved timing.
       if(silence)continue;
       const reference=person.lastHeardDrum?.bar>=bar-2||
         person.lastHeardGuitar?.bar>=bar-2;
       if(beat===0||beat===2){
         audio.kick?.(time,beat===0?.51:.39,{player:name});
         grove.space.sound(name,'kick',bar,.46);
       }else{
         audio.snare?.(time,.43,{player:name});
         grove.space.sound(name,'snare',bar,.43);
       }
       audio.hat?.(time+.025,.3,{player:name});
       if(skills.has('ghostNotes')&&beat===2&&Math.random()<.5)
         audio.snare?.(time+beatDur*.37,.16,{player:name});
       if((skills.has('offbeatPulse')||skills.has('syncopation'))&&
          beat===1&&Math.random()<.44)
         audio.kick?.(time+beatDur*.5,.23,{player:name});
       if((skills.has('callResponse')||skills.has('partnerListening'))&&partner&&
          beat===3&&Math.random()<.42)
         audio.snare?.(time+beatDur*.54,.2,{player:name});
       this.record(name,'drums',{bar,duration:0,articulation:
         skills.has('ghostNotes')?'percussion with ghost accents':'basic beat'});
       this.observeMotor(name,offsetMs,reference);
       if(grove.onNote)grove.onNote({agent:name,time,beat});
     }else if(instrument==='guitar'){
       if(index<p.guitarUntilBeat||silence)continue;
       const offbeat=beat===1||beat===3;
       if(offbeat){
         const allowed=(skills.has('syncopation')||skills.has('offbeatPulse')||
           rhythmic>.61)&&Math.random()<.17+rhythmic*.21;
         if(!allowed)continue;
       }
       const chordKnown=skills.has('openChords');
       const melodySkill=skills.has('melodicContours');
       const longPhrase=skills.has('breathPhrasing')||melodic>.47;
       const canChord=chordKnown && Math.random()<.48+.2*melodic && !offbeat;
       const root=partner&&skills.has('partnerListening')&&
         Math.random()<.58?partner.pitch:null;
       const candidate=root!=null?
         harmonyNotes.reduce((best,n)=>Math.abs(Math.log2(n/root))<
           Math.abs(Math.log2(best/root))?n:best,harmonyNotes[0]):
         harmonyNotes[Math.floor(Math.random()*harmonyNotes.length)];
       const holdChance=.07+.20*melodic+(longPhrase?.14:0);
       const hold=!offbeat&&Math.random()<holdChance;
       const length=hold?beatDur*(1.8+Math.random()*.65):.34+
         (Math.random()-.5)*.13;
       const duration=clamp(length,.14,1.55);
       const voicing=canChord?[candidate,harmonyNotes[1],harmonyNotes[2]]:[candidate];
       for(const [i,pitch] of voicing.entries()){
         const at=time+i*.026;
         const volume=(offbeat?.27:.34)*(i>0?.72:1);
         audio.guitar?.(pitch,at,volume,duration,{player:name});
         grove.space.sound(name,'guitar',bar,volume,pitch);
         this.record(name,'guitar',{bar,pitch,duration,
           articulation:canChord?'learned chord voicing':hold?'held melodic note':
             offbeat?'syncopated guitar note':'picked guitar note'});
       }
       if(hold)p.guitarUntilBeat=index+Math.max(1,Math.ceil(duration/beatDur));
       if(grove.onNote)grove.onNote({agent:name,time,beat});
       if((skills.has('walkingBass')||skills.has('callResponse'))&&
         !hold&&beat===3){
         const next=skills.has('walkingBass')?candidate*.5:candidate*2;
         const at=time+beatDur*.48;
         audio.guitar?.(next,at,.19,.2,{player:name});
         this.record(name,'guitar',{bar,pitch:next,duration:.2,
           articulation:skills.has('walkingBass')?'walking bass step':'answer'});
       }
     }
   }
 }
}
