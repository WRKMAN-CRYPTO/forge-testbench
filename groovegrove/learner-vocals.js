/*
 * Pip and Riff discover their own voices. Their timbres are innate; singing
 * accuracy, phrasing, memories and technique only follow scheduled practice.
 * No forced singing, no proficiency grants, no changes to Murmur's pathway.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=list=>list[Math.floor(Math.random()*list.length)];
const semitone=n=>Math.pow(2,n/12);
const vowels=['m','u','o','a','i'];
export function tryLearnerVocalPhrase({name,grove,bar,time,audio}){
  if(!['Pip','Riff'].includes(name)||grove.disciplines.current(name)!=='voice'||
     grove.library.busy(name)||grove.space.traveling(name)||
     grove.space.destination(name)==='pond'||typeof audio.voice!=='function')return false;
  const person=grove.disciplines.people[name],state=person.vocal,stats=person.practice.voice;
  if(bar-state.lastAttemptBar<2)return false;
  state.attempts++;state.lastAttemptBar=bar;
  const knows=k=>grove.library.has(name,k);
  const curiosity=name==='Pip'?grove.pip.curiosity:grove.riff.curiosity;
  const transfer=grove.disciplines.transfer(name,grove);
  // Silence is a real choice, including during an extended vocal session.
  const willingness=clamp(.08+curiosity*.19+
    (knows('vowelShapes')?.025:0)+(knows('melodicContours')?.035:0)+
    Math.min(.09,stats.notes*.0005),.06,.44);
  if(Math.random()>willingness){state.rests++;return false;}
  const observer=grove.space.people[name];
  const heard=[observer.lastHeardGuitar,observer.lastHeardViolin,observer.lastHeardVoice]
    .filter(e=>e&&e.from!==name&&bar-e.bar<=3&&Number.isFinite(e.pitch)&&
      grove.space.canHear(name,e.from,e.kind)>.07)
    .sort((a,b)=>b.bar-a.bar);
  // Truly played notes persist with the musician across instrument changes.
  const personal=[...person.practice.guitar.recent,...person.practice.violin.recent,
    ...stats.recent].filter(e=>Number.isFinite(e.pitch)&&e.pitch>0)
    .sort((a,b)=>b.bar-a.bar);
  const inspiration=heard[0]?.pitch??personal[0]?.pitch??null;
  const imprint=grove.voiceprints[name];
  const developing=stats.notes;
  const phraseReady=developing>18 && (knows('melodicContours')||knows('breathPhrasing')||
    developing>95);
  // A remembered instrument phrase is made only from notes this musician
  // actually scheduled. One pitch per bar avoids mistaking chords for melody.
  const byBar=new Map();
  for(const e of [...person.practice.guitar.recent,...person.practice.violin.recent]
    .filter(e=>Number.isFinite(e.pitch)&&e.pitch>0&&Number.isSafeInteger(e.bar))
    .sort((a,b)=>a.bar-b.bar))byBar.set(e.bar,e.pitch);
  const remembered=[...byBar.values()].slice(-3);
  const borrowed=phraseReady&&remembered.length===3&&Math.random()<.42;
  const motifReady=phraseReady&&Array.isArray(state.motif)&&state.motif.length>1 &&
    Math.random()<.3;
  const steps=motifReady?[...state.motif]:borrowed?
    remembered.map(p=>clamp(Math.round(12*Math.log2(p/remembered[0])),-12,12)):
    phraseReady&&Math.random()<.48?
      [0,pick([-3,-2,0,2,3]),pick([-4,-2,0,2,4])]:[0];
  const center=clamp((borrowed&&!motifReady?remembered[0]:
    inspiration&&Math.random()<.72?inspiration:state.lastPitch||220)*
    imprint.register,150,465);
  if(steps.length>1&&!motifReady)state.motif=[...steps];
  const vowel=knows('vowelShapes')||developing>40?pick(vowels):'m';
  const rhythmic=knows('syncopation')||knows('offbeatPulse')||transfer.rhythm>.55;
  const start=time+.12+(rhythmic&&Math.random()<.27?(60/98)*.33:0);
  const precision=clamp(.76/(1+Math.log1p(developing)*.3)-
    transfer.melody*.045,.12,.8);
  const pitches=[];
  for(let i=0;i<steps.length;i++){
    // Cross-instrument pitch familiarity provides a reference, not instant
    // vocal motor control. Accuracy improves only through singing practice.
    const target=clamp(center*semitone(steps[i]),140,690);
    const pitch=target*semitone((Math.random()*2-1)*precision);
    const duration=steps.length>1?.3+(knows('breathPhrasing')?.15:0):
      .32+Math.random()*.28;
    const at=start+i*.49;
    const expression={vowel,glide:knows('vowelShapes')?(Math.random()-.5)*.7:0,
      attack:.075+(knows('breathPhrasing')?.04:0),release:.08,
      voiceprint:imprint};
    audio.voice(pitch,at,.12+Math.random()*.05,duration,expression,{player:name});
    grove.disciplines.record(name,'voice',{bar,pitch,duration,
      articulation:steps.length>1?'exploratory vocal phrase':'uncertain hum'});
    grove.space.sound(name,'voice',bar,.72,pitch);
    if(grove.onNote)grove.onNote({agent:name,time:at,beat:0});
    pitches.push(pitch);
    state.notes++;state.lastPitch=pitch;state.lastNoteBar=bar;
  }
  if(pitches.length>1)state.phrases++;
  if(!state.firstSound)state.firstSound={bar,pitch:pitches[0],
    inspiredBy:heard[0]?.from||(personal.length?'own instrumental memory':'curiosity')};
  if(state.notes===1)grove.push(name+' experiments with their voice for the first time.');
  return {name,pitches,bar,inspiredBy:heard[0]?.from||null};
}
