/* GrooveGrove shared simulation. Same classes in server + client. */
import {MusicLibrary,LIBRARY_CATALOG} from './music-library.js?v=20261019-transfer';
import {ListeningJournal} from './listening-journal.js';
import {GroveWorld} from './grove-world.js?v=20261019-transfer';
import {VoiceJournal} from './voice-journal.js?v=20261018-sustain';
import {tryVocalPhrase} from './voice-music.js?v=20261019-triojams';
import {MusicalDisciplines} from './grove-disciplines.js?v=20261019-transfer';
import {restoreVoiceprints} from './voiceprints.js';
import {tryLearnerVocalPhrase} from './learner-vocals.js';
import {JamArchive} from './jam-archive.js';

/*
 * A jam belongs to musicians who consent to play together, never to a fixed
 * pair of instruments. They may sing, play anything they hold, or rest.
 * Listening near one another alone is not an invitation.
 */
const MUSICIANS=Object.freeze(['Pip','Riff','Murmur']);
const curiosity=(grove,name)=>name==='Pip'?grove.pip.curiosity:
  name==='Riff'?grove.riff.curiosity:grove.vocalist.curiosity;
function available(grove,name){
 return MUSICIANS.includes(name)&&grove.space.people[name]&&
   grooveInstrument(grove,name)!=='none'&&!grove.library.busy(name)&&
   !grove.space.traveling(name)&&grove.space.destination(name)!=='pond';
}
function grooveInstrument(grove,name){return grove.disciplines.current(name);}
function closeEnough(grove,a,b){
 if(a===b||!available(grove,a)||!available(grove,b))return false;
 // The voice is a legitimate instrument. Both players must be able to hear
 // one another, even when their rooms' walls affect sound propagation.
 return grove.space.distance(a,b)<270&&
   grove.space.canHear(a,b,'voice')>.04&&
   grove.space.canHear(b,a,'voice')>.04;
}
function activeMembers(grove,names){
 const members=[...new Set((Array.isArray(names)?names:[]).filter(n=>available(grove,n)))];
 // Keep a connected conversational group. Nobody is trapped if they leave.
 if(members.length<2)return [];
 const connected=members.filter(n=>members.some(other=>other!==n&&closeEnough(grove,n,other)));
 return connected.length>=2?connected:[];
}
function proposeJam(grove){
 const possible=MUSICIANS.flatMap((a,i)=>MUSICIANS.slice(i+1)
   .filter(b=>closeEnough(grove,a,b)).map(b=>[a,b]));
 if(!possible.length)return null;
 const [initiator,partner]=possible[Math.floor(Math.random()*possible.length)];
 const heard=grove.space.people[initiator]?.lastHeard;
 const fresh=heard?.from===partner&&grove.bar-heard.bar<=8;
 // A preference to collaborate, not a requirement to perform.
 if(Math.random()>=clamp(.15+.19*curiosity(grove,initiator)+(fresh?.11:0),.1,.6))
   return null;
 const heardBack=grove.space.people[partner]?.lastHeard;
 const back=heardBack?.from===initiator&&grove.bar-heardBack.bar<=8;
 if(Math.random()>=clamp(.2+.34*curiosity(grove,partner)+(back?.12:0)+
   .07*grove.familiarity/99,.18,.77))return null;
 const group=[initiator,partner];
 const third=MUSICIANS.find(n=>!group.includes(n)&&
   group.some(m=>closeEnough(grove,n,m)));
 if(third&&Math.random()<.23+.48*curiosity(grove,third))group.push(third);
 return group;
}
function inviteThird(grove,members){
 const group=activeMembers(grove,members);
 if(group.length!==2)return group;
 const third=MUSICIANS.find(n=>!group.includes(n)&&group.some(m=>closeEnough(grove,n,m)));
 if(!third)return group;
 const heard=grove.space.people[third].lastHeard;
 const interested=group.includes(heard?.from)&&grove.bar-heard.bar<=8;
 if(Math.random()<clamp(.19+.36*curiosity(grove,third)+(interested?.13:0),.16,.75))
   return [...group,third];
 return group;
}

const beatDur=60/98;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rand=(a,b)=>a+(b-a)*Math.random();
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const rms=a=>a.length?Math.sqrt(avg(a.map(x=>x*x))):null;
export class MusicalAgent {
  constructor(name,role,initial){
    this.name=name;this.role=role;
    this.biasMs=initial.biasMs;this.jitterMs=initial.jitterMs;
    this.curiosity=role==='drummer'?.83:.74;
    this.generosity=role==='guitarist'?.89:.65;
    this.currentGoal='practicing';this.observations=[];
    this.ownOnsets=[];this.experiences=[];
  }
  rhythmOffset(){
    // Gaussian-ish but clamped. Skill determines audible deviations, not a fake UI score.
    const z=(Math.random()+Math.random()+Math.random()+Math.random()-2)*1.73;
    return clamp(this.biasMs+this.jitterMs*z,-155,155);
  }
  observe(event){this.observations.push(event);if(this.observations.length>128)this.observations.shift();}
  remember(description){this.experiences.unshift(description);if(this.experiences.length>8)this.experiences.length=8;}
}
export class Grove {
  constructor(saved=null,onCheckpoint=null){
    this.onCheckpoint=onCheckpoint;
    this.pip=new MusicalAgent('Pip','drummer',{biasMs:clamp(saved?.pipBias??78,-100,150),jitterMs:clamp(saved?.pipJitter??34,7,75)});
    this.riff=new MusicalAgent('Riff','guitarist',{biasMs:0,jitterMs:7});
    // A third musician arrives without a voice. No timer guarantees a song.
    // Observation can lead to curiosity, and curiosity can lead to an attempt.
    const old=saved?.vocalist||{};
    this.vocalist={name:'Murmur',stage:['silent','exploring','humming'].includes(old.stage)?old.stage:'silent',
      listening:Math.max(0,old.listening||0),curiosity:clamp(old.curiosity??.35,0,1),
      attempts:Math.max(0,old.attempts||0),notes:Math.max(0,old.notes||0),
      firstSound:old.firstSound||null,lastPitch:old.lastPitch||220,
      rests:Math.max(0,old.rests||0),lastAttemptBar:old.lastAttemptBar??-1,
       motif:Array.isArray(old.motif)?old.motif.filter(Number.isFinite).slice(0,4):null,
       motifCreatedAt:Number.isFinite(old.motifCreatedAt)?old.motifCreatedAt:null};
    this.familiarity=clamp(saved?.familiarity??0,0,99);
    this.lessons=saved?.lessons??0;this.jams=saved?.jams??0;
    this.mode=['solo','jam','lesson'].includes(saved?.mode)?saved.mode:'solo';this.modeBars=Number.isInteger(saved?.modeBars)?clamp(saved.modeBars,0,500):0;this.bar=Number.isInteger(saved?.bar)?Math.max(0,saved.bar):0;this.beat=Number.isInteger(saved?.beat)?clamp(saved.beat,0,3):0;
    this.logs=[];this.lastRiffOnsets=new Map();this.lastPipOnsets=new Map();
    this.relativeErrors=[];this.barErrors=[];this.priorErrors=[];this.sessionMeasurements=[];
    this.pipPlayed=0;this.riffPlayed=0;this.lastLearning=null;
    // Actual scheduled long chords, not an XP badge. Kept across restarts.
    this.riffHoldUntilBeat=Number.isFinite(saved?.riffHoldUntilBeat)?Math.max(0,Math.floor(saved.riffHoldUntilBeat)):0;
    this.riffHeldChords=Math.max(0,Math.floor(saved?.riffHeldChords||0));
    // One held guitar string is a separate musical choice from a chord.
    this.riffHeldNotes=Number.isSafeInteger(saved?.riffHeldNotes)&&saved.riffHeldNotes>=0?
      saved.riffHeldNotes:0;
    this.riffLastHeldNote=saved?.riffLastHeldNote&&Number.isFinite(saved.riffLastHeldNote.pitch)?
      {...saved.riffLastHeldNote}:null;
    this.library=new MusicLibrary(saved?.library);
    this.understanding=new ListeningJournal(saved?.understanding);
    this.voiceJournal=new VoiceJournal(saved?.voiceJournal);
    this.voiceprints=restoreVoiceprints(saved?.voiceprints);
    this.space=new GroveWorld(saved?.space);
    this.disciplines=new MusicalDisciplines(saved?.disciplines);
    this.archive=new JamArchive(saved?.archive);
    // An in-progress jam cannot be called a complete recording after restart:
    // its earlier note stream was not checkpointed as an open tape.
    this.recordingResumingJam=!!saved&&saved.mode==='jam';
    // A voluntary jam is a musician-level commitment, not a drum/guitar role.
    // Old saved jam state keeps its legacy pair until that interrupted session ends.
    this.jamParticipants=this.mode==='jam'?
      [...new Set((Array.isArray(saved?.jamParticipants)&&saved.jamParticipants.length?
        saved.jamParticipants:['Pip','Riff']).filter(n=>MUSICIANS.includes(n)))]:[];
    for(const name of ['Pip','Riff']){
      const task=this.library.status(name),book=task&&this.library.copyById(task.copyId);
      if(book)(name==='Pip'?this.pip:this.riff).currentGoal='finishing '+LIBRARY_CATALOG[book.type].title;
    }
    this.playedKnowledge={Pip:Math.max(0,saved?.playedKnowledge?.Pip||0),Riff:Math.max(0,saved?.playedKnowledge?.Riff||0)};
    if(saved?.goals){
      if(typeof saved.goals.Pip==='string')this.pip.currentGoal=saved.goals.Pip.slice(0,80);
      if(typeof saved.goals.Riff==='string')this.riff.currentGoal=saved.goals.Riff.slice(0,80);
    }
    this.highlight='Two musicians, one little clearing.';
    // Display-only cooldown: it never changes how Murmur learns, sings or rests.
    this.lastMurmurPhraseCueBar=-999;
    this.onSound=null;this.onNote=null;
    this.push('The grove is quiet. Two musicians are finding their sound.');
    if(saved?.logs?.length)this.logs=saved.logs.filter(x=>typeof x?.message==='string').slice(0,12);
    else if(saved){this.push('Their memories survived the last visit.');}
  }
  push(message){this.logs.unshift({message,bar:this.bar});this.logs=this.logs.slice(0,12);this.highlight=message;}
  exchange(from,to,message){
    this.push(from.name+' → '+to.name+': '+message);
    if(this.onTalk)this.onTalk(from.name,message);
  }
  baseline(){return rms(this.relativeErrors.slice(-16));}
  snapshot(){return {pipBias:this.pip.biasMs,pipJitter:this.pip.jitterMs,familiarity:this.familiarity,lessons:this.lessons,jams:this.jams,library:this.library.snapshot(),understanding:this.understanding.snapshot(),mode:this.mode,modeBars:this.modeBars,bar:this.bar,beat:this.beat,goals:{Pip:this.pip.currentGoal,Riff:this.riff.currentGoal},playedKnowledge:{...this.playedKnowledge},
    riffHoldUntilBeat:this.riffHoldUntilBeat,riffHeldChords:this.riffHeldChords,
    riffHeldNotes:this.riffHeldNotes,riffLastHeldNote:this.riffLastHeldNote?{...this.riffLastHeldNote}:null,vocalist:{...this.vocalist,motif:this.vocalist.motif?[...this.vocalist.motif]:null},voiceJournal:this.voiceJournal.snapshot(),
    voiceprints:Object.fromEntries(Object.entries(this.voiceprints).map(([name,profile])=>[name,{...profile}])),
    space:this.space.snapshot(),
    disciplines:this.disciplines.snapshot(),archive:this.archive.snapshot(),
    jamParticipants:[...this.jamParticipants],logs:this.logs.slice(0,12)};}
  onBeatEvent(index,t,audio){
    const beat=index%4,bar=Math.floor(index/4);
    if(beat===0 && index>0)this.finishBar();
    this.beat=beat;this.bar=bar;
    this.space.advance(this,beatDur);
    // Replay from the recording room goes to the sound bus, but cannot modify
    // any living musician's practice, listening journal or motor development.
    const liveOutput=audio;
    this.archive.playDeck(t,liveOutput,this.space);
    if(this.mode==='jam'&&!this.recordingResumingJam){
      this.archive.begin(bar,t);
      // Capture the very same note arguments sent to the renderer. An archive
      // never reconstructs a groove from counters, stats or random seeds.
      const capture=this.archive;
      audio=Object.create(liveOutput);
      for(const kind of ['guitar','violin','voice','kick','snare','hat']){
        audio[kind]=(...args)=>{
          capture.capture(kind,args,bar,this.space,this.jamParticipants);
          return liveOutput[kind]?.apply(liveOutput,args);
        };
      }
    }
    const solo=this.mode==='solo';
    const singer=this.vocalist;
    // No random breakthrough countdown. Silence remains an independent choice.
    if(beat===0){
      // An audible event in Murmur's surroundings is an actual listening opportunity.
      const remembered=this.space.people.Murmur.lastHeard;
      if(remembered && bar-remembered.bar<=1)singer.listening++;
      if(singer.stage==='silent' && Math.random()<.018*singer.curiosity &&
         singer.listening>12)singer.stage='exploring';
      if(singer.stage==='exploring' && Math.random()<.055*singer.curiosity &&
         bar-singer.lastAttemptBar>3){
        singer.attempts++;singer.lastAttemptBar=bar;
        // Most exploratory breaths produce no pitched sound.
        if(Math.random()<.23*singer.curiosity){
          singer.stage='humming';
          singer.firstSound={bar,heard:'Pip and Riff',pitch:singer.lastPitch,attempt:singer.attempts};
          this.push('Murmur discovers a voice: a small, uncertain hum.');
        }
      }
      if(singer.stage==='humming')singer.curiosity=clamp(singer.curiosity+.0003,0,1);
    }
    // A practice room can hold two soloists without making them a duo.
    // They exchange turns every two bars. Only a mutual choice creates joint music.
    const pipActive=this.disciplines.current('Pip')==='drums' &&
      (this.mode==='lesson'||(this.mode==='jam'&&this.jamParticipants.includes('Pip'))||
        bar%4<2||this.library.busy('Riff')) &&
      !this.library.busy('Pip') && !this.space.traveling('Pip') &&
      this.space.destination('Pip')!=='pond';
    const riffActive=this.disciplines.current('Riff')==='guitar' &&
      (this.mode==='lesson'||(this.mode==='jam'&&this.jamParticipants.includes('Riff'))||
        bar%4>=2||this.library.busy('Pip')) &&
      !this.library.busy('Riff') && !this.space.traveling('Riff') &&
      this.space.destination('Riff')!=='pond';
    if(beat===0 && this.disciplines.current('Murmur')==='voice'){
      const vocal=tryVocalPhrase({
        singer,library:this.library,space:this.space,bar,time:t,beatDur,
        audio,journal:this.voiceJournal,onNote:this.onNote,
         ensemble:this.mode==='jam'?this.jamParticipants:null,
        transfer:this.disciplines.transfer('Murmur',this),
        playing:Object.fromEntries(['Pip','Riff'].map(name=>[name,
          !this.library.busy(name)&&!this.space.traveling(name)&&
          this.space.destination(name)!=='pond'&&(
            (name==='Pip'&&pipActive)||(name==='Riff'&&riffActive)||
            ['drums','guitar','violin'].includes(this.disciplines.current(name)))]))
      });
      if(vocal?.ensemble&&this.voiceJournal.sharedPhrases===1)
        this.push('Murmur chooses to sing with the others for the first time.');
      // These are captions of music that was ACTUALLY scheduled. Murmur's
      // existing wordless synthesizer is not made to speak or perform more.
      if(vocal?.sang && this.onTalk &&
         (this.voiceJournal.attempts===1 || bar-this.lastMurmurPhraseCueBar>=16)){
        const cue=this.voiceJournal.attempts===1?'♪ First humming notes':
          vocal.response?'♪ Answering '+vocal.response+' in melody':
          vocal.pitches.length>1?'♪ Trying a new melodic phrase':'♪ Exploring a quiet hum';
        this.onTalk('Murmur',cue);
        this.lastMurmurPhraseCueBar=bar;
      }
    }
    // Independent beginners can choose the unheld voice as their instrument.
    // Murmur continues using his original, separate vocal engine and journal.
    if(beat===0)for(const name of ['Pip','Riff'])
      tryLearnerVocalPhrase({name,grove:this,bar,time:t,audio});
    const riffOffset=this.riff.rhythmOffset();
    const guitarOnset=t+riffOffset/1000;
    const originalChords=[[196,246.94,293.66],[174.61,220,261.63],[164.81,196,246.94],[146.83,185,220]];
    const newChords=[[220,261.63,329.63],[146.83,174.61,220],[196,246.94,349.23],[174.61,261.63,349.23]];
    const usesNewChords=this.library.has('Riff','openChords') && bar%4>=2;
    const pitches=(usesNewChords?newChords:originalChords)[Math.floor(bar/2)%4];
    const onLesson=this.mode==='lesson';
    const withinEarshot=this.space.distance('Pip','Riff')<260 &&
      this.space.canHear('Pip','Riff','guitar')>.13;
    const onJam=this.mode==='jam' && withinEarshot &&
      this.jamParticipants.includes('Pip')&&this.jamParticipants.includes('Riff');
    const dynamic=onJam?.9:onLesson?.69:.51;
    const riffRest=this.library.has('Riff','deliberateSpace') && beat===3 && bar%4===1;
    const pipRest=this.library.has('Pip','deliberateSpace') && beat===3 && bar%4===1;
    // Live onset bus: every heard note corresponds to an actual scheduled
    // Web Audio event. Extra notes are marked so timing drift is not faked.
    const drumOffset=this.pip.rhythmOffset();
    const drumOnset=t+drumOffset/1000;
    if(beat===0){
      this.understanding.beginBar({bar,mode:this.mode,active:{Pip:pipActive,Riff:riffActive},skills:this.library.known});
    }
    const riffChoice=this.understanding.variation('Riff');
    const pipChoice=this.understanding.variation('Pip');
    let riffSoundedThisBeat=false;
    const play={
      guitar:(freq,at,volume,duration,extra=false)=>{
        riffSoundedThisBeat=true;
        audio.guitar(freq,at,volume,duration);
        this.disciplines.record('Riff','guitar',{bar,pitch:freq,duration});
        this.space.sound('Riff','guitar',bar,volume,freq);
        this.understanding.hear({who:'Riff',kind:'guitar',time:at,bar,beat,velocity:volume,offsetMs:riffOffset,extra,pitch:freq});
      },
      kick:(at,volume,extra=false)=>{
        audio.kick(at,volume);
        this.disciplines.record('Pip','drums',{bar,duration:0});
        this.space.sound('Pip','kick',bar,volume);
        this.understanding.hear({who:'Pip',kind:'kick',time:at,bar,beat,velocity:volume,offsetMs:drumOffset,extra});
      },
      snare:(at,volume,extra=false)=>{
        audio.snare(at,volume);
        this.disciplines.record('Pip','drums',{bar,duration:0});
        this.space.sound('Pip','snare',bar,volume);
        this.understanding.hear({who:'Pip',kind:'snare',time:at,bar,beat,velocity:volume,offsetMs:drumOffset,extra});
      },
      hat:(at,volume,extra=false)=>{
        audio.hat(at,volume);
        this.disciplines.record('Pip','drums',{bar,duration:0});
        this.space.sound('Pip','hat',bar,volume);
        this.understanding.hear({who:'Pip',kind:'hat',time:at,bar,beat,velocity:volume,offsetMs:drumOffset,extra});
      }
    };
    if(riffActive){
      const feeling=riffChoice==='soft'?.7:1;
      const voicing=riffChoice==='voicing'?[pitches[1],pitches[2],pitches[0]*2]:pitches;
      // Long harmonies are Riff's musical choice. He listens for a singer
      // and sometimes leaves the chord ringing instead of re-strumming.
      const alreadyHolding=this.riffHoldUntilBeat>index;
      if(!alreadyHolding && (beat===0||beat===2)){
        const voiceHeard=this.space.people.Riff.lastHeardVoice;
        const singingNearby=!!(voiceHeard && bar-voiceHeard.bar<=2 &&
          this.space.canHear('Riff','Murmur','voice')>.10);
        // Riff may choose a single sustained melody note *instead* of
        // a chord. Recent nearby singing makes a held answer more attractive,
        // while solo practice still leaves room for this discovery.
        const singleChance=.075+(singingNearby?.065:0)+(onJam?.025:0)+
          (this.library.has('Riff','partnerListening')?.02:0)+
          (this.library.has('Riff','melodicContours')?.035:0);
        const longSingle=Math.random()<singleChance;
        if(longSingle){
          const tones=[voicing[1],voicing[2],voicing[0]*2];
          const singerPitch=voiceHeard?.pitch;
          // Choose a chord tone close to the singer's octave, not a
          // random pitch that clashes with the current harmony.
          const target=singingNearby&&Number.isFinite(singerPitch)?
            singerPitch*(Math.random()<.3?1:2):null;
          const note=target==null?tones[Math.floor(Math.random()*tones.length)]:
            tones.reduce((best,p)=>Math.abs(Math.log2(p/target))<
              Math.abs(Math.log2(best/target))?p:best,tones[0]);
          const holdBeats=singingNearby?(Math.random()<.35?4:3):
            (Math.random()<.62?2:3);
          const duration=holdBeats*beatDur-.075;
          this.riffHoldUntilBeat=index+holdBeats;
          play.guitar(note,guitarOnset,dynamic*feeling*.93,duration);
          this.riffHeldNotes++;
          this.riffLastHeldNote={bar,beat,pitch:note,
            seconds:Math.round(duration*100)/100,
            context:singingNearby?'answering Murmur':onJam?'playing together':'solo idea'};
        }else{
          const holdingChance=.19+
            (this.library.has('Riff','openChords')?.13:0)+
            (singingNearby?.18:0)+(onJam?.07:0)+
            (this.library.has('Riff','breathPhrasing')?.09:0);
          const longChord=Math.random()<holdingChance;
          const holdBeats=longChord?(beat===0?(Math.random()<.42?4:3):2):0;
          const duration=longChord?holdBeats*beatDur-.06:.43;
          if(longChord){
            this.riffHoldUntilBeat=index+holdBeats;
            this.riffHeldChords++;
          }
          voicing.forEach((p,i)=>play.guitar(
            p,guitarOnset+i*.026,dynamic*feeling*(i===0?1:.72),duration
          ));
        }
      }else if(!alreadyHolding && !(riffChoice==='breath' && beat===3) && !riffRest){
        play.guitar(voicing[(beat+bar)%3]*2,guitarOnset,dynamic*.72*feeling,.29);
      }
      if(usesNewChords && beat===0)this.playedKnowledge.Riff++;
      if(!alreadyHolding && !riffRest && onJam && beat===3 && this.library.has('Riff','callResponse')){
        play.guitar(voicing[(bar+1)%3]*2,guitarOnset+beatDur*.47,dynamic*.42*feeling,.2,true);
        this.playedKnowledge.Riff++;
      }
      if(!alreadyHolding&&!riffRest&&
         this.library.has('Riff','ghostNotes')&&beat===2&&bar%3===0)
        play.guitar(voicing[1]*2,guitarOnset+beatDur*.46,dynamic*.12,.15,true);
      if(!alreadyHolding&&!riffRest&&
         this.library.has('Riff','offbeatPulse')&&beat===1&&bar%2===0)
        play.guitar(voicing[(bar+2)%3]*2,guitarOnset+beatDur*.5,dynamic*.25,.21,true);
      if(!alreadyHolding && !riffRest && riffChoice==='answer' && beat===3){
        play.guitar(voicing[bar%3]*2,guitarOnset+beatDur*.73,dynamic*.24,.16,true);
      }
      if(!alreadyHolding && this.library.has('Riff','walkingBass') && bar%2===1 && (beat===1 || beat===3)){
        // Gently lead the ear from this chord's root toward the following chord.
        const palette=usesNewChords?newChords:originalChords;
        const nextRoot=palette[(Math.floor((bar+1)/2))%4][0];
        const bassPitch=beat===1?pitches[0]*.5:(pitches[0]+nextRoot)*.25;
        play.guitar(bassPitch,guitarOnset+beatDur*.33,dynamic*.29,.29,true);
        if(beat===3)this.playedKnowledge.Riff++;
      }
      if(!alreadyHolding && !riffRest && this.library.has('Riff','syncopation') && beat===1 && bar%3===0){
        play.guitar(voicing[(bar+2)%3]*2,guitarOnset+beatDur*.57,dynamic*.32,.17,true);
        this.playedKnowledge.Riff++;
      }
      if(!alreadyHolding && !riffRest && this.library.has('Riff','partnerListening') && onJam && pipActive &&
         beat===3 && bar%4===2){
        // An answer, not a compulsory band: only during a chosen shared jam.
        play.guitar(voicing[(bar+1)%3]*2,guitarOnset+beatDur*.72,dynamic*.25,.19,true);
        this.playedKnowledge.Riff++;
      }
      if(riffSoundedThisBeat && this.space.canHear('Pip','Riff','guitar')>.05)
        this.pip.observe({type:'heard-guitar',bar,beat,time:guitarOnset});
      if(riffSoundedThisBeat)this.riff.ownOnsets.push({bar,beat,time:guitarOnset});
    }
    if(pipActive){
      if(beat===0||beat===2)play.kick(drumOnset,beat===0?.9:.68);
      else play.snare(drumOnset,.7);
      play.hat(drumOnset+.017,.6);
      if(!(pipChoice==='breath' && beat===3) && !pipRest)play.hat(drumOnset+beatDur*.5+.017,.32);
      if(!pipRest && onJam && beat===3 && this.pip.curiosity>.7 && bar%4===0)play.snare(drumOnset+beatDur*.74,.28,true);
      // Book-learned motor vocabulary remains playable even without an experiment.
      if(this.library.has('Pip','offbeatPulse') && beat===1 && bar%2===0){
        play.kick(drumOnset+beatDur*.5,.32,true);play.snare(drumOnset+beatDur*.75,.18,true);
        this.playedKnowledge.Pip++;
      }
      if(this.library.has('Pip','breathPhrasing') && beat===3 && bar%4===0)
        play.hat(drumOnset+.01,.18,true);
      if(this.library.has('Pip','walkingBass') && beat===3 && bar%2===1)
        play.kick(drumOnset+beatDur*.34,.23,true);
      if(!pipRest && onJam && beat===3 && this.library.has('Pip','callResponse')){
        play.snare(drumOnset+beatDur*.5,.31,true);this.playedKnowledge.Pip++;
      }
      // Mild optional variations: core four-beat pulse is never removed.
      if(pipChoice==='ghost' && beat===2)play.snare(drumOnset+beatDur*.5,.17,true);
      if(pipChoice==='offbeat' && beat===2)play.kick(drumOnset+beatDur*.53,.23,true);
      if(this.library.has('Pip','ghostNotes') && beat===2 && bar%3===1){
        play.snare(drumOnset+beatDur*.24,.115,true);
        play.snare(drumOnset+beatDur*.7,.145,true);
        this.playedKnowledge.Pip++;
      }
      if(this.library.has('Pip','syncopation') && beat===1 && bar%3===2){
        play.kick(drumOnset+beatDur*.63,.25,true);
        this.playedKnowledge.Pip++;
      }
      if(!pipRest && this.library.has('Pip','partnerListening') && onJam && riffActive &&
         beat===3 && bar%4===2){
        play.snare(drumOnset+beatDur*.7,.19,true);
        this.playedKnowledge.Pip++;
      }
      this.pipPlayed++;
      if(this.space.canHear('Riff','Pip','kick')>.05)
        this.riff.observe({type:'heard-drum',bar,beat,time:drumOnset});
      this.pip.ownOnsets.push({bar,beat,time:drumOnset});
      // The partner's reliable reference pulse exists even while the guitar is silent.
      // Difference is measured from actual synthesized drum onsets, not a cosmetic score.
      if(riffSoundedThisBeat && this.space.canHear('Pip','Riff','guitar')>.12){
        const delta=(drumOnset-guitarOnset)*1000;
        this.relativeErrors.push(delta);this.barErrors.push(delta);
        this.sessionMeasurements.push({bar,beat,errorMs:delta,mode:this.mode});
        if(this.relativeErrors.length>96)this.relativeErrors.shift();
        if(this.sessionMeasurements.length>1000)this.sessionMeasurements.shift();
      }
    }
    // Each instrumentalist may answer a real Murmur phrase independently.
    // Nothing is counted until an actual instrument note is scheduled.
    if(beat===3){
      const riffHeard=this.space.people.Riff.lastHeardVoice;
      const pipHeard=this.space.people.Pip.lastHeardVoice;
      const riffCanAnswer=riffHeard?.from==='Murmur' && riffHeard?.bar===bar && this.riffHoldUntilBeat<=index &&
        this.disciplines.current('Riff')==='guitar' &&
        this.space.canHear('Riff','Murmur','voice')>.08 &&
        !this.space.traveling('Riff')&&!this.library.busy('Riff') &&
        this.space.destination('Riff')!=='pond';
      const pipCanAnswer=pipHeard?.from==='Murmur' && pipHeard?.bar===bar &&
        this.disciplines.current('Pip')==='drums' &&
        this.space.canHear('Pip','Murmur','voice')>.08 &&
        !this.space.traveling('Pip')&&!this.library.busy('Pip') &&
        this.space.destination('Pip')!=='pond';
      if(riffCanAnswer && Math.random()<(this.library.has('Riff','partnerListening')?.56:.46)){
        const pitch=pitches[(bar+1)%pitches.length]*2;
        play.guitar(pitch,guitarOnset+beatDur*.48,.22,.27,true);
        this.voiceJournal.partnerReply({bar,partner:'Riff',kind:'guitar',pitch});
        if(this.voiceJournal.partnerReplies.Riff===1)
          this.push('Riff answers a melody he actually heard from Murmur.');
      }
      if(pipCanAnswer && Math.random()<(this.library.has('Pip','callResponse')?.46:.31)){
        play.snare(drumOnset+beatDur*.62,.2,true);
        this.voiceJournal.partnerReply({bar,partner:'Pip',kind:'snare',pitch:null});
        if(this.voiceJournal.partnerReplies.Pip===1)
          this.push('Pip answers Murmur with a small rhythmic accent.');
      }
    }
    // Every instrument can now have a different owner. The alternate
    // performance bus uses real player identities rather than preset roles.
    this.disciplines.play(this,index,t,audio,{harmony:pitches});
    if(riffSoundedThisBeat)this.riffPlayed++;
    if(this.onNote){
      if(pipActive)this.onNote({agent:'Pip',time:drumOnset,beat,delta:drumOffset-riffOffset});
      if(riffSoundedThisBeat)this.onNote({agent:'Riff',time:guitarOnset,beat,delta:riffOffset});
    }
  }
  finishBar(){
    const findings=this.understanding.finishBar(this.bar);
    for(const f of findings){
      // Event-based observations, not claims that the music is objectively good.
      this.push(f.who+' tried '+f.label+' · '+Math.round(f.driftMs)+' ms attack drift, '+Math.round(f.overlap*100)+'% onset overlap.');
    }
    const last4=this.barErrors;
    this.barErrors=[];
    const before=rms(last4)??this.baseline();
    if(last4.length){
      const correction=avg(last4);
      const oldBias=this.pip.biasMs,oldJitter=this.pip.jitterMs;
      // The partner's live reference yields a stronger correction than solo rehearsal.
      const gain=this.mode==='lesson'?.59:(this.mode==='jam'?.16:.035);
      this.pip.biasMs=clamp(this.pip.biasMs-clamp(correction*gain,-48,48),-105,145);
      // Reading supplies an exercise; only subsequent practice affects timing.
      const pulseExercise=this.library.has('Pip','offbeatPulse') && this.mode==='solo' && !this.library.busy('Pip');
      this.pip.jitterMs=clamp(this.pip.jitterMs*(this.mode==='lesson'?.927:(this.mode==='jam'?.987:(pulseExercise?.991:.997))),7,75);
      this.lastLearning={bar:this.bar,observedErrorMs:before,correctionMs:oldBias-this.pip.biasMs,precisionChangeMs:oldJitter-this.pip.jitterMs,mode:this.mode};
    }
    this.modeBars++;
    if(this.mode==='solo')this.considerNewActivity(before);
    else if(this.mode==='lesson'){
      const together=this.disciplines.current('Pip')==='drums' &&
        this.disciplines.current('Riff')==='guitar' && this.space.distance('Pip','Riff')<260 &&
        !this.space.traveling('Pip')&&!this.space.traveling('Riff')&&!this.library.busy('Pip')&&!this.library.busy('Riff');
      if(!together){
        // Leaving is allowed: no credits for a lesson nobody heard.
        this.mode='solo';this.modeBars=0;
        this.push('The lesson pauses. Each musician follows their own direction.');
      }
      const clearProgress=together&&this.modeBars>=3 && (before<36||this.modeBars>=7);
      if(clearProgress){
        this.lessons++;this.familiarity++;
        this.pip.remember('Riff demonstrated a steady pulse.');
        this.riff.remember('Pip worked through a timing lesson.');
        this.exchange(this.pip,this.riff,before<36?'I can feel the beat settling!':'I want to try that in a song.');
        this.mode='solo';this.modeBars=0;
        this.pip.currentGoal='trying new patterns';this.riff.currentGoal='looking for a new idea';
      }
    }else if(this.mode==='jam'){
      let members=activeMembers(this,this.jamParticipants);
      if(members.length<2){
        this.archive.discard();
        this.recordingResumingJam=false;
        this.jamParticipants=[];this.mode='solo';this.modeBars=0;
        this.push('The jam ends as the musicians follow their own paths.');
      }else{
        if(this.modeBars%4===0){
          const invited=inviteThird(this,members);
          if(invited.length>members.length){
            const joined=invited.find(n=>!members.includes(n));
            this.onTalk?.(joined,'♪ Joining the jam');
            this.push(joined+' voluntarily joins the jam.');
          }
          members=invited;
        }
        this.jamParticipants=members;
        const performed=new Set((this.archive.active?.events||[]).map(e=>e.source));
        // A jam really happened only when at least two consenting performers
        // made notes. Quiet listening is not a fake recorded performance.
        const audible=members.filter(n=>performed.has(n));
        const complete=this.modeBars>=6&&
          (audible.length>=2||this.recordingResumingJam)&&Math.random()<.46;
        const grewQuiet=this.modeBars>=24;
        if(complete||grewQuiet){
          if(complete){
            this.jams++;this.familiarity++;
            const tape=this.recordingResumingJam?null:this.archive.finish(this.bar);
            if(this.recordingResumingJam)this.archive.discard();
            if(tape)this.push('Recorded a jam by '+tape.participants.join(', ')+'.');
            else this.push(members.join(', ')+' finish a jam together.');
            for(const name of members)this.onTalk?.(name,'♪ That was worth hearing together');
          }else{
            this.archive.discard();
            this.push('Their jam fades into listening and independent ideas.');
          }
          this.recordingResumingJam=false;
          this.jamParticipants=[];this.mode='solo';this.modeBars=0;
        }
      }
    }
    this.library.tick(this);
    this.disciplines.decide(this);
    this.space.decide(this);
    // Save every bar (about 2.45 s), including each reading page and return.
    // The old four-bar cadence could preserve a 75% book checkpoint indefinitely
    // when iOS interrupted the audio clock before the next checkpoint.
    if(this.onCheckpoint)this.onCheckpoint(this.snapshot());
  }
  considerNewActivity(measuredError){
    if(this.modeBars<3)return;
    // Timing lessons still require the original teacher/pupil arrangement.
    const legacyLesson=available(this,'Pip')&&available(this,'Riff')&&
      this.disciplines.current('Pip')==='drums'&&
      this.disciplines.current('Riff')==='guitar'&&closeEnough(this,'Pip','Riff');
    const needsHelp=measuredError!=null&&measuredError>40;
    if(legacyLesson&&needsHelp&&Math.random()<.08+.16*this.riff.generosity){
      this.exchange(this.riff,this.pip,'Your notes drift a little. Want to follow my pulse?');
      if(Math.random()<.35+.35*this.pip.curiosity){
        this.exchange(this.pip,this.riff,'Play it steady. I’ll listen.');
        this.mode='lesson';this.modeBars=0;
        this.pip.currentGoal='listening and correcting timing';
        this.riff.currentGoal='demonstrating the pulse';
        return;
      }
    }
    const chosen=proposeJam(this);
    if(chosen){
      const [lead,...guests]=chosen;
      this.onTalk?.(lead,'♪ Anyone want to play together?');
      for(const name of guests)this.onTalk?.(name,'♪ I will join');
      this.mode='jam';this.modeBars=0;
      this.jamParticipants=chosen;
      this.recordingResumingJam=false;
      this.archive.begin(this.bar+1);
      this.push(chosen.join(', ')+' choose to make music together.');
    }else if(this.modeBars>6&&Math.random()<.09){
      this.push('Each musician follows their own musical curiosity.');
    }
  }
}
