/*
 * GrooveGrove world pass 005.
 * Spatial state is independent of the canvas. The server owns every decision.
 * Movement exists for musical reasons; silence and opting out are valid.
 */
export const WORLD_SIZE=Object.freeze({width:1500,height:1120});
export const PLACES=Object.freeze({
  clearing:Object.freeze({x:740,y:530,label:'THE CLEARING',kind:'open'}),
  library:Object.freeze({x:350,y:310,label:'THE LIBRARY',kind:'indoor'}),
  instrumentRoom:Object.freeze({x:955,y:310,label:'INSTRUMENT ROOM',kind:'indoor'}),
  studio:Object.freeze({x:1130,y:310,label:'PRACTICE STUDIO',kind:'indoor'}),
  recording:Object.freeze({x:1310,y:310,label:'RECORDING ROOM',kind:'indoor'}),
  pond:Object.freeze({x:1130,y:850,label:'THE POND',kind:'open'})
});
const NAMES=['Pip','Riff','Murmur'];
const LINKS={clearing:['library','instrumentRoom','pond'],library:['clearing'],
  instrumentRoom:['clearing','studio'],studio:['instrumentRoom','recording','pond'],
  recording:['studio'],pond:['clearing','studio']};
// These are landmarks along the actual painted footpaths, not teleport points.
const WAYPOINTS={
  'trail-clearing-library':{x:505,y:500},
  'trail-clearing-studio':{x:1005,y:485}, // historical in-flight routes
  'trail-clearing-instrumentRoom':{x:920,y:470},
  'trail-instrumentRoom-studio':{x:1042,y:306},
  'trail-recording-studio':{x:1220,y:306},
  'trail-clearing-pond':{x:940,y:750},
  'trail-pond-studio':{x:1290,y:580}
};
const between=(a,b)=>'trail-'+[a,b].sort().join('-');
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const valid=n=>Number.isFinite(n);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const initial={
  Pip:{x:681,y:538,place:'clearing'},
  Riff:{x:798,y:530,place:'clearing'},
  Murmur:{x:754,y:659,place:'clearing'}
};
const SPEED={Pip:63,Riff:57,Murmur:46};
const PLACE_OFFSETS={
 Pip:{clearing:[-67,11],instrumentRoom:[-31,17],studio:[-67,23],recording:[-27,12],library:[-54,20],pond:[-55,24]},
 Riff:{clearing:[68,9],instrumentRoom:[27,19],studio:[63,17],recording:[24,20],library:[54,20],pond:[50,12]},
 Murmur:{clearing:[4,65],instrumentRoom:[1,44],studio:[3,70],recording:[1,47],library:[0,76],pond:[3,64]}
};
const arrival=(name,node)=>{
 const center=PLACES[node]||WAYPOINTS[node];
 const [dx,dy]=PLACE_OFFSETS[name]?.[node]||[0,0];
 return center?{x:center.x+dx,y:center.y+dy}:null;
};
const RANGES={kick:650,snare:530,hat:310,guitar:470,voice:255,violin:425};
const safePlace=p=>Object.hasOwn(PLACES,p)?p:'clearing';
const road=(from,to)=>{
  if(from===to)return [];
  // Four-way graph; search is tiny and stable even after a server restart.
  const q=[[from]],seen=new Set([from]);
  while(q.length){
    const path=q.shift(),node=path[path.length-1];
    for(const next of LINKS[node]||[]){
      if(seen.has(next))continue;
      const route=[...path,next];
      if(next===to){
        const full=[];
        for(let i=0;i<route.length-1;i++){
          const waypoint=between(route[i],route[i+1]);
          if(WAYPOINTS[waypoint])full.push(waypoint);
          full.push(route[i+1]);
        }
        return full;
      }
      q.push(route);seen.add(next);
    }
  }
  return ['clearing',to].filter(x=>x!==from);
};
export class GroveWorld {
  constructor(saved=null){
    this.people={};
    this.heard={Pip:0,Riff:0,Murmur:0};
    this.recent=[];
    for(const name of NAMES){
      const old=saved?.people?.[name]||{};
      const home=initial[name];
      this.people[name]={
        x:clamp(valid(old.x)?old.x:home.x,25,WORLD_SIZE.width-25),
        y:clamp(valid(old.y)?old.y:home.y,25,WORLD_SIZE.height-25),
        place:safePlace(old.place||home.place),
        destination:safePlace(old.destination||home.place),
        route:Array.isArray(old.route)?old.route.filter(x=>Object.hasOwn(PLACES,x)||Object.hasOwn(WAYPOINTS,x)).slice(0,9):[],
        purpose:typeof old.purpose==='string'?old.purpose.slice(0,85):'listening to the grove',
        lastChoice:valid(old.lastChoice)?old.lastChoice:-20,
        heard:Math.max(0,Math.floor(old.heard||0)),
        lastHeard:old.lastHeard&&NAMES.includes(old.lastHeard.from)?old.lastHeard:null,
        lastHeardDrum:NAMES.includes(old.lastHeardDrum?.from)?old.lastHeardDrum:null,
        lastHeardVoice:NAMES.includes(old.lastHeardVoice?.from)?old.lastHeardVoice:null,
        lastHeardGuitar:NAMES.includes(old.lastHeardGuitar?.from)?old.lastHeardGuitar:null,
        lastHeardViolin:NAMES.includes(old.lastHeardViolin?.from)?old.lastHeardViolin:null,
        ensembleIntent:name==='Murmur'&&['solo','listening','joining'].includes(old.ensembleIntent)?old.ensembleIntent:'solo',
        lastEnsembleChoice:valid(old.lastEnsembleChoice)?old.lastEnsembleChoice:-99,

        soundBar:valid(old.soundBar)?old.soundBar:-1,
        voluntaryRests:Math.max(0,Math.floor(old.voluntaryRests||0))
      };
    }
  }
  snapshot(){
    return {version:1,people:Object.fromEntries(NAMES.map(n=>[n,{
      ...this.people[n],route:[...this.people[n].route],
      lastHeard:this.people[n].lastHeard?{...this.people[n].lastHeard}:null
    }]))};
  }
  at(name,place,threshold=87){
    const p=this.people[name],dest=PLACES[place];
    return !!p && !!dest && distance(p,dest)<=threshold;
  }
  distance(a,b){return distance(this.people[a],this.people[b]);}
  traveling(name){const p=this.people[name];return !!p && p.route.length>0;}
  destination(name){return this.people[name]?.destination;}
  chooseDestination(name,place,purpose,bar){
    const p=this.people[name];
    if(!p||!PLACES[place])return false;
    if(p.destination===place && (p.route.length||this.at(name,place)))return false;
    p.destination=place;p.purpose=purpose.slice(0,85);p.lastChoice=bar;
    const here=this.at(name,p.place,110)?p.place:'clearing';
    p.route=road(here,place);
    if(!p.route.length && !this.at(name,place,52))p.route=[place];
    return true;
  }
  advance(grove,beatSeconds=60/98){
    for(const name of NAMES){
      const p=this.people[name];
      // Borrowed books are real: readers must reach the library to study.
      if(grove.library?.busy(name)){
        if(p.destination!=='library')this.chooseDestination(name,'library','reading a borrowed book',grove.bar);
      }
      const next=p.route[0];if(!next)continue;
      const to=arrival(name,next);
      if(!to){p.route.shift();continue;}
      const dx=to.x-p.x,dy=to.y-p.y,d=Math.hypot(dx,dy);
      const step=SPEED[name]*beatSeconds;
      if(d<=step+0.001){
        p.x=to.x;p.y=to.y;if(PLACES[next])p.place=next;p.route.shift();
      }else{
        p.x+=dx/d*step;p.y+=dy/d*step;
      }
    }
  }
  canHear(listener,source,kind='guitar'){
    if(listener===source)return 1;
    const a=this.people[listener],b=this.people[source];
    if(!a||!b)return 0;
    // Doors and walls soften indoor performances for listeners outside.
    let range=RANGES[kind]||430;
    const rooms=['library','instrumentRoom','studio','recording'];
    const inside=name=>rooms.some(room=>this.at(name,room,room==='library'?125:86));
    const aInside=inside(listener),bInside=inside(source);
    if(aInside!==bInside)range*=.48;
    else if(aInside&&bInside && a.destination!==b.destination)range*=.3;
    const d=distance(a,b);
    return clamp((range-d)/range,0,1);
  }
  sound(source,kind,bar,velocity=1,pitch=null,at=null){
    const p=this.people[source];if(!p)return;
    p.soundBar=bar;
    // Independent passive ear receives only genuinely scheduled pitched notes.
    // Drums, room playback and speech captions are not pitched note evidence.
    if(typeof this.onPitchedNote==='function'&&Number.isFinite(pitch)&&
       ['guitar','voice','violin'].includes(kind)){
      this.onPitchedNote({listener:source,source,kind,bar,at,pitch});
    }
    for(const name of NAMES){
      if(name===source)continue;
      const intensity=this.canHear(name,source,kind)*velocity;
      if(intensity<.05)continue;
      if(typeof this.onPitchedNote==='function'&&Number.isFinite(pitch)&&
         ['guitar','voice','violin'].includes(kind))
        this.onPitchedNote({listener:name,source,kind,bar,at,pitch});
      const listener=this.people[name];
      listener.heard++;
      listener.lastHeard={from:source,kind,bar,strength:Math.round(intensity*100)/100,
        pitch:Number.isFinite(pitch)?pitch:null};
      if(kind==='guitar')listener.lastHeardGuitar={...listener.lastHeard};
      if(kind==='violin')listener.lastHeardViolin={...listener.lastHeard};
      if(kind==='kick'||kind==='snare')listener.lastHeardDrum={...listener.lastHeard};
      if(kind==='voice')listener.lastHeardVoice={...listener.lastHeard};
      this.heard[name]++;
      if(this.recent.length>19)this.recent.shift();
      this.recent.push({listener:name,from:source,kind,bar});
    }
  }
  decide(grove){
    const bar=grove.bar;
    for(const name of NAMES){
      const p=this.people[name],curious=name==='Pip'?grove.pip?.curiosity:name==='Riff'?grove.riff?.curiosity:grove.vocalist?.curiosity;
      if(grove.library?.busy(name)||grove.disciplines?.people?.[name]?.interest)continue;
      if(this.traveling(name) || bar-p.lastChoice<9)continue;
      // A room with a real tape can be explored voluntarily. Playback is
      // audible but never credits musical practice or awards skill.
      if(p.destination==='recording'&&this.at(name,'recording',98)&&
         grove.archive?.recordings.length&&!grove.archive.deck&&
         Math.random()<.22*(curious??.6)){
        const tape=grove.archive.startListening(name,bar);
        if(tape){
          p.lastChoice=bar;
          p.purpose='listening back to '+tape.id;
          grove.push(name+' chooses to listen back to a recorded jam.');
          grove.onTalk?.(name,'♪ Listening to a real past jam');
          continue;
        }
      }
      // Music becomes an invitation, never an obligation.
      if(name==='Murmur'&&grove.vocalist?.stage==='humming'&&
         grove.disciplines?.current('Murmur')==='voice'){
        const fresh=[p.lastHeardGuitar,p.lastHeardDrum,p.lastHeardViolin]
          .filter(h=>h&&bar-h.bar<=4&&h.strength>.045);
        const source=fresh.sort((a,b)=>b.bar-a.bar)[0];
        const performer=source&&this.people[source.from];
        const available=performer&&!this.traveling(source.from)&&
          !grove.library?.busy(source.from)&&performer.destination!=='pond';
        const invitation=available&&this.canHear('Murmur',source.from,source.kind)>.08;
        if(invitation&&p.ensembleIntent!=='joining'&&Math.random()<.38+.3*(curious??.5)){
          p.ensembleIntent='joining';p.lastEnsembleChoice=bar;
          const location=performer.place,reason='trying a musical phrase with '+source.from;
          if(p.destination!==location||!this.at(name,location,110))
            this.chooseDestination(name,location,reason,bar);
          else {p.purpose=reason;p.lastChoice=bar;}
          grove.push('Murmur chooses to join '+source.from+' and listen for an opening.');
          // A nonverbal intention caption, grounded in a real voluntary choice.
          grove.onTalk?.('Murmur','♪ Going to join '+source.from+' and listen');
          continue;
        }
        if(p.ensembleIntent==='joining'){
          const silentFor=bar-Math.max(p.lastHeardGuitar?.bar??-99,p.lastHeardDrum?.bar??-99,p.lastHeardViolin?.bar??-99);
          const wantsBreak=(bar-p.lastEnsembleChoice>=12&&Math.random()<.16)||
            (silentFor>10&&bar-p.lastEnsembleChoice>=7);
          if(wantsBreak){
            p.ensembleIntent='listening';p.lastEnsembleChoice=bar;p.lastChoice=bar;
            p.purpose='taking time to listen before singing again';
            grove.push('Murmur chooses a listening break from the music.');
            grove.onTalk?.('Murmur','♪ Taking time to listen');
            continue;
          }
          if(silentFor<=10)continue;
        }
      }
      // A destination is a personal choice, not a mandatory timetable.
      if(Math.random()>.23*(curious??.5))continue;
      const recentlyHeard=p.lastHeard && bar-p.lastHeard.bar<8?p.lastHeard:null;
      let where=p.destination,why=p.purpose;
      if(recentlyHeard && Math.random()<.48){
        const performer=this.people[recentlyHeard.from];
        if(performer && performer.destination!==p.destination){
          where=performer.destination;
          why='curious about '+recentlyHeard.from+'\'s '+recentlyHeard.kind;
        }
      }else if(name==='Murmur'){
        const roll=Math.random();
        if(roll<.11&&grove.archive?.recordings.length){
          where='recording';why='curious to hear a recorded jam';
        }else if(roll<.24){where='instrumentRoom';why='curious about the instruments';}
        else if(roll<.41){where='studio';why='curious about the practice studio';}
        else if(roll<.70){where='pond';why='listening to quiet and testing melodies';}
        else {where='clearing';why='listening for other musicians';}
      }else if(name==='Pip'){
        const roll=Math.random();
        if(roll<.11&&grove.archive?.recordings.length){where='recording';why='curious about old rhythms';}
        else if(roll<.25){where='instrumentRoom';why='curious about other instruments';}
        else if(roll<.48){where='studio';why='experimenting with rhythm';}
        else if(roll<.73){where='library';why='curious about musical ideas';}
        else {where='clearing';why='listening for a possible jam';}
      }else{
        const roll=Math.random();
        if(roll<.12&&grove.archive?.recordings.length){where='recording';why='curious to hear an earlier performance';}
        else if(roll<.28){where='instrumentRoom';why='curious about the instruments on the rack';}
        else if(roll<.51){where='studio';why='exploring harmonies';}
        else if(roll<.75){where='library';why='studying chord language';}
        else {where='clearing';why='listening for a possible jam';}
      }
      if(name==='Murmur'&&p.ensembleIntent==='joining'&&where!==p.destination)
        p.ensembleIntent='solo';
      if(where===p.destination){
        p.lastChoice=bar;p.voluntaryRests++;
      }else if(this.chooseDestination(name,where,why,bar)){
        grove.push(name+' heads toward '+PLACES[where].label.toLowerCase()+', '+why+'.');
        if(name==='Murmur')
          grove.onTalk?.('Murmur','♪ '+why);
      }
    }
  }
}
