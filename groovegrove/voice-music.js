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
                                audio,journal,onNote}){
  if(singer.stage!=='humming'||library.busy('Murmur')||
     bar-singer.lastAttemptBar<2){
    singer.rests++;return false;
  }
  // A sound heard through real proximity may inspire a response, but
  // listening or wandering in silence remains equally legitimate.
  const guitar=space.people.Murmur.lastHeardGuitar;
  const riffNearby=guitar&&bar-guitar.bar<=3&&space.canHear('Murmur','Riff','guitar')>.14;
  const inspired=!!riffNearby;
  const desire=clamp(.17*singer.curiosity+(inspired?.05:0),0,.32);
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
  const response=riffNearby && Math.random()<.62?'Riff':null;
  const root=response?nearestRoot(guitar.pitch):nearestRoot(singer.lastPitch);
  const pitches=[];
  const gap=phrased?(length>2?.55:.73):.44;
  const baseLength=length===1?.37+Math.random()*.42:phrased?.31+Math.random()*.16:.25;
  const firstAt=time+.13;
  for(let i=0;i<length;i++){
    const pitch=clamp(root*semitone(steps[i]||0),155,660);
    pitches.push(pitch);
    const at=firstAt+i*gap;
    const duration=i===length-1&&phrased?baseLength*1.38:baseLength;
    const strength=(.115+Math.random()*.064)*(phrased?(i===0?.77:i===length-1?.86:1):1);
    const expression={
      vowel:vowel,
      glide:shaped?(Math.random()-.5)*1.45:0,
      attack:phrased?.12:.075,
      release:phrased?.16:.08
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
    bar,pitches,vowel,
    kind:useContour?'motif':length>1?'phrase':'hum',
    response,repeated
  });
  return true;
}
