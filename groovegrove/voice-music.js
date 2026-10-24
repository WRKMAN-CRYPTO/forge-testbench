/*
 * Pass 006: Murmur's wordless music experiments.
 * Learning introduces options, never a mandatory song or a fixed timetable.
 * Only emitted notes are written to the durable VoiceJournal.
 */
const semitone=n=>Math.pow(2,n/12);
const select=arr=>arr[Math.floor(Math.random()*arr.length)];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const VOICES=['m','u','o','a','i'];
const ROOTS=[174.61,196,220,246.94,261.63,293.66,329.63];
const CONTOURS=[
  [0,2,4,2],[0,-2,-4,-2],[0,3,2,0],
  [0,0,2,4],[0,2,-1,0],[0,-3,0,2]
];
const nearestRoot=p=>{
  if(!Number.isFinite(p)||p<=0)return select(ROOTS);
  while(p>360)p/=2;
  while(p<164)p*=2;
  return ROOTS.reduce((best,n)=>Math.abs(n-p)<Math.abs(best-p)?n:best,ROOTS[0]);
};
const readable=v=>VOICES.includes(v)?v:'m';
export function tryVocalPhrase({singer,library,space,bar,time,beatDur=60/98,
                                audio,journal,onNote,playing=null,transfer=null,ensemble=null,pitchRecall=null,replyMemory=null}){
  if(singer.stage!=='humming'||library.busy('Murmur')||
     bar-singer.lastAttemptBar<2){
    singer.rests++;return false;
  }
  // A sound heard through real proximity may inspire a response, but
  // listening or wandering in silence remains equally legitimate.
  const musician=space.people.Murmur;
  const guitar=musician.lastHeardGuitar;
  const drums=musician.lastHeardDrum;
  const violin=musician.lastHeardViolin;
  const voice=musician.lastHeardVoice;
  const riffNearby=!!(guitar&&bar-guitar.bar<=3&&
    space.canHear('Murmur',guitar.from,'guitar')>.12);
  const pipNearby=!!(drums&&bar-drums.bar<=3&&
    space.canHear('Murmur',drums.from,drums.kind)>.1);
  const violinNearby=!!(violin&&bar-violin.bar<=3&&
    space.canHear('Murmur',violin.from,'violin')>.1);
  const voiceNearby=!!(voice&&voice.from!=='Murmur'&&bar-voice.bar<=3&&
    space.canHear('Murmur',voice.from,'voice')>.09);
  const jamPartners=Array.isArray(ensemble)&&ensemble.includes('Murmur')&&
    ensemble.some(name=>name!=='Murmur'&&space.distance('Murmur',name)<270&&
      !space.traveling(name));
  const present=!space.traveling('Murmur')&&(
    (jamPartners&&(voiceNearby||riffNearby||pipNearby||violinNearby))||
    (musician.ensembleIntent==='joining'&&
      ((riffNearby&&(playing?.[guitar.from]??true))||
       (pipNearby&&(playing?.[drums.from]??true))||
       (violinNearby&&(playing?.[violin.from]??true))||
       (voiceNearby&&(playing?.[voice.from]??true)))));
  // An invitation changes willingness, never guarantees a performance.
  // Away from the group, Murmur still enjoys solitary experimentation.
  const bookIdeas=['vowelShapes','breathPhrasing','melodicContours']
    .reduce((sum,skill)=>sum+(library.has('Murmur',skill)?1:0),0);
  const has=skill=>library.has('Murmur',skill);
  const transferredRhythm=clamp(transfer?.rhythm||0,0,1);
  const transferredMelody=clamp(transfer?.melody||0,0,1);
  const desire=clamp(.19*singer.curiosity+.012*bookIdeas+
    (present?.28:(riffNearby||pipNearby||violinNearby||voiceNearby)?.045:0)+
    (has('partnerListening')&&present?.045:0),0,.66);
  const deliberatePause=has('deliberateSpace')&&bar%4===1 &&
    musician.ensembleIntent==='listening'&&Math.random()<.34;
  if(deliberatePause||Math.random()>=desire){singer.rests++;return false;}
  const shaped=library.has('Murmur','vowelShapes');
  const phrased=library.has('Murmur','breathPhrasing');
  const melodic=library.has('Murmur','melodicContours');
  const vowel=shaped&&Math.random()<.76?readable(select(VOICES)):'m';
  const useContour=(melodic&&Math.random()<.68)||
    (has('walkingBass')&&Math.random()<.17);
  const usePhrase=!useContour && phrased && Math.random()<.53;
  const length=useContour?4:usePhrase?(Math.random()<.45?2:3):1;
  let steps=[0],repeated=false;
  if(useContour){
    repeated=Array.isArray(singer.motif)&&singer.motif.length>=3&&Math.random()<.56;
    if(repeated)steps=[...singer.motif];
    else{
      steps=[...select(CONTOURS)];
      if(Math.random()<.22)steps[steps.length-1]+=select([-2,2]);
      singer.motif=[...steps];singer.motifCreatedAt=bar;
    }
  }else if(length>1){
    steps=length===2?[0,select([-2,2,3])]:[0,select([-2,2]),select([-3,0,3])];
  }
  // A freely chosen multi-note phrase may borrow a relative contour from
  // Murmur's own genuine, recurring long-term pitch observations. This never
  // initiates a performance, lengthens a phrase, or pretends to prefer a shape.
  const recalled=pitchRecall?.voice('Murmur',steps,bar,has('motifMotion'))||null;
  if(recalled){
    steps=recalled.offsets.map(c=>c/100);
    repeated=false; // A heard contour isn't automatically a repeated own motif.
    if(useContour){singer.motif=[...steps];singer.motifCreatedAt=bar;}
  }
  // An answer requires a note Murmur really heard. Drums inspire rhythm;
  // guitar notes supply harmonic pitch reference.
  // Any audible pitched player can inspire the sung note, including Pip
  // on violin. Beats come from whoever is actually playing the drums.
  const pitchedInspiration=[
    ...(riffNearby?[guitar]:[]),...(violinNearby?[violin]:[]),
    ...(voiceNearby?[voice]:[])
  ].sort((a,b)=>b.bar-a.bar);
  const rhythmicInspiration=pipNearby?drums:null;
  // Continuing a previously heard reply is OPTIONAL and cannot initiate a
  // vocal performance. It depends on a real prior reply from this same peer.
  const secondCandidate=has('secondAnswer')&&present?
    pitchedInspiration.find(h=>replyMemory?.canContinueReply('Murmur',h,bar)):null;
  const secondAnswer=!!secondCandidate&&Math.random()<.32;
  const response=secondAnswer?secondCandidate.from:
    present&&Math.random()<(has('callResponse')?.93:.83)
    ?pitchedInspiration.length&&Math.random()<.72?
      pitchedInspiration[0].from:rhythmicInspiration?.from||pitchedInspiration[0]?.from||null
    :pitchedInspiration.length&&Math.random()<.36?pitchedInspiration[0].from:null;
  const heardPitch=pitchedInspiration.find(h=>h.from===response);
  const root=heardPitch?.pitch&&
    (secondAnswer||has('partnerListening')||transferredMelody>.25||Math.random()<.42)
      ?nearestRoot(heardPitch.pitch):nearestRoot(singer.lastPitch);
  const pitches=[],durations=[];
  const gap=phrased?(length>2?.55:.73):.44;
  const baseLength=length===1?.37+Math.random()*.42:phrased?.31+Math.random()*.16:.25;
  const rhythmResponse=response===rhythmicInspiration?.from&&!heardPitch;
  // Rhythm books and actual kit practice can create an offbeat vocal entrance.
  const syncopated=(has('syncopation')||has('offbeatPulse')||transferredRhythm>.57)&&
    Math.random()<.11+.29*transferredRhythm;
  const firstAt=time+(present?(rhythmResponse?beatDur*.7:beatDur*.76):.13)+
    (syncopated?beatDur*.28:0);
  // A sustained vowel needs a deliberate breath and a real note-off.
  // Murmur is free to keep phrases short, including after studying the book.
  const willSustain=phrased&&Math.random()<((present?.58:.46)+
    (has('breathPhrasing')&&transferredMelody>.5?.055:0));
  const holdLength=willSustain?(.95+Math.random()*1.55):0;
  for(let i=0;i<length;i++){
    const pitch=clamp(root*semitone(steps[i]||0),155,660);
    pitches.push(pitch);
    const at=firstAt+i*gap;
    const duration=willSustain&&i===length-1?holdLength:
      i===length-1&&phrased?baseLength*1.38:baseLength;
    durations.push(duration);
    const strength=(.115+Math.random()*.064)*
      (phrased?(i===0?.77:i===length-1?.86:1):1)*
      (has('ghostNotes')&&i===0&&Math.random()<.38?.69:1);
    const expression={
      vowel:vowel,
      glide:shaped?(Math.random()-.5)*1.45:0,
      attack:willSustain&&i===length-1?.17:phrased?.12:.075,
      release:willSustain&&i===length-1?.3:phrased?.16:.08
    };
    if(typeof audio.voice==='function')audio.voice(pitch,at,strength,duration,expression);
    space.sound('Murmur','voice',bar,strength*4,pitch,at);
    if(onNote)onNote({agent:'Murmur',time:at,beat:0});
  }
  singer.lastPitch=pitches[pitches.length-1];
  singer.lastAttemptBar=bar;
  singer.notes+=pitches.length;
  if(!singer.firstSound)singer.firstSound={bar,heard:response||'the grove',pitch:pitches[0],attempt:singer.attempts};
  if(journal)journal.sound({
    bar,pitches,durations,vowel,
    kind:recalled?'motif':useContour?'motif':length>1?'phrase':'hum',
    response,repeated,ensemble:present
  });
  // Durable use means notes really reached the scheduled sound bus.
  if(recalled&&pitches.length===recalled.offsets.length)
    pitchRecall.record('Murmur',{bar,kind:'voice',key:recalled.key});
  if(response&&pitches.length)replyMemory?.noteMusicalReply(
    'Murmur',response,bar,'voice',secondAnswer);
  return {sang:true,ensemble:present,response,pitches,durations,bar};
}
