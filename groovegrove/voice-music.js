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
                                audio,journal,onNote,playing=null}){
  if(singer.stage!=='humming'||library.busy('Murmur')||
     bar-singer.lastAttemptBar<2){
    singer.rests++;return false;
  }
  // A sound heard through real proximity may inspire a response, but
  // listening or wandering in silence remains equally legitimate.
  const musician=space.people.Murmur;
  const guitar=musician.lastHeardGuitar;
  const drums=musician.lastHeardDrum;
  const riffNearby=!!(guitar&&bar-guitar.bar<=3&&
    space.canHear('Murmur',guitar.from,'guitar')>.12);
  const pipNearby=!!(drums&&bar-drums.bar<=3&&
    space.canHear('Murmur',drums.from,drums.kind)>.1);
  const present=musician.ensembleIntent==='joining'&&!space.traveling('Murmur')&&
    ((riffNearby&&(playing?.[guitar.from]??true))||(pipNearby&&(playing?.[drums.from]??true)));
  // An invitation changes willingness, never guarantees a performance.
  // Away from the group, Murmur still enjoys solitary experimentation.
  const bookIdeas=['vowelShapes','breathPhrasing','melodicContours']
    .reduce((sum,skill)=>sum+(library.has('Murmur',skill)?1:0),0);
  const desire=clamp(.19*singer.curiosity+.012*bookIdeas+
    (present?.28:riffNearby||pipNearby?.045:0),0,.62);
  if(Math.random()>=desire){singer.rests++;return false;}
  const shaped=library.has('Murmur','vowelShapes');
  const phrased=library.has('Murmur','breathPhrasing');
  const melodic=library.has('Murmur','melodicContours');
  const vowel=shaped&&Math.random()<.76?readable(select(VOICES)):'m';
  const useContour=melodic&&Math.random()<.68;
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
  // An answer requires a note Murmur really heard. Drums inspire rhythm;
  // guitar notes supply harmonic pitch reference.
  const response=present&&Math.random()<.83
    ?riffNearby&&pipNearby?(Math.random()<.68?guitar.from:drums.from):riffNearby?guitar.from:pipNearby?drums.from:null
    :riffNearby&&Math.random()<.36?guitar.from:null;
  const root=response===guitar?.from&&Number.isFinite(guitar?.pitch)?nearestRoot(guitar.pitch):nearestRoot(singer.lastPitch);
  const pitches=[],durations=[];
  const gap=phrased?(length>2?.55:.73):.44;
  const baseLength=length===1?.37+Math.random()*.42:phrased?.31+Math.random()*.16:.25;
  const firstAt=time+(present?(response==='Pip'?beatDur*.7:beatDur*.76):.13);
  // A sustained vowel needs a deliberate breath and a real note-off.
  // Murmur is free to keep phrases short, including after studying the book.
  const willSustain=phrased&&Math.random()<(present?.58:.46);
  const holdLength=willSustain?(.95+Math.random()*1.55):0;
  for(let i=0;i<length;i++){
    const pitch=clamp(root*semitone(steps[i]||0),155,660);
    pitches.push(pitch);
    const at=firstAt+i*gap;
    const duration=willSustain&&i===length-1?holdLength:
      i===length-1&&phrased?baseLength*1.38:baseLength;
    durations.push(duration);
    const strength=(.115+Math.random()*.064)*(phrased?(i===0?.77:i===length-1?.86:1):1);
    const expression={
      vowel:vowel,
      glide:shaped?(Math.random()-.5)*1.45:0,
      attack:willSustain&&i===length-1?.17:phrased?.12:.075,
      release:willSustain&&i===length-1?.3:phrased?.16:.08
    };
    if(typeof audio.voice==='function')audio.voice(pitch,at,strength,duration,expression);
    space.sound('Murmur','voice',bar,strength*4,pitch);
    if(onNote)onNote({agent:'Murmur',time:at,beat:0});
  }
  singer.lastPitch=pitches[pitches.length-1];
  singer.lastAttemptBar=bar;
  singer.notes+=pitches.length;
  if(!singer.firstSound)singer.firstSound={bar,heard:response||'the grove',pitch:pitches[0],attempt:singer.attempts};
  if(journal)journal.sound({
    bar,pitches,durations,vowel,
    kind:useContour?'motif':length>1?'phrase':'hum',
    response,repeated,ensemble:present
  });
  return {sang:true,ensemble:present,response,pitches,durations,bar};
}
